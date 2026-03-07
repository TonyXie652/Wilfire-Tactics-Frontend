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

export function makeAgentsLayer(agents: Agent[], opts: Options = {}): Layer[] {
  const {
    selectedAgentId = null,
    onPickAgent,
  } = opts;

  // Colour palette (RGBA)
  const colorResident: [number, number, number, number] = [37, 99, 235, 230];   // blue  — idle/moving
  const colorGuide: [number, number, number, number]    = [16, 185, 129, 235];   // green — guide
  const colorTruck: [number, number, number, number]    = [245, 158, 11, 235];   // amber — truck
  const colorSelected: [number, number, number, number] = [168, 85, 247, 245];   // purple — selected
  const colorRoadblock: [number, number, number, number]= [156, 163, 175, 235];  // grey  — roadblock
  const colorSafe: [number, number, number, number]     = [134, 239, 172, 200];  // light-green — evacuated
  const colorDead: [number, number, number, number]     = [239, 68, 68, 160];    // red (faded) — dead
  const colorPanic: [number, number, number, number]    = [251, 191, 36, 240];   // yellow — panicking

  // Hide safe agents after a moment (still render as tiny faded dot so the
  // count stays visible on screen; set alpha = 0 to fully hide)
  const visibleAgents = agents.filter((a) => a.status !== "safe");

  const dotLayer = new ScatterplotLayer<Agent>({
    id: "agents-dots",
    data: visibleAgents,
    getPosition: (d) => [d.lng, d.lat, 5],

    radiusUnits: "meters",
    getRadius: (d) => {
      if (d.kind === "guide") return 30;
      if (d.kind === "truck") return 40;
      if (d.kind === "roadblock") return 25;
      if (d.status === "dead") return 12; // shrink dead agents
      return 20; // resident
    },
    radiusMinPixels: 3,

    getFillColor: (d) => {
      if (selectedAgentId && d.id === selectedAgentId) return colorSelected;
      if (d.status === "dead") return colorDead;
      if (d.status === "safe") return colorSafe;
      if (d.kind === "guide") return colorGuide;
      if (d.kind === "truck") return colorTruck;
      if (d.kind === "roadblock") return colorRoadblock;
      // Panic: recently panickedAt — yellow flash
      if (d.panickedAt !== undefined) return colorPanic;
      return colorResident;
    },

    stroked: true,
    getLineColor: (d) => d.status === "dead" ? [0, 0, 0, 80] : [255, 255, 255, 200],
    lineWidthMinPixels: 1,

    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 80],

    // Prevent z-fighting during zoom
    parameters: ({ depthTest: false, depthMask: false } as any),

    onClick: (info) => {
      const obj = info.object as Agent | null;
      if (!obj) return;
      onPickAgent?.(obj.id);
    },
  });

  return [dotLayer] as Layer[];
}