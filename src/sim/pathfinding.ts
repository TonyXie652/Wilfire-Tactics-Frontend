// src/sim/pathfinding.ts
// Road-network pathfinding: A* (single agent) + Flow Fields (multi-agent)
//
// Unit discipline:
//   - All edge costs and penalty values are in METRES (via Haversine).
//   - simpleDistance() is used only where a fast ordering proxy is acceptable
//     (nearest-node snap) — never for cost computation.

import type { Node, Edge, Scenario, SafePoint, FireCell } from "../app/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Graph types
───────────────────────────────────────────────────────────────────────────── */

export type GraphEdge = {
  to: string;
  edgeId: string;
  cost: number; // metres
};

export type Graph = Map<string, GraphEdge[]>;

/** Build an undirected adjacency list from scenario nodes + edges. */
export function buildGraph(scenario: Scenario): Graph {
  const graph: Graph = new Map();
  for (const n of scenario.nodes) graph.set(n.id, []);

  const nodeMap = buildNodeMap(scenario.nodes);
  for (const edge of scenario.edges) {
    const a = nodeMap.get(edge.from);
    const b = nodeMap.get(edge.to);
    if (!a || !b) continue;
    const cost = edge.baseCost ?? haversine(a.lng, a.lat, b.lng, b.lat);
    graph.get(edge.from)!.push({ to: edge.to, edgeId: edge.id, cost });
    graph.get(edge.to)!.push({ to: edge.from, edgeId: edge.id, cost });
  }
  return graph;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Distance helpers
───────────────────────────────────────────────────────────────────────────── */

/** Haversine great-circle distance in metres. */
export function haversine(
  lng1: number, lat1: number,
  lng2: number, lat2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Fast Euclidean proxy — lng/lat units.  Only for ordering / nearest-snap. */
function simpleDistance(
  lng1: number, lat1: number,
  lng2: number, lat2: number,
): number {
  const d1 = lng1 - lng2, d2 = lat1 - lat2;
  return Math.sqrt(d1 * d1 + d2 * d2);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Node map helpers
───────────────────────────────────────────────────────────────────────────── */

export function buildNodeMap(nodes: Node[]): Map<string, Node> {
  return new Map(nodes.map((n) => [n.id, n]));
}

/** Find the road-graph node closest to [lng, lat]. */
export function findNearestNode(
  lng: number,
  lat: number,
  nodes: Node[],
): Node | null {
  let best: Node | null = null;
  let bestD = Infinity;
  for (const n of nodes) {
    const d = simpleDistance(lng, lat, n.lng, n.lat);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

/** Find the safe point nearest to a given road node (Haversine). */
export function findNearestSafePoint(
  nodeId: string,
  safePoints: SafePoint[],
  nodeMap: Map<string, Node>,
): SafePoint | null {
  const node = nodeMap.get(nodeId);
  if (!node) return null;
  let best: SafePoint | null = null;
  let bestD = Infinity;
  for (const sp of safePoints) {
    const d = haversine(node.lng, node.lat, sp.lng, sp.lat);
    if (d < bestD) { bestD = d; best = sp; }
  }
  return best;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Fire penalty  (all in metres — consistent with edge costs)
───────────────────────────────────────────────────────────────────────────── */

/** Metres within which fire affects path cost. */
const FIRE_DANGER_RADIUS_M = 200;

/**
 * Extra metres of cost added per unit of intensity when a node is at the
 * inner edge of the danger radius (distance → 0).  Scales linearly with
 * (1 − dist/radius) × intensity.
 */
const FIRE_PENALTY_MULTIPLIER = 500;

/** Intensity threshold above which a node is completely impassable. */
const FIRE_BLOCK_INTENSITY = 3;

/**
 * Returns the additional path cost (metres) for passing through a node near
 * fire.  Returns Infinity if the node is inside intense fire.
 */
export function firePenalty(
  nodeLng: number,
  nodeLat: number,
  fireCells: FireCell[],
): number {
  let penalty = 0;
  for (const cell of fireCells) {
    const [fLng, fLat] = cell.position;
    const distM = haversine(nodeLng, nodeLat, fLng, fLat);
    if (distM >= FIRE_DANGER_RADIUS_M) continue;

    if (cell.intensity >= FIRE_BLOCK_INTENSITY) return Infinity;

    const factor = (1 - distM / FIRE_DANGER_RADIUS_M) * cell.intensity;
    penalty += factor * FIRE_PENALTY_MULTIPLIER;
  }
  return penalty;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Min-heap (binary heap) — replaces the O(n²) linear scan in the old A*
───────────────────────────────────────────────────────────────────────────── */

class MinHeap<T> {
  private data: T[] = [];
  private readonly cmp: (a: T, b: T) => number;
  constructor(cmp: (a: T, b: T) => number) { this.cmp = cmp; }

  get size() { return this.data.length; }

  push(item: T): void {
    this.data.push(item);
    this._up(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this._down(0);
    }
    return top;
  }

  private _up(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.data[i], this.data[p]) < 0) {
        [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
        i = p;
      } else break;
    }
  }

  private _down(i: number): void {
    const n = this.data.length;
    while (true) {
      let min = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.cmp(this.data[l], this.data[min]) < 0) min = l;
      if (r < n && this.cmp(this.data[r], this.data[min]) < 0) min = r;
      if (min === i) break;
      [this.data[i], this.data[min]] = [this.data[min], this.data[i]];
      i = min;
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   A*  (single-query, fire-aware)
   Use this only for isolated queries (guide planning, feasibility checks).
   For mass evacuation, prefer buildFlowField + followFlowField.
───────────────────────────────────────────────────────────────────────────── */

/**
 * Returns the optimal node-ID path from startNodeId to the road-graph node
 * nearest to (goalLng, goalLat), avoiding fire and blockedEdges.
 * Returns [] if no path exists.
 */
export function astar(
  startNodeId: string,
  goalLng: number,
  goalLat: number,
  graph: Graph,
  nodeMap: Map<string, Node>,
  fireCells: FireCell[],
  blockedEdges: Set<string> = new Set(),
): string[] {
  const startNode = nodeMap.get(startNodeId);
  if (!startNode) return [];

  const nodes = [...nodeMap.values()];
  const goalNode = findNearestNode(goalLng, goalLat, nodes);
  if (!goalNode) return [];
  const goalId = goalNode.id;

  if (startNodeId === goalId) return [startNodeId];

  const h = (id: string): number => {
    const n = nodeMap.get(id);
    return n ? haversine(n.lng, n.lat, goalNode.lng, goalNode.lat) : Infinity;
  };

  type Entry = { id: string; f: number };
  const heap = new MinHeap<Entry>((a, b) => a.f - b.f);
  const gCost = new Map<string, number>();
  const cameFrom = new Map<string, string>();

  gCost.set(startNodeId, 0);
  heap.push({ id: startNodeId, f: h(startNodeId) });

  while (heap.size > 0) {
    const { id: cur } = heap.pop()!;
    if (cur === goalId) {
      // Reconstruct path
      const path: string[] = [];
      let c: string | undefined = goalId;
      while (c !== undefined) { path.unshift(c); c = cameFrom.get(c); }
      return path;
    }

    const curG = gCost.get(cur) ?? Infinity;

    for (const edge of graph.get(cur) ?? []) {
      if (blockedEdges.has(edge.edgeId)) continue;
      const nbr = nodeMap.get(edge.to);
      if (!nbr) continue;

      const penalty = firePenalty(nbr.lng, nbr.lat, fireCells);
      if (penalty === Infinity) continue;

      const tentG = curG + edge.cost + penalty;
      if (tentG >= (gCost.get(edge.to) ?? Infinity)) continue;

      gCost.set(edge.to, tentG);
      cameFrom.set(edge.to, cur);
      heap.push({ id: edge.to, f: tentG + h(edge.to) });
    }
  }

  return []; // no path
}

/* ─────────────────────────────────────────────────────────────────────────────
   Flow Field  (multi-agent evacuation toward a single safe point)

   Algorithm:
   1. Run Dijkstra backwards from the goal node on the (undirected) graph,
      computing dist[v] = minimum cost to travel from v to goal.
   2. For every node v, record nextHop[v] = the neighbour u that minimises
      (edge_cost(v→u) + firePenalty(u) + dist[u]).

   All agents targeting the same safe point share one flow field, so the
   amortised cost is O(safePoints × Dijkstra) instead of O(agents × A*).
───────────────────────────────────────────────────────────────────────────── */

export type FlowField = Map<string, string>; // nodeId → nextNodeId toward goal

/**
 * Build a fire-aware flow field directing every road node toward goalNodeId.
 */
export function buildFlowField(
  goalNodeId: string,
  graph: Graph,
  nodeMap: Map<string, Node>,
  fireCells: FireCell[],
  blockedEdges: Set<string>,
): FlowField {
  // ── Step 1: Dijkstra from goal ──────────────────────────────────────────
  type Entry = { id: string; d: number };
  const heap = new MinHeap<Entry>((a, b) => a.d - b.d);
  const dist = new Map<string, number>();

  dist.set(goalNodeId, 0);
  heap.push({ id: goalNodeId, d: 0 });

  while (heap.size > 0) {
    const { id: cur, d: curD } = heap.pop()!;
    if (curD > (dist.get(cur) ?? Infinity)) continue; // stale entry

    for (const edge of graph.get(cur) ?? []) {
      if (blockedEdges.has(edge.edgeId)) continue;
      const nbr = nodeMap.get(edge.to);
      if (!nbr) continue;

      const penalty = firePenalty(nbr.lng, nbr.lat, fireCells);
      if (penalty === Infinity) continue;

      const newD = curD + edge.cost + penalty;
      if (newD < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, newD);
        heap.push({ id: edge.to, d: newD });
      }
    }
  }

  // ── Step 2: For each node, find the best next hop ───────────────────────
  const field: FlowField = new Map();

  for (const nodeId of graph.keys()) {
    if (nodeId === goalNodeId) continue;

    let bestNext: string | null = null;
    let bestCost = Infinity;

    for (const edge of graph.get(nodeId) ?? []) {
      if (blockedEdges.has(edge.edgeId)) continue;
      const nbr = nodeMap.get(edge.to);
      if (!nbr) continue;

      const neighborDist = dist.get(edge.to);
      if (neighborDist === undefined) continue;

      const penalty = firePenalty(nbr.lng, nbr.lat, fireCells);
      if (penalty === Infinity) continue;

      const total = edge.cost + penalty + neighborDist;
      if (total < bestCost) {
        bestCost = total;
        bestNext = edge.to;
      }
    }

    if (bestNext !== null) field.set(nodeId, bestNext);
  }

  return field;
}

/**
 * Walk the flow field from startNodeId to produce a short lookahead path
 * (for visualisation).  Returns node-ID array of length ≤ maxSteps.
 */
export function pathFromFlowField(
  startNodeId: string,
  field: FlowField,
  maxSteps = 8,
): string[] {
  const path: string[] = [startNodeId];
  const visited = new Set<string>([startNodeId]);
  let cur = startNodeId;
  for (let i = 0; i < maxSteps; i++) {
    const next = field.get(cur);
    if (!next || visited.has(next)) break;
    path.push(next);
    visited.add(next);
    cur = next;
  }
  return path;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Re-exports for convenience
───────────────────────────────────────────────────────────────────────────── */

export type { Edge };
