// src/sim/agentEngine.ts
// Tick-by-tick simulation of residents and guide agents.
//
// Key design choices vs. earlier version:
//  • Movement uses Flow Fields (one Dijkstra per safe-point per repath window)
//    instead of per-agent A*.  Much cheaper at scale.
//  • All distance thresholds and movement speeds are in SCALED METRES.
//  • Panic no longer moves agents through buildings; it boosts speed and
//    forces an immediate repath — the road network still constrains movement.
//  • willFollowGuide is re-evaluated dynamically based on fire proximity,
//    not set once permanently.

import type { Agent, AgentStatus, Scenario, FireCell, GuideDecision } from "../app/types";
import {
  buildGraph,
  buildNodeMap,
  buildFlowField,
  pathFromFlowField,
  findNearestNode,
  findNearestSafePoint,
  scaledHaversine,
  firePenalty,
  type Graph,
  type FlowField,
} from "./pathfinding";
export { WORLD_SCALE } from "./worldScale";

/* ─────────────────────────────────────────────────────────────────────────────
   Constants  (all distances in metres unless noted)
───────────────────────────────────────────────────────────────────────────── */

/**
 * World scale multiplier.
 * The road network spans ~700 m in reality; this factor makes the simulation
 * treat it as if it were ~700 × WORLD_SCALE metres (≈ 2.8 km at scale 4).
 * All haversine results in this file are multiplied by WORLD_SCALE before
 * being compared against the _M constants below, so those constants remain
 * meaningful as "virtual metres" in the scaled world.
 */
/** Metres within which a guide can influence nearby residents. */
export const GUIDE_INFLUENCE_RADIUS_M = 150;

/** Base probability a resident decides to follow a nearby guide (0–1). */
const FOLLOW_BASE_CHANCE = 0.6;

/** Follow probability when fire is within PANIC_RADIUS_M (stress override). */
const FOLLOW_STRESS_CHANCE = 0.92;

/** Metres from fire at which residents start to panic (speed boost + refollow). */
const PANIC_RADIUS_M = 200;

/** Metres within which a resident can "see" fire and starts evacuating. */
const FIRE_VISIBLE_RADIUS_M = 700;

/** Metres from fire that kills an agent (intensity ≥ 2). */
const FIRE_KILL_RADIUS_M = 20;

/** Metres from a safe point that counts as "arrived". */
export const SAFE_ARRIVAL_RADIUS_M = 60;

/** Ticks between flow-field recomputes. */
const REPATH_INTERVAL = 8;

/** Max trail history entries per agent. */
const MAX_PATH_HISTORY = 200;

/** Scaled metres per tick for a resident moving at a brisk real-world pace. */
export const DEFAULT_RESIDENT_SPEED = 1.8;

/** Guides move slightly faster than residents. */
export const DEFAULT_GUIDE_SPEED = 2.3;

/** Speed multiplier applied during panic. */
const PANIC_SPEED_MULTIPLIER = 1.6;

/** How many ticks a panic-speed boost lasts after fire is no longer close. */
const PANIC_DURATION_TICKS = 10;

/* ─────────────────────────────────────────────────────────────────────────────
   Module-level caches  (survive across ticks, reset on new simulation)
───────────────────────────────────────────────────────────────────────────── */

let cachedGraph: Graph | null = null;
let cachedNodeMap: Map<string, import("../app/types").Node> | null = null;
let cachedScenarioRef: Scenario | null = null;

// Flow field cache: safePointId → { field, computedAtRoundedTick }
const flowFieldCache = new Map<string, { field: FlowField; tick: number }>();

/** Call when starting a new simulation to flush all cached state. */
export function resetEngineCache(): void {
  cachedGraph = null;
  cachedNodeMap = null;
  cachedScenarioRef = null;
  flowFieldCache.clear();
}

/** Haversine distance in scaled simulation metres. */
function scaledDist(lng1: number, lat1: number, lng2: number, lat2: number): number {
  return scaledHaversine(lng1, lat1, lng2, lat2);
}

function getGraph(scenario: Scenario): Graph {
  if (scenario !== cachedScenarioRef) {
    cachedGraph = buildGraph(scenario);
    cachedNodeMap = buildNodeMap(scenario.nodes);
    cachedScenarioRef = scenario;
    flowFieldCache.clear();
  }
  return cachedGraph!;
}

function getNodeMap(scenario: Scenario): Map<string, import("../app/types").Node> {
  getGraph(scenario); // ensures nodeMap is built
  return cachedNodeMap!;
}

function getFlowField(
  safePointId: string,
  scenario: Scenario,
  fireCells: FireCell[],
  blockedEdges: Set<string>,
  tick: number,
): FlowField {
  const roundedTick = Math.floor(tick / REPATH_INTERVAL) * REPATH_INTERVAL;
  const cached = flowFieldCache.get(safePointId);
  if (cached && cached.tick === roundedTick) return cached.field;

  const sp = scenario.safePoints.find((s) => s.id === safePointId);
  if (!sp) return new Map();

  const graph = getGraph(scenario);
  const nodeMap = getNodeMap(scenario);
  const nodes = [...nodeMap.values()];
  const goalNode = findNearestNode(sp.lng, sp.lat, nodes);
  if (!goalNode) return new Map();

  const field = buildFlowField(goalNode.id, graph, nodeMap, fireCells, blockedEdges);
  flowFieldCache.set(safePointId, { field, tick: roundedTick });
  return field;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Factory helpers
───────────────────────────────────────────────────────────────────────────── */

export function createResident(
  id: string,
  lng: number,
  lat: number,
  reactionDelay = 4,
  spawnTick = 0,
): Agent {
  return {
    id,
    lng,
    lat,
    kind: "resident",
    status: "idle",
    speed: DEFAULT_RESIDENT_SPEED,
    path: [],
    pathIndex: 0,
    pathHistory: [],
    reactionDelay,
    ticksSinceStart: spawnTick,
    spawnTick,
  };
}

export function createGuide(id: string, lng: number, lat: number): Agent {
  return {
    id,
    lng,
    lat,
    kind: "guide",
    status: "moving",
    speed: DEFAULT_GUIDE_SPEED,
    path: [],
    pathIndex: 0,
    pathHistory: [],
    reactionDelay: 0,
    ticksSinceStart: 0,
    spawnTick: 0,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main engine entry point
───────────────────────────────────────────────────────────────────────────── */

/**
 * Advance simulation by one tick.
 *
 * @param agents         All agents (mutated copies are returned)
 * @param scenario       Road network + safe points (treat as immutable)
 * @param fireCells      Current fire state
 * @param tick           Global tick counter
 * @param guideDecisions Latest AI decisions (one per guide, refreshed every N ticks)
 * @param blockedEdges   Edge IDs that are impassable (road blocks etc.)
 */
export function stepAgents(
  agents: Agent[],
  scenario: Scenario,
  fireCells: FireCell[],
  tick: number,
  guideDecisions: GuideDecision[] = [],
  blockedEdges: Set<string> = new Set(),
): Agent[] {
  const nodeMap = getNodeMap(scenario);
  const nodes = [...nodeMap.values()];
  const guideDecisionMap = new Map(guideDecisions.map((d) => [d.guideId, d]));

  const liveGuides = agents.filter(
    (a) => a.kind === "guide" && a.status !== "dead",
  );

  return agents.map((agent) => {
    // Shallow-copy so we never mutate the input array's objects directly
    const a: Agent = {
      ...agent,
      pathHistory: agent.pathHistory ? [...agent.pathHistory] : [],
      path: agent.path ? [...agent.path] : [],
    };

    a.ticksSinceStart = tick;

    // Normalise fields that may be missing on "dumb" agents placed via UI
    if (a.speed === undefined) {
      a.speed = a.kind === "guide" ? DEFAULT_GUIDE_SPEED : DEFAULT_RESIDENT_SPEED;
    }
    if (a.path === undefined) a.path = [];
    if (a.pathIndex === undefined) a.pathIndex = 0;
    if (a.pathHistory === undefined) a.pathHistory = [];
    if (a.reactionDelay === undefined) a.reactionDelay = 4;
    if (a.spawnTick === undefined) a.spawnTick = Math.max(0, tick - 1);

    // Snap to nearest road node if not yet on the network
    if (!a.currentNodeId) {
      const nearest = findNearestNode(a.lng, a.lat, nodes);
      if (nearest) a.currentNodeId = nearest.id;
    }

    // ── Terminal states ────────────────────────────────────────────────────
    if (a.status === "safe" || a.status === "dead") return a;

    // ── Trail ─────────────────────────────────────────────────────────────
    a.pathHistory.push([a.lng, a.lat]);
    if (a.pathHistory.length > MAX_PATH_HISTORY) {
      a.pathHistory.splice(0, a.pathHistory.length - MAX_PATH_HISTORY);
    }

    // ── Fire-kill check ───────────────────────────────────────────────────
    for (const cell of fireCells) {
      if (
        cell.intensity >= 2 &&
        scaledDist(a.lng, a.lat, cell.position[0], cell.position[1]) < FIRE_KILL_RADIUS_M
      ) {
        a.status = "dead";
        return a;
      }
    }

    // ── Safe-point arrival check ──────────────────────────────────────────
    for (const sp of scenario.safePoints) {
      if (scaledDist(a.lng, a.lat, sp.lng, sp.lat) < SAFE_ARRIVAL_RADIUS_M) {
        a.status = "safe";
        return a;
      }
    }

    // ── Panic detection (residents only) ─────────────────────────────────
    if (a.kind !== "guide") {
      let nearFire = false;
      for (const cell of fireCells) {
        if (
          cell.intensity >= 1 &&
          scaledDist(a.lng, a.lat, cell.position[0], cell.position[1]) < PANIC_RADIUS_M
        ) {
          nearFire = true;
          break;
        }
      }
      if (nearFire) {
        a.panickedAt = tick;
        // Drop current guide assignment — stress makes people act independently
        a.followingGuideId = undefined;
      }
    }

    const isPanicking =
      a.kind !== "guide" &&
      a.panickedAt !== undefined &&
      tick - a.panickedAt < PANIC_DURATION_TICKS;

    const effectiveSpeed = isPanicking
      ? (a.speed ?? DEFAULT_RESIDENT_SPEED) * PANIC_SPEED_MULTIPLIER
      : (a.speed ?? DEFAULT_RESIDENT_SPEED);

    // ── Delegate to role-specific update ─────────────────────────────────
    if (a.kind === "guide") {
      return updateGuide(a, scenario, fireCells, guideDecisionMap, blockedEdges, tick);
    }

    return updateResident(
      a,
      scenario,
      fireCells,
      guideDecisionMap,
      liveGuides,
      blockedEdges,
      tick,
      effectiveSpeed,
      isPanicking,
    );
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   Guide update
───────────────────────────────────────────────────────────────────────────── */

function updateGuide(
  guide: Agent,
  scenario: Scenario,
  fireCells: FireCell[],
  guideDecisionMap: Map<string, GuideDecision>,
  blockedEdges: Set<string>,
  tick: number,
): Agent {
  const decision = guideDecisionMap.get(guide.id);
  const targetSpId =
    decision?.targetSafePointId ??
    getFallbackSafePointId(guide, scenario);

  if (!targetSpId) return guide;

  guide.targetSafePointId = targetSpId;

  const field = getFlowField(targetSpId, scenario, fireCells, blockedEdges, tick);
  moveViaFlowField(guide, field, getNodeMap(scenario), guide.speed ?? DEFAULT_GUIDE_SPEED);

  return guide;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Resident update
───────────────────────────────────────────────────────────────────────────── */

function updateResident(
  resident: Agent,
  scenario: Scenario,
  fireCells: FireCell[],
  guideDecisionMap: Map<string, GuideDecision>,
  liveGuides: Agent[],
  blockedEdges: Set<string>,
  tick: number,
  effectiveSpeed: number,
  isPanicking: boolean,
): Agent {
  // ── Reaction delay ────────────────────────────────────────────────────────
  if (resident.status === "idle" || resident.status === undefined) {
    const spawnTick = resident.spawnTick ?? 0;
    // Only react if fire is nearby OR a guide is within influence range
    const fireNearby = isFireWithinRadius(resident, fireCells, FIRE_VISIBLE_RADIUS_M);
    const guideNearby = findNearbyGuide(resident, liveGuides) !== null;
    const hasStimulus = fireNearby || guideNearby || isPanicking;
    if (!hasStimulus) return resident;
    if (tick - spawnTick < (resident.reactionDelay ?? 4)) return resident;
    resident.status = "moving";
  }

  // ── Guide-following logic ─────────────────────────────────────────────────
  // Re-evaluate proximity to guides every tick (unless already locked in)
  const nearbyGuide = findNearbyGuide(resident, liveGuides);

  if (!isPanicking && nearbyGuide) {
    const fireClose = isFireWithinRadius(resident, fireCells, PANIC_RADIUS_M);
    const followChance = fireClose ? FOLLOW_STRESS_CHANCE : FOLLOW_BASE_CHANCE;

    if (!resident.followingGuideId) {
      // First contact with this guide: roll follow dice
      if (Math.random() < followChance) {
        resident.followingGuideId = nearbyGuide.id;
      }
    } else {
      // Re-evaluate only if the guide changed or stress level spiked
      if (
        resident.followingGuideId !== nearbyGuide.id &&
        Math.random() < followChance
      ) {
        resident.followingGuideId = nearbyGuide.id;
      }
    }
  } else if (!nearbyGuide || isPanicking) {
    // Guide out of range or resident is panicking → act independently
    resident.followingGuideId = undefined;
  }

  // ── Determine target safe point ───────────────────────────────────────────
  let targetSpId = resident.targetSafePointId;

  if (resident.followingGuideId) {
    const decision = guideDecisionMap.get(resident.followingGuideId);
    if (decision) targetSpId = decision.targetSafePointId;
  }

  if (!targetSpId) {
    targetSpId = getFallbackSafePointId(resident, scenario) ?? undefined;
  }

  if (!targetSpId) return resident; // no reachable safe point known yet

  resident.targetSafePointId = targetSpId;

  const field = getFlowField(
    targetSpId,
    scenario,
    fireCells,
    blockedEdges,
    tick,
  );
  moveViaFlowField(resident, field, getNodeMap(scenario), effectiveSpeed);

  return resident;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Movement helpers
───────────────────────────────────────────────────────────────────────────── */

/**
 * Move agent one step along the flow field toward the goal.
 * Also updates the short lookahead path[] for visualisation.
 */
function moveViaFlowField(
  agent: Agent,
  field: FlowField,
  nodeMap: Map<string, import("../app/types").Node>,
  speed: number,
): void {
  const curNodeId = agent.currentNodeId;
  if (!curNodeId) return;

  const nextNodeId = field.get(curNodeId);
  if (!nextNodeId) return; // this node has no route (isolated or goal itself)

  const nextNode = nodeMap.get(nextNodeId);
  if (!nextNode) return;

  const distM = scaledDist(agent.lng, agent.lat, nextNode.lng, nextNode.lat);
  if (distM <= 0) {
    agent.lng = nextNode.lng;
    agent.lat = nextNode.lat;
    agent.currentNodeId = nextNodeId;
    agent.path = pathFromFlowField(agent.currentNodeId, field, 5);
    agent.pathIndex = 0;
    return;
  }

  if (distM <= speed) {
    // Snap to node and advance current node pointer
    agent.lng = nextNode.lng;
    agent.lat = nextNode.lat;
    agent.currentNodeId = nextNodeId;
  } else {
    const ratio = speed / distM;
    agent.lng += (nextNode.lng - agent.lng) * ratio;
    agent.lat += (nextNode.lat - agent.lat) * ratio;
  }

  // Refresh short lookahead path for visualisation (5-step preview)
  agent.path = pathFromFlowField(agent.currentNodeId!, field, 5);
  agent.pathIndex = 0;
}

/** Find the nearest guide within GUIDE_INFLUENCE_RADIUS_M. */
function findNearbyGuide(resident: Agent, guides: Agent[]): Agent | null {
  let best: Agent | null = null;
  let bestD = Infinity;
  for (const g of guides) {
    if (g.status === "dead") continue;
    const d = scaledDist(resident.lng, resident.lat, g.lng, g.lat);
    if (d < GUIDE_INFLUENCE_RADIUS_M && d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return best;
}

/** True if any fire cell of sufficient intensity is within radiusM. */
function isFireWithinRadius(
  agent: Agent,
  fireCells: FireCell[],
  radiusM: number,
): boolean {
  for (const cell of fireCells) {
    if (
      cell.intensity >= 1 &&
      scaledDist(agent.lng, agent.lat, cell.position[0], cell.position[1]) < radiusM
    ) return true;
  }
  return false;
}

/**
 * Fallback: find the nearest safe point by road-network distance from the
 * agent's current node.  Returns null if agent is not yet on the network.
 */
function getFallbackSafePointId(
  agent: Agent,
  scenario: Scenario,
): string | null {
  if (!agent.currentNodeId) return null;
  const nodeMap = getNodeMap(scenario);
  const sp = findNearestSafePoint(
    agent.currentNodeId,
    scenario.safePoints,
    nodeMap,
  );
  return sp?.id ?? null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Statistics helper  (useful for UI panels and AI context)
───────────────────────────────────────────────────────────────────────────── */

export type SimStats = {
  total: number;
  idle: number;
  moving: number;
  safe: number;
  dead: number;
  evacuationRate: number; // safe / (total - dead)
};

export function computeStats(agents: Agent[]): SimStats {
  const residents = agents.filter((a) => a.kind === "resident");
  const byStatus = (s: AgentStatus) => residents.filter((a) => a.status === s).length;
  const safe = byStatus("safe");
  const dead = byStatus("dead");
  const moving = byStatus("moving");
  const idle = residents.filter((a) => !a.status || a.status === "idle").length;
  const total = residents.length;
  const evacuated = total - dead;
  return {
    total,
    idle,
    moving,
    safe,
    dead,
    evacuationRate: evacuated > 0 ? safe / evacuated : 0,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Fire-spread direction helper  (used by guideAgent to build better context)
───────────────────────────────────────────────────────────────────────────── */

/**
 * Returns the compass bearing (0–360°, 0=N) from (fromLng, fromLat) toward
 * the intensity-weighted centroid of all fire cells.
 * Returns null if there are no fire cells.
 */
export function fireSpreadBearing(
  fromLng: number,
  fromLat: number,
  fireCells: FireCell[],
): number | null {
  if (fireCells.length === 0) return null;

  let wLng = 0, wLat = 0, totalW = 0;
  for (const cell of fireCells) {
    const w = Math.max(cell.intensity, 0.01);
    wLng += cell.position[0] * w;
    wLat += cell.position[1] * w;
    totalW += w;
  }
  wLng /= totalW;
  wLat /= totalW;

  // Bearing: angle from north, clockwise
  const dLng = wLng - fromLng;
  const dLat = wLat - fromLat;
  const bearing = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/** Convert a bearing in degrees to an 8-point compass label. */
export function bearingToCompass(bearing: number): string {
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return labels[Math.round(bearing / 45) % 8];
}

/* ─────────────────────────────────────────────────────────────────────────────
   Re-export firePenalty for use in feasibility checks in guideAgent
───────────────────────────────────────────────────────────────────────────── */
export { firePenalty };
