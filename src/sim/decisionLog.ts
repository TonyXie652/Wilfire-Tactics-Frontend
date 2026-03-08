// src/sim/decisionLog.ts
// 决策日志模块 — 记录引导员 AI 的每次决策，供 UI 展示或导出

import type { GuideDecision } from "../app/types";

/* ──────────── 类型 ──────────── */

export type DecisionEntry = {
    tick: number;
    guideId: string;
    targetSafePointId: string;
    reason: string;
    timestamp: number; // Date.now()
};

/* ──────────── 日志存储 ──────────── */

let decisionLog: DecisionEntry[] = [];

/**
 * 记录一批引导员决策（每次 Backboard 返回后调用）
 */
export function logDecisions(
    decisions: GuideDecision[],
    tick: number
): void {
    const now = Date.now();

    for (const d of decisions) {
        decisionLog.push({
            tick,
            guideId: d.guideId,
            targetSafePointId: d.targetSafePointId,
            reason: d.reason ?? "No reason provided",
            timestamp: now,
        });
    }
}

/**
 * 获取所有决策记录
 */
export function getDecisionLog(): DecisionEntry[] {
    return [...decisionLog];
}

/**
 * 获取最新 N 条决策
 */
export function getLatestDecisions(n = 5): DecisionEntry[] {
    return decisionLog.slice(-n);
}

/**
 * 获取指定引导员的所有决策
 */
export function getDecisionsByGuide(guideId: string): DecisionEntry[] {
    return decisionLog.filter((d) => d.guideId === guideId);
}

/**
 * 清空日志（重置模拟时调用）
 */
export function clearDecisionLog(): void {
    decisionLog = [];
}

/**
 * 格式化决策日志为文本
 */
export function formatDecisionLog(): string {
    if (decisionLog.length === 0) return "No AI decisions recorded yet";

    return decisionLog
        .map(
            (d) =>
                `[Tick ${d.tick}] Guide ${d.guideId} → Safe Point ${d.targetSafePointId}\n         Reason: ${d.reason}`
        )
        .join("\n\n");
}

/**
 * 导出决策日志为 JSON（可保存到文件）
 */
export function exportDecisionLogJSON(): string {
    return JSON.stringify(decisionLog, null, 2);
}
