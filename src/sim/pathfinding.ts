// src/sim/pathfinding.ts
// A* 路径寻找算法 — 基于路网图结构 + 火势动态代价

import type { Node, Scenario, SafePoint, FireCell } from "../app/types";

/* ──────────── 图结构 ──────────── */

export type GraphEdge = {
    to: string;
    edgeId: string;
    cost: number;     // 基础代价（距离）
};

export type Graph = Map<string, GraphEdge[]>;

/** 把 Scenario 的 nodes + edges 转成邻接表 */
export function buildGraph(scenario: Scenario): Graph {
    const graph: Graph = new Map();

    // 初始化所有节点
    for (const node of scenario.nodes) {
        graph.set(node.id, []);
    }

    const nodeMap = new Map(scenario.nodes.map((n) => [n.id, n] as const));

    for (const edge of scenario.edges) {
        const a = nodeMap.get(edge.from);
        const b = nodeMap.get(edge.to);
        if (!a || !b) continue;

        const dist = haversine(a.lng, a.lat, b.lng, b.lat);
        const cost = edge.baseCost ?? dist;

        // 双向边
        graph.get(edge.from)!.push({ to: edge.to, edgeId: edge.id, cost });
        graph.get(edge.to)!.push({ to: edge.from, edgeId: edge.id, cost });
    }

    return graph;
}

/* ──────────── 距离计算 ──────────── */

/** Haversine 公式：两个经纬度之间的距离（米） */
export function haversine(
    lng1: number, lat1: number,
    lng2: number, lat2: number
): number {
    const R = 6371000; // 地球半径（米）
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 简化距离（经纬度平面近似），用于快速比较 */
function simpleDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
    const dlng = lng1 - lng2;
    const dlat = lat1 - lat2;
    return Math.sqrt(dlng * dlng + dlat * dlat);
}

/* ──────────── 辅助函数 ──────────── */

/** 找到离给定坐标最近的路网节点 */
export function findNearestNode(
    lng: number,
    lat: number,
    nodes: Node[]
): Node | null {
    let best: Node | null = null;
    let bestDist = Infinity;

    for (const n of nodes) {
        const d = simpleDistance(lng, lat, n.lng, n.lat);
        if (d < bestDist) {
            bestDist = d;
            best = n;
        }
    }

    return best;
}

/** 找到离给定节点最近的安全点 */
export function findNearestSafePoint(
    nodeId: string,
    safePoints: SafePoint[],
    nodes: Node[]
): SafePoint | null {
    const nodeMap = new Map(nodes.map((n) => [n.id, n] as const));
    const node = nodeMap.get(nodeId);
    if (!node) return null;

    let best: SafePoint | null = null;
    let bestDist = Infinity;

    for (const sp of safePoints) {
        const d = simpleDistance(node.lng, node.lat, sp.lng, sp.lat);
        if (d < bestDist) {
            bestDist = d;
            best = sp;
        }
    }

    return best;
}

/* ──────────── 火势代价 ──────────── */

const FIRE_DANGER_RADIUS = 0.002;    // 警戒范围（约 200m）
const FIRE_PENALTY_MULTIPLIER = 5000;  // 高代价但不至于让图全断
const FIRE_BLOCK_INTENSITY = 3;        // 只有强火（intensity≥3）才完全封路

/** 计算某节点受火势影响的附加代价 */
function firePenalty(
    nodeLng: number,
    nodeLat: number,
    fireCells: FireCell[]
): number {
    let penalty = 0;

    for (const cell of fireCells) {
        const [fLng, fLat] = cell.position;
        const dist = simpleDistance(nodeLng, nodeLat, fLng, fLat);

        if (dist < FIRE_DANGER_RADIUS) {
            if (cell.intensity >= FIRE_BLOCK_INTENSITY) {
                return Infinity; // 直接不可通行
            }
            // 距离越近、强度越高 → 代价越大
            const factor = (1 - dist / FIRE_DANGER_RADIUS) * cell.intensity;
            penalty += factor * FIRE_PENALTY_MULTIPLIER;
        }
    }

    return penalty;
}

/* ──────────── A* 算法 ──────────── */

type AStarNode = {
    nodeId: string;
    g: number;     // 起点到此的实际代价
    f: number;     // g + h 的估计总代价
    parent: string | null;
};

/**
 * A* 路径寻找
 * @param startNodeId  起始路网节点 ID
 * @param goalLng      目标经度（安全点）
 * @param goalLat      目标纬度（安全点）
 * @param graph        邻接表
 * @param nodes        所有路网节点
 * @param fireCells    当前火势状态
 * @param blockedEdges 被路障封掉的边 ID 集合
 * @returns nodeId 列表（从起点到终点），找不到返回空数组
 */
export function astar(
    startNodeId: string,
    goalLng: number,
    goalLat: number,
    graph: Graph,
    nodes: Node[],
    fireCells: FireCell[],
    blockedEdges: Set<string> = new Set()
): string[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n] as const));
    const startNode = nodeMap.get(startNodeId);
    if (!startNode) return [];

    // 找到离目标最近的路网节点作为终点
    const goalNode = findNearestNode(goalLng, goalLat, nodes);
    if (!goalNode) return [];
    const goalNodeId = goalNode.id;

    if (startNodeId === goalNodeId) return [startNodeId];

    // 启发函数：到目标的直线距离
    const heuristic = (nId: string) => {
        const n = nodeMap.get(nId);
        if (!n) return Infinity;
        return haversine(n.lng, n.lat, goalNode.lng, goalNode.lat);
    };

    const openSet = new Map<string, AStarNode>();
    const closedSet = new Set<string>();

    const startEntry: AStarNode = {
        nodeId: startNodeId,
        g: 0,
        f: heuristic(startNodeId),
        parent: null,
    };
    openSet.set(startNodeId, startEntry);

    const cameFrom = new Map<string, string>();

    while (openSet.size > 0) {
        // 找 f 值最小的节点
        let current: AStarNode | null = null;
        for (const node of openSet.values()) {
            if (!current || node.f < current.f) {
                current = node;
            }
        }
        if (!current) break;

        // 到达终点
        if (current.nodeId === goalNodeId) {
            // 回溯路径
            const path: string[] = [];
            let cur: string | undefined = goalNodeId;
            while (cur) {
                path.unshift(cur);
                cur = cameFrom.get(cur);
            }
            return path;
        }

        openSet.delete(current.nodeId);
        closedSet.add(current.nodeId);

        // 遍历邻居
        const neighbors = graph.get(current.nodeId) ?? [];
        for (const edge of neighbors) {
            if (closedSet.has(edge.to)) continue;
            if (blockedEdges.has(edge.edgeId)) continue;

            const neighborNode = nodeMap.get(edge.to);
            if (!neighborNode) continue;

            // 计算代价：基础 + 火势惩罚
            const fPenalty = firePenalty(neighborNode.lng, neighborNode.lat, fireCells);
            if (fPenalty === Infinity) continue; // 被火封了

            const tentativeG = current.g + edge.cost + fPenalty;

            const existing = openSet.get(edge.to);
            if (existing && tentativeG >= existing.g) continue;

            cameFrom.set(edge.to, current.nodeId);

            openSet.set(edge.to, {
                nodeId: edge.to,
                g: tentativeG,
                f: tentativeG + heuristic(edge.to),
                parent: current.nodeId,
            });
        }
    }

    // 找不到路径
    return [];
}
