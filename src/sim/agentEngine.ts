// src/sim/agentEngine.ts
// 每 tick 更新所有 Agent 的状态：移动、跟随引导员、碰撞检测

import type { Agent, Scenario, FireCell, GuideDecision } from "../app/types";
import {
    buildGraph,
    astar,
    findNearestNode,
    findNearestSafePoint,
    haversine,
    type Graph,
} from "./pathfinding";

/* ──────────── 常量 ──────────── */

/** 引导员影响范围（米） */
const GUIDE_INFLUENCE_RADIUS = 150;

/** 居民跟随引导员的概率 (0~1) */
const FOLLOW_GUIDE_CHANCE = 0.6;

/** 每多少 tick 重新算一次路径 */
const REPATH_INTERVAL = 8;

/** 火焰致死范围（经纬度单位，约 50 米） */
const FIRE_KILL_RADIUS = 0.0005;

/** 到达安全点的距离阈值（经纬度单位，约 30 米） */
const SAFE_ARRIVAL_RADIUS = 0.0003;

/** 默认居民速度 */
export const DEFAULT_RESIDENT_SPEED = 0.00004;

/** 默认引导员速度（比居民快一点） */
export const DEFAULT_GUIDE_SPEED = 0.00005;

/* ──────────── 辅助函数 ──────────── */

function distLngLat(
    lng1: number, lat1: number,
    lng2: number, lat2: number
): number {
    const dlng = lng1 - lng2;
    const dlat = lat1 - lat2;
    return Math.sqrt(dlng * dlng + dlat * dlat);
}

/** 判断坐标是否在火焰区域内 */
function isInFire(lng: number, lat: number, fireCells: FireCell[]): boolean {
    for (const cell of fireCells) {
        const [fLng, fLat] = cell.position;
        if (
            cell.intensity >= 2 &&
            distLngLat(lng, lat, fLng, fLat) < FIRE_KILL_RADIUS
        ) {
            return true;
        }
    }
    return false;
}

/** 判断坐标是否到达某安全点 */
function isNearSafePoint(
    lng: number,
    lat: number,
    scenario: Scenario
): boolean {
    for (const sp of scenario.safePoints) {
        if (distLngLat(lng, lat, sp.lng, sp.lat) < SAFE_ARRIVAL_RADIUS) {
            return true;
        }
    }
    return false;
}

/* ──────────── 创建 Agent 的便利函数 ──────────── */

/** 创建一个带默认值的居民 Agent */
export function createResident(
    id: string,
    lng: number,
    lat: number,
    reactionDelay = 3
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
        ticksSinceStart: 0,
    };
}

/** 创建一个引导员 Agent */
export function createGuide(
    id: string,
    lng: number,
    lat: number
): Agent {
    return {
        id,
        lng,
        lat,
        kind: "guide",
        status: "moving", // 引导员一上来就在行动
        speed: DEFAULT_GUIDE_SPEED,
        path: [],
        pathIndex: 0,
        pathHistory: [],
        reactionDelay: 0,
        ticksSinceStart: 0,
    };
}

/* ──────────── 核心引擎 ──────────── */

/**
 * 每 tick 更新所有 Agent
 *
 * @param agents         当前所有 agent
 * @param scenario       场景数据（路网 + 安全点）
 * @param fireCells      当前火势
 * @param tick           当前 tick 数
 * @param guideDecisions 引导员 AI 的决策（从 Backboard 返回）
 * @param blockedEdges   被路障封掉的边 ID 集合
 * @returns 更新后的 agents 数组
 */
export function stepAgents(
    agents: Agent[],
    scenario: Scenario,
    fireCells: FireCell[],
    tick: number,
    guideDecisions: GuideDecision[] = [],
    blockedEdges: Set<string> = new Set()
): Agent[] {
    const graph = buildGraph(scenario);
    const nodeMap = new Map(scenario.nodes.map((n) => [n.id, n] as const));

    // 找出所有引导员及其决策
    const guideAgents = agents.filter((a) => a.kind === "guide" && a.status !== "dead");
    const guideDecisionMap = new Map(
        guideDecisions.map((d) => [d.guideId, d] as const)
    );

    return agents.map((agent) => {
        const a = { ...agent, pathHistory: [...agent.pathHistory] };
        a.ticksSinceStart = tick;

        // 记录当前位置到历史轨迹
        a.pathHistory.push([a.lng, a.lat]);

        // ──────── 已经死了或安全了，不更新 ────────
        if (a.status === "safe" || a.status === "dead") return a;

        // ──────── 检查是否被火烧死 ────────
        if (isInFire(a.lng, a.lat, fireCells)) {
            a.status = "dead";
            console.log(`[Agent] ${a.id} 被火烧死了！`);
            return a;
        }

        // ──────── 检查是否到达安全点 ────────
        if (isNearSafePoint(a.lng, a.lat, scenario)) {
            a.status = "safe";
            console.log(`[Agent] ${a.id} 安全到达！`);
            return a;
        }

        // ──────── 引导员逻辑 ────────
        if (a.kind === "guide") {
            return updateGuide(a, scenario, fireCells, graph, nodeMap, guideDecisionMap, blockedEdges);
        }

        // ──────── 居民逻辑 ────────
        return updateResident(
            a, scenario, fireCells, graph, nodeMap,
            guideAgents, guideDecisionMap, tick, blockedEdges
        );
    });
}

/* ──────────── 引导员更新 ──────────── */

function updateGuide(
    guide: Agent,
    scenario: Scenario,
    fireCells: FireCell[],
    graph: Graph,
    nodeMap: Map<string, { id: string; lng: number; lat: number }>,
    guideDecisionMap: Map<string, GuideDecision>,
    blockedEdges: Set<string>
): Agent {
    const decision = guideDecisionMap.get(guide.id);

    if (decision) {
        // Backboard AI 指定了目标安全点 → 引导员走向那个安全点
        const targetSP = scenario.safePoints.find(
            (sp) => sp.id === decision.targetSafePointId
        );
        if (targetSP) {
            // 重新计算到目标安全点的路径
            const nearestNode = findNearestNode(guide.lng, guide.lat, scenario.nodes);
            if (nearestNode) {
                guide.path = astar(
                    nearestNode.id,
                    targetSP.lng,
                    targetSP.lat,
                    graph,
                    scenario.nodes,
                    fireCells,
                    blockedEdges
                );
                guide.pathIndex = 0;
                guide.currentNodeId = nearestNode.id;
            }
        }
    }

    // 如果还没有路径，走向最近的安全点
    if (guide.path.length === 0) {
        const nearestNode = findNearestNode(guide.lng, guide.lat, scenario.nodes);
        if (nearestNode) {
            const sp = findNearestSafePoint(nearestNode.id, scenario.safePoints, scenario.nodes);
            if (sp) {
                guide.path = astar(
                    nearestNode.id,
                    sp.lng,
                    sp.lat,
                    graph,
                    scenario.nodes,
                    fireCells,
                    blockedEdges
                );
                guide.pathIndex = 0;
            }
        }
    }

    // 沿路径移动
    moveAlongPath(guide, nodeMap);

    return guide;
}

/* ──────────── 居民更新 ──────────── */

function updateResident(
    resident: Agent,
    scenario: Scenario,
    fireCells: FireCell[],
    graph: Graph,
    nodeMap: Map<string, { id: string; lng: number; lat: number }>,
    guideAgents: Agent[],
    guideDecisionMap: Map<string, GuideDecision>,
    tick: number,
    blockedEdges: Set<string>
): Agent {
    // ──── 检查附近是否有引导员 ────
    const nearbyGuide = findNearbyGuide(resident, guideAgents);

    // ──── 不在引导员范围内 → 不动 ────
    if (!nearbyGuide) {
        // 如果之前在跟随，清除状态，停下来等待
        if (resident.followingGuideId) {
            resident.followingGuideId = undefined;
            resident.path = [];
            resident.status = "idle";
            console.log(`[Agent] ${resident.id} 离开引导员范围，停止移动`);
        }
        return resident;
    }

    // ──── 在引导员范围内 → 激活并跟随 ────

    // 反应延迟
    if (resident.status === "idle") {
        if (tick < resident.reactionDelay) {
            return resident;
        }
        resident.status = "moving";
        console.log(`[Agent] ${resident.id} 被引导员 ${nearbyGuide.id} 激活！`);
    }

    // 决定是否跟随这个引导员
    if (!resident.followingGuideId) {
        if (Math.random() < FOLLOW_GUIDE_CHANCE) {
            resident.followingGuideId = nearbyGuide.id;
            console.log(
                `[Agent] ${resident.id} 开始跟随引导员 ${nearbyGuide.id}`
            );
        }
    }

    if (resident.followingGuideId === nearbyGuide.id) {
        // 跟随引导员：朝引导员位置移动
        moveToward(resident, nearbyGuide.lng, nearbyGuide.lat);

        // 引导员有 AI 指定的安全点 → 居民用同一个目标走 A*
        const decision = guideDecisionMap.get(nearbyGuide.id);
        if (decision) {
            const targetSP = scenario.safePoints.find(
                (sp) => sp.id === decision.targetSafePointId
            );
            if (targetSP) {
                const nearestNode = findNearestNode(
                    resident.lng,
                    resident.lat,
                    scenario.nodes
                );
                if (nearestNode) {
                    resident.path = astar(
                        nearestNode.id,
                        targetSP.lng,
                        targetSP.lat,
                        graph,
                        scenario.nodes,
                        fireCells,
                        blockedEdges
                    );
                    resident.pathIndex = 0;
                }
            }
        }

        return resident;
    }

    // 在引导员范围内但没跟随 → 走向引导员的目标安全点（用 A*）
    const guideDecision = guideDecisionMap.get(nearbyGuide.id);
    let targetSP = guideDecision
        ? scenario.safePoints.find((sp) => sp.id === guideDecision.targetSafePointId)
        : null;

    // 默认走最近安全点
    if (!targetSP) {
        const nearestNode = findNearestNode(resident.lng, resident.lat, scenario.nodes);
        if (nearestNode) {
            targetSP = findNearestSafePoint(nearestNode.id, scenario.safePoints, scenario.nodes);
        }
    }

    if (targetSP) {
        const needsRepath =
            resident.path.length === 0 ||
            resident.pathIndex >= resident.path.length ||
            tick % REPATH_INTERVAL === 0;

        if (needsRepath) {
            const nearestNode = findNearestNode(resident.lng, resident.lat, scenario.nodes);
            if (nearestNode) {
                resident.path = astar(
                    nearestNode.id,
                    targetSP.lng,
                    targetSP.lat,
                    graph,
                    scenario.nodes,
                    fireCells,
                    blockedEdges
                );
                resident.pathIndex = 0;
                resident.currentNodeId = nearestNode.id;
            }
        }

        moveAlongPath(resident, nodeMap);
    }

    return resident;
}

/* ──────────── 移动逻辑 ──────────── */

/** 沿 A* 路径移动：朝 path[pathIndex] 的节点走一步 */
function moveAlongPath(
    agent: Agent,
    nodeMap: Map<string, { id: string; lng: number; lat: number }>
): void {
    if (agent.pathIndex >= agent.path.length) return;

    const targetNodeId = agent.path[agent.pathIndex];
    const targetNode = nodeMap.get(targetNodeId);
    if (!targetNode) return;

    const dist = distLngLat(agent.lng, agent.lat, targetNode.lng, targetNode.lat);

    if (dist <= agent.speed) {
        // 到达这个节点，前进到下一个路径点
        agent.lng = targetNode.lng;
        agent.lat = targetNode.lat;
        agent.currentNodeId = targetNodeId;
        agent.pathIndex++;
    } else {
        // 朝目标移动一步
        moveToward(agent, targetNode.lng, targetNode.lat);
    }
}

/** 朝某个坐标移动一步 */
function moveToward(
    agent: Agent,
    targetLng: number,
    targetLat: number
): void {
    const dlng = targetLng - agent.lng;
    const dlat = targetLat - agent.lat;
    const dist = Math.sqrt(dlng * dlng + dlat * dlat);

    if (dist <= agent.speed || dist === 0) {
        agent.lng = targetLng;
        agent.lat = targetLat;
    } else {
        agent.lng += (dlng / dist) * agent.speed;
        agent.lat += (dlat / dist) * agent.speed;
    }
}

/** 找到附近的引导员 */
function findNearbyGuide(
    resident: Agent,
    guideAgents: Agent[]
): Agent | null {
    let closest: Agent | null = null;
    let closestDist = Infinity;

    for (const guide of guideAgents) {
        if (guide.status === "dead") continue;

        const dist = haversine(resident.lng, resident.lat, guide.lng, guide.lat);
        if (dist < GUIDE_INFLUENCE_RADIUS && dist < closestDist) {
            closestDist = dist;
            closest = guide;
        }
    }

    return closest;
}
