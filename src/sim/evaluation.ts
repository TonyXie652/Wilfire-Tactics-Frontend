// src/sim/evaluation.ts
// 评估模块 — 纯逻辑，导出函数给 UI 层使用

import type { Agent, FireCell } from "../app/types";

/* ──────────── 类型定义 ──────────── */

/** 单次模拟的评估结果 */
export type SimulationMetrics = {
    /** 总居民数 */
    totalResidents: number;
    /** 安全到达的居民数 */
    safeCount: number;
    /** 死亡居民数 */
    deadCount: number;
    /** 仍在移动/等待的居民数 */
    activeCount: number;

    /** 撤离率 0~1 */
    evacuationRate: number;
    /** 死亡率 0~1 */
    casualtyRate: number;

    /** 平均撤离时间（tick）— 只统计安全到达的居民 */
    avgEvacuationTime: number;
    /** 最快撤离时间（tick） */
    fastestEvacuationTime: number;
    /** 最慢撤离时间（tick） */
    slowestEvacuationTime: number;

    /** 跟随引导员的居民数 */
    followedGuideCount: number;
    /** 跟随引导员且安全的居民数 */
    followedGuideSafeCount: number;
    /** 引导员跟随成功率 0~1（跟随且安全 / 跟随总数）*/
    guideEffectiveness: number;

    /** 火势最终覆盖格数 */
    finalFireCoverage: number;
    /** 火势最高强度 */
    peakFireIntensity: number;

    /** 模拟总 tick 数 */
    totalTicks: number;

    /** 模拟是否结束 */
    isComplete: boolean;
};

/** AI 分析报告 */
export type SimulationReport = {
    metrics: SimulationMetrics;
    /** AI 生成的分析文本 */
    aiAnalysis: string | null;
    /** AI 的改进建议列表 */
    aiSuggestions: string[];
    /** 报告生成时间 */
    generatedAt: string;
};

/* ──────────── 核心评估函数 ──────────── */

/**
 * 计算当前模拟的所有评估指标
 *
 * @param agents    所有 agent
 * @param fireCells 当前火势
 * @param tick      当前 tick
 * @returns SimulationMetrics
 */
export function calculateMetrics(
    agents: Agent[],
    fireCells: FireCell[],
    tick: number
): SimulationMetrics {
    const residents = agents.filter((a) => a.kind === "resident");
    const total = residents.length;

    const safe = residents.filter((a) => a.status === "safe");
    const dead = residents.filter((a) => a.status === "dead");
    const active = residents.filter(
        (a) => a.status === "moving" || a.status === "idle"
    );

    // 撤离时间统计（基于 pathHistory 长度近似）
    const evacuationTimes = safe.map((a) => a.pathHistory?.length ?? 0);
    const avgTime =
        evacuationTimes.length > 0
            ? evacuationTimes.reduce((s, t) => s + t, 0) / evacuationTimes.length
            : 0;
    const fastest =
        evacuationTimes.length > 0 ? Math.min(...evacuationTimes) : 0;
    const slowest =
        evacuationTimes.length > 0 ? Math.max(...evacuationTimes) : 0;

    // 引导员跟随统计
    const followedGuide = residents.filter((a) => a.followingGuideId);
    const followedGuideSafe = followedGuide.filter((a) => a.status === "safe");

    const isComplete = active.length === 0 && tick > 0;

    return {
        totalResidents: total,
        safeCount: safe.length,
        deadCount: dead.length,
        activeCount: active.length,

        evacuationRate: total > 0 ? safe.length / total : 0,
        casualtyRate: total > 0 ? dead.length / total : 0,

        avgEvacuationTime: Math.round(avgTime),
        fastestEvacuationTime: fastest,
        slowestEvacuationTime: slowest,

        followedGuideCount: followedGuide.length,
        followedGuideSafeCount: followedGuideSafe.length,
        guideEffectiveness:
            followedGuide.length > 0
                ? followedGuideSafe.length / followedGuide.length
                : 0,

        finalFireCoverage: fireCells.length,
        peakFireIntensity:
            fireCells.length > 0
                ? Math.max(...fireCells.map((f) => f.intensity))
                : 0,

        totalTicks: tick,
        isComplete,
    };
}

/**
 * 评估等级：根据撤离率打分
 */
export function getGrade(evacuationRate: number): {
    grade: string;
    label: string;
    color: string;
} {
    if (evacuationRate >= 0.95) return { grade: "S", label: "完美疏散", color: "#ffd700" };
    if (evacuationRate >= 0.85) return { grade: "A", label: "优秀", color: "#22c55e" };
    if (evacuationRate >= 0.7) return { grade: "B", label: "良好", color: "#3b82f6" };
    if (evacuationRate >= 0.5) return { grade: "C", label: "一般", color: "#f59e0b" };
    if (evacuationRate >= 0.3) return { grade: "D", label: "较差", color: "#ef4444" };
    return { grade: "F", label: "失败", color: "#991b1b" };
}

/**
 * 格式化指标为人类可读的文本摘要
 */
export function formatMetricsSummary(metrics: SimulationMetrics): string {
    const grade = getGrade(metrics.evacuationRate);
    const lines: string[] = [
        `=== 模拟评估报告 ===`,
        ``,
        `评级: ${grade.grade} (${grade.label})`,
        ``,
        `📊 核心指标:`,
        `  撤离率: ${(metrics.evacuationRate * 100).toFixed(1)}%`,
        `  死亡率: ${(metrics.casualtyRate * 100).toFixed(1)}%`,
        `  安全: ${metrics.safeCount} / ${metrics.totalResidents}`,
        `  死亡: ${metrics.deadCount}`,
        ``,
        `⏱ 时间:`,
        `  总耗时: ${metrics.totalTicks} ticks`,
        `  平均撤离: ${metrics.avgEvacuationTime} ticks`,
        `  最快: ${metrics.fastestEvacuationTime} ticks`,
        `  最慢: ${metrics.slowestEvacuationTime} ticks`,
        ``,
        `🟢 引导员效果:`,
        `  跟随引导员: ${metrics.followedGuideCount} 人`,
        `  跟随后安全: ${metrics.followedGuideSafeCount} 人`,
        `  引导成功率: ${(metrics.guideEffectiveness * 100).toFixed(1)}%`,
        ``,
        `🔥 火势:`,
        `  最终覆盖: ${metrics.finalFireCoverage} 格`,
        `  最高强度: ${metrics.peakFireIntensity}`,
    ];

    return lines.join("\n");
}
