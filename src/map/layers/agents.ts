// src/map/layers/agents.ts
import { ScatterplotLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { Agent } from "../../app/types";

/** 引导员影响范围（米） — 和 agentEngine.ts 的 GUIDE_INFLUENCE_RADIUS 保持一致 */
const GUIDE_INFLUENCE_RADIUS_METERS = 30;

type Options = {
  selectedAgentId?: string | null;
  onPickAgent?: (agentId: string) => void;
  /** 双击引导员回调 */
  onDoubleClickAgent?: (agentId: string) => void;
  /** 当前时间戳，用来驱动脉冲动画 */
  timeMs?: number;
};

// 双击检测
let lastClickId = "";
let lastClickTime = 0;

export function makeAgentsLayer(agents: Agent[], opts: Options = {}): Layer[] {
  const {
    selectedAgentId = null,
    onPickAgent,
    onDoubleClickAgent,
    timeMs = 0,
  } = opts;

  // ─── 颜色策略 ───
  const colorResident: [number, number, number, number] = [37, 99, 235, 230];
  const colorResidentDead: [number, number, number, number] = [120, 120, 120, 150];
  const colorResidentSafe: [number, number, number, number] = [34, 197, 94, 230];
  const colorGuide: [number, number, number, number] = [16, 185, 129, 235];
  const colorTruck: [number, number, number, number] = [245, 158, 11, 235];
  const colorSelected: [number, number, number, number] = [168, 85, 247, 245];
  const colorRoadblock: [number, number, number, number] = [156, 163, 175, 235];

  // ─── 引导员影响范围脉冲环 ───
  const guides = agents.filter((a) => a.kind === "guide" && a.status !== "dead");
  const pulseT = (timeMs % 2000) / 2000;

  const guideRangeOuter = new ScatterplotLayer<Agent>({
    id: "guide-range-outer",
    data: guides,
    getPosition: (d) => [d.lng, d.lat, 2],
    radiusUnits: "meters",
    getRadius: () => GUIDE_INFLUENCE_RADIUS_METERS,
    radiusMinPixels: 20,
    filled: true,
    getFillColor: () => [16, 185, 129, 20],
    stroked: true,
    getLineColor: () => [16, 185, 129, 60],
    lineWidthUnits: "pixels",
    getLineWidth: () => 1.5,
    pickable: false,
    parameters: { depthTest: false } as any,
    updateTriggers: {
      getPosition: agents.filter((a) => a.kind === "guide").map((a) => `${a.lng},${a.lat}`),
    },
  });

  const guideRangePulse = new ScatterplotLayer<Agent>({
    id: "guide-range-pulse",
    data: guides,
    getPosition: (d) => [d.lng, d.lat, 2],
    radiusUnits: "meters",
    getRadius: () => GUIDE_INFLUENCE_RADIUS_METERS * (0.3 + 0.7 * pulseT),
    radiusMinPixels: 8,
    filled: false,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: () => 2,
    getLineColor: () => {
      const alpha = Math.round(120 * (1 - pulseT));
      return [16, 185, 129, alpha];
    },
    pickable: false,
    parameters: { depthTest: false } as any,
    updateTriggers: {
      getRadius: timeMs,
      getLineColor: timeMs,
      getPosition: agents.filter((a) => a.kind === "guide").map((a) => `${a.lng},${a.lat}`),
    },
  });

  // ─── Agent 点（支持拖拽引导员） ───
  const agentDots = new ScatterplotLayer<Agent>({
    id: "agents",
    data: agents,
    getPosition: (d: Agent) => [d.lng, d.lat, 5],

    radiusUnits: "meters",
    getRadius: (d: Agent) => {
      if (d.status === "dead") return 6;
      if (d.status === "safe") return 8;
      if (d.kind === "roadblock") return 25;
      return d.kind === "guide" ? 18 : d.kind === "truck" ? 25 : 10;
    },
    radiusMinPixels: 3,

    getFillColor: (d: Agent) => {
      if (selectedAgentId && d.id === selectedAgentId) return colorSelected;
      if (d.status === "dead") return colorResidentDead;
      if (d.status === "safe") return colorResidentSafe;
      if (d.kind === "guide") return colorGuide;
      if (d.kind === "truck") return colorTruck;
      if (d.kind === "roadblock") return colorRoadblock;
      return colorResident;
    },

    stroked: true,
    getLineColor: (d: Agent) => {
      if (d.followingGuideId) return [16, 185, 129, 255];
      return [255, 255, 255, 200];
    },
    lineWidthMinPixels: 1,
    getLineWidth: (d: Agent) => (d.followingGuideId ? 3 : 1),
    lineWidthUnits: "pixels" as const,

    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 80],

    parameters: { depthTest: false, depthMask: false } as any,

    updateTriggers: {
      getFillColor: [selectedAgentId, agents.map((a) => a.status)],
      getLineColor: agents.map((a) => a.followingGuideId),
      getRadius: agents.map((a) => a.status),
      getPosition: agents.map((a) => `${a.lng},${a.lat}`),
    },

    onClick: (info: any) => {
      const obj = info.object as Agent | null;
      if (!obj) return;

      const now = Date.now();
      if (obj.id === lastClickId && now - lastClickTime < 400) {
        // 双击 → 撤离对话框
        onDoubleClickAgent?.(obj.id);
        lastClickId = "";
        lastClickTime = 0;
      } else {
        // 单击 → 选中/取消
        onPickAgent?.(obj.id);
        lastClickId = obj.id;
        lastClickTime = now;
      }
    },
  } as any);

  return [guideRangeOuter, guideRangePulse, agentDots];
}