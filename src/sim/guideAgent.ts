// src/sim/guideAgent.ts
// Backboard AI 引导员大脑 — 每 N tick 调用一次，返回引导员的决策

import type { Agent, Scenario, FireCell, GuideDecision } from "../app/types";
import { BACKBOARD_API_KEY, BACKBOARD_BASE_URL } from "../app/api";

/* ──────────── 状态管理 ──────────── */

// 每个引导员对应一个 Backboard assistant + thread
type GuideSession = {
    guideId: string;
    assistantId: string;
    threadId: string;
};

const guideSessions = new Map<string, GuideSession>();

// 初始化标记
let globalAssistantId: string | null = null;

/* ──────────── 工具定义 ──────────── */

const GUIDE_TOOLS = [
    {
        type: "function" as const,
        function: {
            name: "direct_residents_to_safe_point",
            description:
                "引导附近的居民前往指定的安全点。选择最合适的安全点，考虑火势方向、距离和道路通畅程度。",
            parameters: {
                type: "object",
                properties: {
                    safe_point_id: {
                        type: "string",
                        description: "目标安全点 ID，例如 's1', 's2'",
                    },
                    reason: {
                        type: "string",
                        description: "选择这个安全点的原因",
                    },
                },
                required: ["safe_point_id"],
            },
        },
    },
];

const SYSTEM_PROMPT = `你是一名山火疏散引导员 AI。你的职责是：
1. 观察火势蔓延方向和速度
2. 了解所有居民的位置和状态
3. 决定引导居民前往哪个安全点

你的目标是最大化疏散率，让尽可能多的居民安全撤离。

做决策时要考虑：
- 火势正在往哪个方向蔓延
- 哪个安全点离居民更近
- 哪个安全点的路径没有被火阻断

你必须调用 direct_residents_to_safe_point 工具来执行你的决策。
只需返回一个安全点 ID 和简短的理由。`;

/* ──────────── API 调用 ──────────── */

async function apiPost(path: string, body: unknown): Promise<unknown> {
    const response = await fetch(`${BACKBOARD_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "X-API-Key": BACKBOARD_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`[Backboard] API error: ${response.status}`, errText);
        throw new Error(`Backboard API error: ${response.status}`);
    }

    return response.json();
}

/** 创建 Assistant（只需一次） */
async function ensureAssistant(): Promise<string> {
    if (globalAssistantId) return globalAssistantId;

    const result = (await apiPost("/assistants", {
        name: "Wildfire Guide Agent",
        system_prompt: SYSTEM_PROMPT,
        tools: GUIDE_TOOLS,
    })) as { assistant_id: string };

    globalAssistantId = result.assistant_id;
    console.log(`[Backboard] Created assistant: ${globalAssistantId}`);
    return globalAssistantId;
}

/** 为引导员创建 Thread */
async function ensureThread(guideId: string): Promise<GuideSession> {
    const existing = guideSessions.get(guideId);
    if (existing) return existing;

    const assistantId = await ensureAssistant();

    const result = (await apiPost(`/assistants/${assistantId}/threads`, {})) as {
        thread_id: string;
    };

    const session: GuideSession = {
        guideId,
        assistantId,
        threadId: result.thread_id,
    };

    guideSessions.set(guideId, session);
    console.log(`[Backboard] Created thread for guide ${guideId}: ${result.thread_id}`);
    return session;
}

/* ──────────── 构建状态消息 ──────────── */

function buildStateMessage(
    guide: Agent,
    agents: Agent[],
    scenario: Scenario,
    fireCells: FireCell[],
    tick: number
): string {
    const residents = agents.filter((a) => a.kind === "resident");
    const aliveResidents = residents.filter((a) => a.status !== "dead");
    const safeResidents = residents.filter((a) => a.status === "safe");
    const movingResidents = residents.filter(
        (a) => a.status === "moving" || a.status === "idle"
    );

    const fireInfo =
        fireCells.length > 0
            ? `火势已扩散到 ${fireCells.length} 个格子。最高强度：${Math.max(
                ...fireCells.map((f) => f.intensity)
            )}。`
            : "暂无火势。";

    const safePointsInfo = scenario.safePoints
        .map((sp) => `  - ${sp.id}: 位置 [${sp.lng.toFixed(4)}, ${sp.lat.toFixed(4)}]`)
        .join("\n");

    const residentsSummary = movingResidents
        .slice(0, 10) // 限制数量避免太长
        .map(
            (r) =>
                `  - ${r.id}: 位置 [${r.lng.toFixed(4)}, ${r.lat.toFixed(4)}], 状态: ${r.status}`
        )
        .join("\n");

    return `
[Tick ${tick}] 当前疏散状况报告：

引导员位置：[${guide.lng.toFixed(4)}, ${guide.lat.toFixed(4)}]

火势：${fireInfo}

安全点：
${safePointsInfo}

居民状况：
- 总数: ${residents.length}
- 存活: ${aliveResidents.length}
- 已安全: ${safeResidents.length}
- 仍在移动: ${movingResidents.length}

正在移动的居民：
${residentsSummary || "  (无)"}

请分析局势，决定引导居民前往哪个安全点。
`.trim();
}

/* ──────────── 主入口 ──────────── */

/** 每 N tick 调用：获取所有引导员的 AI 决策 */
export async function getGuideDecisions(
    agents: Agent[],
    scenario: Scenario,
    fireCells: FireCell[],
    tick: number
): Promise<GuideDecision[]> {
    // 如果没有 API key，返回空（退化为无 AI 模式）
    if (!BACKBOARD_API_KEY) {
        return [];
    }

    const guides = agents.filter(
        (a) => a.kind === "guide" && a.status !== "dead" && a.status !== "safe"
    );

    const decisions: GuideDecision[] = [];

    // 并行请求所有引导员的 AI 决策
    const results = await Promise.allSettled(
        guides.map((guide) =>
            getGuideDecision(guide, agents, scenario, fireCells, tick)
                .then((decision) => {
                    if (decision) {
                        return decision;
                    }
                    return null;
                })
                .catch((err) => {
                    console.error(`[Backboard] Guide ${guide.id} decision error:`, err);
                    if (scenario.safePoints.length > 0) {
                        return {
                            guideId: guide.id,
                            targetSafePointId: scenario.safePoints[0].id,
                            reason: "AI 不可用，使用默认安全点",
                        } as GuideDecision;
                    }
                    return null;
                })
        )
    );

    for (const res of results) {
        if (res.status === "fulfilled" && res.value) {
            decisions.push(res.value);
        }
    }

    return decisions;
}

/** 获取单个引导员的 AI 决策 */
async function getGuideDecision(
    guide: Agent,
    agents: Agent[],
    scenario: Scenario,
    fireCells: FireCell[],
    tick: number
): Promise<GuideDecision | null> {
    const session = await ensureThread(guide.id);
    const message = buildStateMessage(guide, agents, scenario, fireCells, tick);

    // 发消息给 AI
    const response = (await apiPost(`/threads/${session.threadId}/messages`, {
        content: message,
        stream: false,
    })) as {
        status?: string;
        content?: string;
        tool_calls?: Array<{
            id: string;
            function: {
                name: string;
                parsed_arguments?: Record<string, string>;
                arguments?: string;
            };
        }>;
        run_id?: string;
    };

    // 如果 AI 要调用工具
    if (response.status === "REQUIRES_ACTION" && response.tool_calls) {
        for (const tc of response.tool_calls) {
            if (tc.function.name === "direct_residents_to_safe_point") {
                const args =
                    tc.function.parsed_arguments ??
                    JSON.parse(tc.function.arguments ?? "{}");

                const decision: GuideDecision = {
                    guideId: guide.id,
                    targetSafePointId: args.safe_point_id,
                    reason: args.reason,
                };

                console.log(
                    `[Backboard] Guide ${guide.id} → 引导居民去 ${decision.targetSafePointId}：${decision.reason}`
                );

                // 提交工具结果
                await apiPost(`/threads/${session.threadId}/tool-outputs`, {
                    run_id: response.run_id,
                    tool_outputs: [
                        {
                            tool_call_id: tc.id,
                            output: JSON.stringify({
                                success: true,
                                message: `已开始引导居民前往安全点 ${decision.targetSafePointId}`,
                            }),
                        },
                    ],
                });

                return decision;
            }
        }
    }

    // AI 没有调用工具，返回 null
    console.log(`[Backboard] Guide ${guide.id}: AI 返回文本回复（无动作）`);
    return null;
}

/** 重置所有 session（新模拟时调用） */
export function resetGuideSessions(): void {
    guideSessions.clear();
    globalAssistantId = null;
    console.log("[Backboard] 重置所有引导员 session 和全局 Assistant");
}
