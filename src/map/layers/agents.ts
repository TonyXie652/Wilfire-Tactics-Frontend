// src/map/layers/agents.ts
import { ScatterplotLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { Agent } from "../../app/types";

type Options = {
  selectedAgentId?: string | null;
  onPickAgent?: (agentId: string) => void;

  /** 像素半径下限，避免缩放时变得太小 */
  radiusMinPixels?: number;
  /** 基础半径（米），会随 zoom 变化，搭配 radiusMinPixels 使用 */
  baseRadiusMeters?: number;
};

export function makeAgentsLayer(agents: Agent[], opts: Options = {}): Layer {
  const {
    selectedAgentId = null,
    onPickAgent,
  } = opts;

  // 简单的颜色策略（RGBA）
  const colorResident: [number, number, number, number] = [37, 99, 235, 230]; // 蓝
  const colorGuide: [number, number, number, number] = [16, 185, 129, 235];   // 绿
  const colorTruck: [number, number, number, number] = [245, 158, 11, 235];   // 橙
  const colorSelected: [number, number, number, number] = [168, 85, 247, 245];// 紫

  return new ScatterplotLayer<Agent>({
    id: "agents",
    data: agents,
    getPosition: (d) => [d.lng, d.lat, 5],

    radiusUnits: "meters",
    getRadius: (d) => (d.kind === "guide" ? 30 : d.kind === "truck" ? 40 : 20),
    radiusMinPixels: 4,

    getFillColor: (d) => {
      if (selectedAgentId && d.id === selectedAgentId) return colorSelected;
      if (d.kind === "guide") return colorGuide;
      if (d.kind === "truck") return colorTruck;
      return colorResident;
    },

    stroked: true,
    getLineColor: () => [255, 255, 255, 200],
    lineWidthMinPixels: 1,

    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 80],

    // 减少缩放时闪烁
    parameters: ({ depthTest: false, depthMask: false } as any),

    onClick: (info) => {
      const obj = info.object as Agent | null;
      if (!obj) return;
      onPickAgent?.(obj.id);
    },
  });
}