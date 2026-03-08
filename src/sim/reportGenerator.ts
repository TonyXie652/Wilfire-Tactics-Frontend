// src/sim/reportGenerator.ts
// AI 报告生成模块 — 模拟结束后用 Backboard 生成分析报告

import type { SimulationMetrics, SimulationReport } from "./evaluation";
import { formatMetricsSummary, getGrade } from "./evaluation";
import { formatDecisionLog, getDecisionLog } from "./decisionLog";
import { BACKBOARD_BASE_URL, BACKBOARD_ENABLED } from "../app/api";

/* ──────────── API 调用 ──────────── */

async function apiPost(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${BACKBOARD_BASE_URL}${path}`, {
        method: "POST",
        headers: {
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

const REPORT_SYSTEM_PROMPT = `You are an expert analyst for wildfire evacuation simulations. The user will provide complete data from a simulation run (evacuation rate, casualty rate, guide decision logs, etc.).

You need to do two things:
1. **Analysis**: In 2-3 paragraphs, analyze the simulation results. Include:
   - Overall performance assessment
   - Whether the guides' decisions were reasonable
   - Key factors that influenced the outcome (fire direction, resident placement, safe point selection, etc.)

2. **Suggestions**: Provide 2-3 specific, actionable recommendations to help the user improve the evacuation rate in the next simulation.

Respond in English. Be concise and professional.`;

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
Below is the complete data from a wildfire evacuation simulation. Please analyze and provide improvement suggestions.

${metricsSummary}

Grade: ${grade.grade} — ${grade.label}

AI Guide Decision Log (${decisionLog.length} decisions total):
${decisionHistory}

Please analyze the results of this simulation and provide improvement suggestions.
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
    // 没有本地代理 → 返回纯数据报告
    if (!BACKBOARD_ENABLED) {
        console.log("[Report] Local Backboard agent unavailable, generating data-only report");
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
        console.log("[Report] Sending report request to AI...");

        const response = (await apiPost(`/threads/${threadId}/messages`, {
            content: message,
            stream: false,
        })) as {
            content?: string;
            status?: string;
        };

        // 解析 AI 回复
        const aiText = response.content ?? "";
        console.log("[Report] AI analysis complete");

        // 尝试提取建议（简单按数字列表分割）
        const suggestions = extractSuggestions(aiText);

        return {
            metrics,
            aiAnalysis: aiText,
            aiSuggestions: suggestions,
            generatedAt: new Date().toISOString(),
        };
    } catch (err) {
        console.error("[Report] AI report generation failed:", err);
        return {
            metrics,
            aiAnalysis: "AI analysis unavailable (API call failed)",
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
        parts.push("=== AI Analysis ===");
        parts.push(report.aiAnalysis);
        parts.push("");
    }

    if (report.aiSuggestions.length > 0) {
        parts.push("=== Improvement Suggestions ===");
        report.aiSuggestions.forEach((s, i) => {
            parts.push(`${i + 1}. ${s}`);
        });
    }

    parts.push("");
    parts.push(`Report generated at: ${report.generatedAt}`);

    return parts.join("\n");
}
