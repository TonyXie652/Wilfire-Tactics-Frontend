// src/sim/reportGenerator.ts
// AI 报告生成模块 — 模拟结束后用 Backboard 生成分析报告

import type { SimulationMetrics, SimulationReport } from "./evaluation";
import { formatMetricsSummary, getGrade } from "./evaluation";
import { formatDecisionLog, getDecisionLog } from "./decisionLog";
import { BACKBOARD_API_KEY, BACKBOARD_BASE_URL } from "../app/api";

/* ──────────── API 调用 ──────────── */

async function apiPost(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${BACKBOARD_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "X-API-Key": BACKBOARD_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        throw new Error(`Backboard API error: ${res.status}`);
    }
    return res.json();
}

/* ──────────── 报告用的 Assistant ──────────── */

let reportAssistantId: string | null = null;

const REPORT_SYSTEM_PROMPT = `你是一个山火疏散模拟的分析专家。用户会给你一次模拟的完整数据（撤离率、死亡率、引导员决策记录等）。

你需要做两件事：
1. **分析**：用 2-3 段话分析这次模拟的结果。包括：
   - 整体表现如何
   - 引导员的决策是否合理
   - 哪些关键因素影响了结果（火势方向、居民位置、安全点选择等）

2. **建议**：给出 2-3 条具体的改进建议，帮助用户在下一次模拟中提高撤离率。

用中文回答，简洁专业。`;

async function ensureReportAssistant(): Promise<string> {
    if (reportAssistantId) return reportAssistantId;

    const result = (await apiPost("/assistants", {
        name: "Wildfire Report Analyst",
        system_prompt: REPORT_SYSTEM_PROMPT,
        tools: [],
    })) as { assistant_id: string };

    reportAssistantId = result.assistant_id;
    return reportAssistantId;
}

/* ──────────── 构建报告消息 ──────────── */

function buildReportMessage(metrics: SimulationMetrics): string {
    const grade = getGrade(metrics.evacuationRate);
    const metricsSummary = formatMetricsSummary(metrics);
    const decisionHistory = formatDecisionLog();
    const decisionLog = getDecisionLog();

    return `
以下是一次山火疏散模拟的完整数据，请分析并给出改进建议。

${metricsSummary}

评级: ${grade.grade} — ${grade.label}

AI 引导员决策记录 (共 ${decisionLog.length} 次决策):
${decisionHistory}

请分析这次模拟的结果，并给出改进建议。
`.trim();
}

/* ──────────── 主入口 ──────────── */

/**
 * 生成 AI 分析报告
 *
 * @param metrics 模拟评估指标
 * @returns SimulationReport（包含 AI 分析文本和建议）
 */
export async function generateReport(
    metrics: SimulationMetrics
): Promise<SimulationReport> {
    // 没有 API key → 返回纯数据报告
    if (!BACKBOARD_API_KEY) {
        console.log("[Report] 无 Backboard API key，生成纯数据报告");
        return {
            metrics,
            aiAnalysis: null,
            aiSuggestions: [],
            generatedAt: new Date().toISOString(),
        };
    }

    try {
        const assistantId = await ensureReportAssistant();

        // 创建新 thread
        const threadResult = (await apiPost(
            `/assistants/${assistantId}/threads`,
            {}
        )) as { thread_id: string };

        const threadId = threadResult.thread_id;

        // 发送报告消息
        const message = buildReportMessage(metrics);
        console.log("[Report] 发送报告请求给 AI...");

        const response = (await apiPost(`/threads/${threadId}/messages`, {
            content: message,
            stream: false,
        })) as {
            content?: string;
            status?: string;
        };

        // 解析 AI 回复
        const aiText = response.content ?? "";
        console.log("[Report] AI 分析完成");

        // 尝试提取建议（简单按数字列表分割）
        const suggestions = extractSuggestions(aiText);

        return {
            metrics,
            aiAnalysis: aiText,
            aiSuggestions: suggestions,
            generatedAt: new Date().toISOString(),
        };
    } catch (err) {
        console.error("[Report] AI 报告生成失败:", err);
        return {
            metrics,
            aiAnalysis: "AI 分析不可用（API 调用失败）",
            aiSuggestions: [],
            generatedAt: new Date().toISOString(),
        };
    }
}

/**
 * 从 AI 文本中提取建议列表
 */
function extractSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    const lines = text.split("\n");

    for (const line of lines) {
        const trimmed = line.trim();
        // 匹配 "1. xxx" 或 "- xxx" 格式的建议
        const match = trimmed.match(/^(?:\d+[\.\)、]|\-|\*)\s*(.+)/);
        if (match && match[1].length > 5) {
            suggestions.push(match[1]);
        }
    }

    return suggestions.slice(0, 5); // 最多 5 条
}

/**
 * 格式化报告为纯文本（可导出）
 */
export function formatReportText(report: SimulationReport): string {
    const parts: string[] = [
        formatMetricsSummary(report.metrics),
        "",
    ];

    if (report.aiAnalysis) {
        parts.push("=== AI 分析 ===");
        parts.push(report.aiAnalysis);
        parts.push("");
    }

    if (report.aiSuggestions.length > 0) {
        parts.push("=== 改进建议 ===");
        report.aiSuggestions.forEach((s, i) => {
            parts.push(`${i + 1}. ${s}`);
        });
    }

    parts.push("");
    parts.push(`报告生成时间: ${report.generatedAt}`);

    return parts.join("\n");
}
