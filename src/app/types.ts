// src/app/types.ts

export type Node = {
  id: string;
  lng: number;
  lat: number;
};

export type Edge = {
  id: string;
  from: string;
  to: string;
  baseCost?: number; // meters; if omitted, computed from Haversine at graph build time
};

export type SafePoint = {
  id: string;
  lng: number;
  lat: number;
};

export type Scenario = {
  nodes: Node[];
  edges: Edge[];
  safePoints: SafePoint[];
};

export type AgentStatus = "idle" | "moving" | "safe" | "dead";

export type Agent = {
  id: string;
  lng: number;
  lat: number;
  kind: "resident" | "guide" | "truck" | "roadblock";
  status?: AgentStatus;

  // ── movement ──────────────────────────────────────────────────────────────
  speed?: number;           // lng/lat units per tick (≈ 4m/tick for resident)
  currentNodeId?: string;   // road-graph node the agent is currently at / heading to

  // planned path ahead (used for visualisation; populated from flow field)
  path?: string[];
  pathIndex?: number;

  // historical trail for replay / visualisation
  pathHistory?: [number, number][];

  // ── following & targeting ─────────────────────────────────────────────────
  followingGuideId?: string;  // ID of guide being followed (if any)
  targetSafePointId?: string; // safe point this agent is routing toward

  // ── timing ───────────────────────────────────────────────────────────────
  reactionDelay?: number;     // ticks after fire appears before agent reacts
  ticksSinceStart?: number;   // global tick counter at last update
  spawnTick?: number;         // global tick when this agent was created

  // ── state flags ──────────────────────────────────────────────────────────
  panickedAt?: number;        // tick of most recent panic event (for speed boost)
};

/** Decision produced by the guide AI each N ticks. */
export type GuideDecision = {
  guideId: string;
  targetSafePointId: string;
  reason?: string;
};

export type FireCell = {
  id: string;
  position: [number, number]; // [lng, lat]
  intensity: number;          // 0–3+
  size: number;               // metres
  age?: number;
  activatedAt?: number;
};

export type WindConfig = {
  angleDeg: number;         // 0=N, 90=E, 180=S, 270=W
  speed: number;            // 0–1 normalised coefficient
  baseSpreadChance: number; // base spread probability per tick
};
