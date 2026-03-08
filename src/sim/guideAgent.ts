// src/sim/guideAgent.ts
// LLM-powered guide AI via Backboard API.
//
// Improvements over earlier version:
//  • State message includes fire-spread direction and per-safe-point feasibility.
//  • Each session tracks message count; thread is recycled after MAX_THREAD_MESSAGES
//    to prevent context overflow and keep latency low.
//  • safe_point_id returned by AI is validated against known safe points;
//    falls back to nearest if invalid.
//  • All API calls are typed; error paths log clearly and fall back gracefully.

import type { Agent, Scenario, FireCell, GuideDecision } from "../app/types";
import { BACKBOARD_BASE_URL, BACKBOARD_ENABLED } from "../app/api";
import {
  buildGraph,
  buildNodeMap,
  findNearestNode,
  astar,
} from "./pathfinding";
import {
  fireSpreadBearing,
  bearingToCompass,
} from "./agentEngine";

/* ─────────────────────────────────────────────────────────────────────────────
   Session state
───────────────────────────────────────────────────────────────────────────── */

type GuideSession = {
  guideId: string;
  assistantId: string;
  threadId: string;
  messageCount: number;
};

const sessions = new Map<string, GuideSession>();
let globalAssistantId: string | null = null;

/**
 * How many messages a thread accumulates before we recycle it.
 * Keeps context short and API latency predictable.
 */
const MAX_THREAD_MESSAGES = 25;

/** Reset all sessions (call when starting a new simulation). */
export function resetGuideSessions(): void {
  sessions.clear();
  globalAssistantId = null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tool definition
───────────────────────────────────────────────────────────────────────────── */

const GUIDE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "direct_residents_to_safe_point",
      description:
        "Guide nearby residents to the specified evacuation safe point. " +
        "Choose the safest reachable point considering fire direction and road blockages.",
      parameters: {
        type: "object",
        properties: {
          safe_point_id: {
            type: "string",
            description: "ID of the target safe point, e.g. 's1', 's2', 's3'",
          },
          reason: {
            type: "string",
            description: "Brief justification for this choice",
          },
        },
        required: ["safe_point_id", "reason"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are an AI wildfire evacuation guide.

Your responsibilities:
1. Monitor fire spread direction and intensity.
2. Track residents' locations and statuses.
3. Choose the safest reachable safe point to direct residents toward.

Decision criteria (in order of priority):
- Avoid safe points whose access roads are currently blocked by fire.
- Prefer safe points in the direction AWAY from the fire centroid.
- Among viable options, prefer the one nearest to the majority of at-risk residents.

You MUST call the direct_residents_to_safe_point tool with your decision.
Return only the safe point ID and a short reason (1–2 sentences).`;

/* ─────────────────────────────────────────────────────────────────────────────
   API helpers
───────────────────────────────────────────────────────────────────────────── */

async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKBOARD_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backboard ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function ensureAssistant(): Promise<string> {
  if (globalAssistantId) return globalAssistantId;

  const result = await apiPost<{ assistant_id: string }>("/assistants", {
    name: "Wildfire Evacuation Guide",
    system_prompt: SYSTEM_PROMPT,
    tools: GUIDE_TOOLS,
  });

  globalAssistantId = result.assistant_id;
  return globalAssistantId;
}

async function createThread(assistantId: string): Promise<string> {
  const result = await apiPost<{ thread_id: string }>(
    `/assistants/${assistantId}/threads`,
    {},
  );
  return result.thread_id;
}

async function ensureSession(guideId: string): Promise<GuideSession> {
  const existing = sessions.get(guideId);
  if (existing && existing.messageCount < MAX_THREAD_MESSAGES) return existing;

  // Create (or recycle) thread
  const assistantId = await ensureAssistant();
  const threadId = await createThread(assistantId);

  const session: GuideSession = {
    guideId,
    assistantId,
    threadId,
    messageCount: 0,
  };
  sessions.set(guideId, session);
  return session;
}

/* ─────────────────────────────────────────────────────────────────────────────
   State message builder
───────────────────────────────────────────────────────────────────────────── */

/**
 * Checks whether an A* path exists from guideNode to each safe point,
 * respecting both fire danger and current road blockages.
 * Returns a map of safePointId → accessible.
 */
function checkSafePointFeasibility(
  guide: Agent,
  scenario: Scenario,
  fireCells: FireCell[],
  blockedEdges: Set<string>,
  graph: ReturnType<typeof buildGraph>,
  nodeMap: ReturnType<typeof buildNodeMap>,
): Record<string, boolean> {
  const nodes = [...nodeMap.values()];
  const guideNode = findNearestNode(guide.lng, guide.lat, nodes);
  if (!guideNode) return {};

  const result: Record<string, boolean> = {};
  for (const sp of scenario.safePoints) {
    const path = astar(
      guideNode.id,
      sp.lng,
      sp.lat,
      graph,
      nodeMap,
      fireCells,
      blockedEdges,
    );
    result[sp.id] = path.length > 0;
  }
  return result;
}

function buildStateMessage(
  guide: Agent,
  allAgents: Agent[],
  scenario: Scenario,
  fireCells: FireCell[],
  tick: number,
  blockedEdges: Set<string>,
): string {
  const residents = allAgents.filter((a) => a.kind === "resident");
  const safe = residents.filter((a) => a.status === "safe").length;
  const dead = residents.filter((a) => a.status === "dead").length;
  const moving = residents.filter(
    (a) => a.status === "moving" || !a.status || a.status === "idle",
  ).length;

  // Fire summary
  const fireDesc =
    fireCells.length === 0
      ? "No active fire."
      : `${fireCells.length} fire cells active. Max intensity: ${Math.max(...fireCells.map((f) => f.intensity)).toFixed(1)}.`;

  // Fire direction from guide's position
  const bearing = fireSpreadBearing(guide.lng, guide.lat, fireCells);
  const fireDir =
    bearing !== null
      ? `Fire centroid is ${bearingToCompass(bearing)} of your position (bearing ${bearing.toFixed(0)}°).`
      : "No fire detected.";

  // Safe point status (fire + roadblock aware)
  const _graph = buildGraph(scenario);
  const _nodeMap = buildNodeMap(scenario.nodes);
  const feasibility = checkSafePointFeasibility(guide, scenario, fireCells, blockedEdges, _graph, _nodeMap);
  const safePointLines = scenario.safePoints
    .map((sp) => {
      const accessible = feasibility[sp.id] !== false ? "✓ accessible" : "✗ BLOCKED";
      // Approximate guide→safepoint distance in metres (good enough for AI context)
      const dLng = (sp.lng - guide.lng) * Math.cos((guide.lat * Math.PI) / 180);
      const dLat = sp.lat - guide.lat;
      const distM = Math.round(Math.sqrt(dLng * dLng + dLat * dLat) * 111000);
      return `  - ${sp.id}: dist≈${distM}m  [${sp.lng.toFixed(4)}, ${sp.lat.toFixed(4)}]  ${accessible}`;
    })
    .join("\n");

  // Roadblock summary
  const roadblockLine =
    blockedEdges.size === 0
      ? "No road blockages active."
      : `${blockedEdges.size} road segment(s) blocked: ${[...blockedEdges].join(", ")}. Avoid routing through these edges.`;

  // Resident summary (cap at 12 to keep context short)
  const atRisk = residents
    .filter((a) => a.status !== "safe" && a.status !== "dead")
    .slice(0, 12)
    .map(
      (r) =>
        `  - ${r.id}: [${r.lng.toFixed(4)}, ${r.lat.toFixed(4)}]  status=${r.status ?? "idle"}`,
    )
    .join("\n");

  return `
=== Tick ${tick} — Evacuation Status Report ===

Guide position: [${guide.lng.toFixed(4)}, ${guide.lat.toFixed(4)}]

FIRE
${fireDesc}
${fireDir}

ROAD BLOCKAGES
${roadblockLine}

SAFE POINTS
${safePointLines}

RESIDENTS  (total=${residents.length}  safe=${safe}  dead=${dead}  in-progress=${moving})
${atRisk || "  (none at risk)"}

Analyse the situation and call direct_residents_to_safe_point with the best safe point ID.
`.trim();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Backboard response types
───────────────────────────────────────────────────────────────────────────── */

type ToolCall = {
  id: string;
  function: {
    name: string;
    parsed_arguments?: Record<string, string>;
    arguments?: string;
  };
};

type MessageResponse = {
  status?: string;
  content?: string;
  tool_calls?: ToolCall[];
  run_id?: string;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Single guide decision
───────────────────────────────────────────────────────────────────────────── */

async function getGuideDecision(
  guide: Agent,
  allAgents: Agent[],
  scenario: Scenario,
  fireCells: FireCell[],
  tick: number,
  blockedEdges: Set<string>,
): Promise<GuideDecision | null> {
  const session = await ensureSession(guide.id);
  const message = buildStateMessage(guide, allAgents, scenario, fireCells, tick, blockedEdges);

  const response = await apiPost<MessageResponse>(
    `/threads/${session.threadId}/messages`,
    { content: message, stream: false },
  );
  session.messageCount++;

  if (response.status !== "REQUIRES_ACTION" || !response.tool_calls) {
    console.log(`[GuideAI] ${guide.id}: no tool call returned (tick ${tick})`);
    return null;
  }

  // Pre-compute reachability so we can validate (and override) the AI's choice.
  const _graph = buildGraph(scenario);
  const _nodeMap = buildNodeMap(scenario.nodes);
  const feasibility = checkSafePointFeasibility(guide, scenario, fireCells, blockedEdges, _graph, _nodeMap);

  const distSq = (sp: { lng: number; lat: number }) => {
    const dx = (sp.lng - guide.lng) * Math.cos((guide.lat * Math.PI) / 180);
    const dy = sp.lat - guide.lat;
    return dx * dx + dy * dy;
  };

  for (const tc of response.tool_calls) {
    if (tc.function.name !== "direct_residents_to_safe_point") continue;

    const args =
      tc.function.parsed_arguments ??
      JSON.parse(tc.function.arguments ?? "{}") as Record<string, string>;

    const rawSpId = args["safe_point_id"];
    const aiChosen = scenario.safePoints.find((sp) => sp.id === rawSpId);
    const isReachable = aiChosen && feasibility[aiChosen.id] !== false;

    let validSp: typeof aiChosen;
    if (isReachable) {
      validSp = aiChosen;
    } else {
      // AI chose an unknown or road-blocked safe point.
      // Override with nearest reachable, and recycle the thread so the AI
      // gets fresh context without accumulated "s1 is fine" history bias.
      const reachable = scenario.safePoints.filter((sp) => feasibility[sp.id] !== false);
      const candidates = reachable.length > 0 ? reachable : [...scenario.safePoints];
      validSp = candidates.sort((a, b) => distSq(a) - distSq(b))[0];
      session.messageCount = MAX_THREAD_MESSAGES; // force fresh thread next tick
      console.warn(`[GuideAI] ${guide.id}: AI chose blocked/unknown "${rawSpId}", overriding → ${validSp?.id}`);
    }

    if (!validSp) return null;

    const decision: GuideDecision = {
      guideId: guide.id,
      targetSafePointId: validSp.id,
      reason: args["reason"],
    };

    console.log(
      `[GuideAI] ${guide.id} → ${decision.targetSafePointId}: ${decision.reason ?? "(no reason)"}`,
    );

    // Only submit tool-outputs if Backboard provided a run_id.
    // Without a run_id the endpoint returns 404 — Backboard advances the thread automatically.
    if (response.run_id) {
      try {
        await apiPost(`/threads/${session.threadId}/tool-outputs`, {
          run_id: response.run_id,
          tool_outputs: [
            {
              tool_call_id: tc.id,
              output: JSON.stringify({
                success: true,
                message: `Residents now routing to ${decision.targetSafePointId}`,
              }),
            },
          ],
        });
      } catch (toolErr) {
        console.warn(`[GuideAI] ${guide.id}: tool-output failed, recycling thread`, toolErr);
        session.messageCount = MAX_THREAD_MESSAGES; // force new thread on next tick
      }
    }

    return decision;
  }

  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Public entry point
───────────────────────────────────────────────────────────────────────────── */

/**
 * Fetch AI decisions for all live guides in parallel.
 * If the local Backboard proxy is unavailable, returns [] (graceful degradation).
 */
export async function getGuideDecisions(
  agents: Agent[],
  scenario: Scenario,
  fireCells: FireCell[],
  tick: number,
  blockedEdges: Set<string> = new Set(),
): Promise<GuideDecision[]> {
  if (!BACKBOARD_ENABLED) return [];

  const guides = agents.filter(
    (a) => a.kind === "guide" && a.status !== "dead" && a.status !== "safe",
  );

  const results = await Promise.allSettled(
    guides.map((guide) =>
      getGuideDecision(guide, agents, scenario, fireCells, tick, blockedEdges).catch(
        (err: unknown) => {
          console.error(`[GuideAI] ${guide.id} error:`, err);
          // Graceful fallback: route to nearest REACHABLE safe point (respects road blockages)
          const _graph = buildGraph(scenario);
          const _nodeMap = buildNodeMap(scenario.nodes);
          const feasibility = checkSafePointFeasibility(guide, scenario, fireCells, blockedEdges, _graph, _nodeMap);
          const distSq = (sp: { lng: number; lat: number }) => {
            const dx = (sp.lng - guide.lng) * Math.cos((guide.lat * Math.PI) / 180);
            const dy = sp.lat - guide.lat;
            return dx * dx + dy * dy;
          };
          const reachable = scenario.safePoints.filter((sp) => feasibility[sp.id] !== false);
          const candidates = reachable.length > 0 ? reachable : [...scenario.safePoints];
          const fallback = candidates.sort((a, b) => distSq(a) - distSq(b))[0];
          return fallback
            ? ({ guideId: guide.id, targetSafePointId: fallback.id, reason: "AI unavailable — nearest reachable fallback" } satisfies GuideDecision)
            : null;
        },
      ),
    ),
  );

  const decisions: GuideDecision[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) decisions.push(r.value);
  }
  return decisions;
}
