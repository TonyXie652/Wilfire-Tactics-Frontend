// src/map/layers/roads.ts
import { PathLayer } from "@deck.gl/layers";
import { PathStyleExtension } from "@deck.gl/extensions";
import type { Layer } from "@deck.gl/core";
import type { Scenario } from "../../app/types";

export type RoadEdgeDatum = {
  id: string;
  path: [number, number][];
};

type Options = {
  /** 被路障封掉的道路 edgeIds（用于高亮显示） */
  roadblocks?: string[];
  /** 选中的道路 edgeId（用于高亮显示） */
  selectedEdgeId?: string | null;
  /** 点击道路回调（你可以在 App 里设置 selectedEdgeId 或发 action） */
  onPickEdge?: (edgeId: string) => void;
};

function buildEdgeData(scenario: Scenario): RoadEdgeDatum[] {
  const nodeMap = new Map(scenario.nodes.map((n) => [n.id, n] as const));

  const edges: RoadEdgeDatum[] = [];
  for (const e of scenario.edges) {
    const a = nodeMap.get(e.from);
    const b = nodeMap.get(e.to);
    if (!a || !b) continue;

    edges.push({
      id: e.id,
      path: [
        [a.lng, a.lat],
        [b.lng, b.lat],
      ],
    });
  }
  return edges;
}

export function makeRoadLayers(scenario: Scenario, opts: Options = {}): Layer[] {
  const { onPickEdge } = opts;

  const data = buildEdgeData(scenario);
  //const blockedSet = new Set(roadblocks);

  // 颜色策略（RGBA）
  //const colorMainNormal: [number, number, number, number] = [250, 250, 250, 235]; // 主线近白

  //const colorMainBlocked: [number, number, number, number] = [239, 68, 68, 235]; // 红色主线（路障）

  //const colorMainSelected: [number, number, number, number] = [96, 165, 250, 245]; // 浅蓝主线（选中）

  // 外描边层：更粗，用来保证任何底图下都清晰
  const outline = new PathLayer<RoadEdgeDatum>({
    id: "roads-outline",
    data,
    getPath: (d) => d.path,
    widthUnits: "meters",
    getWidth: () => 7,
    getColor: () => [50, 55, 65, 220],
    parameters: ({ depthTest: false } as any),
    billboard: true,

    capRounded: true,
    jointRounded: true,

    pickable: true,
    autoHighlight: true,
    highlightColor: [59, 130, 246, 120],
    onClick: (info) => {
      const obj = info.object as RoadEdgeDatum | null;
      if (!obj) return;
      onPickEdge?.(obj.id);
    },
  });

  // 主线层：稍细，让道路看起来像“系统道路”
  const main = new PathLayer<RoadEdgeDatum>({
    id: "roads-main",
    data,
    getPath: (d) => d.path,
    widthUnits: "meters",
    getWidth: () => 4,
    getColor: () => [230, 232, 235, 235],
    parameters: ({depthTest: false} as any),
    billboard: true,

    capRounded: true,
    jointRounded: true,
    
    pickable: true,
    // 主线不需要重复 onClick（outline 已经负责 pick），但保留也没问题
    onClick: (info) => {
      const obj = info.object as RoadEdgeDatum | null;
      if (!obj) return;
      onPickEdge?.(obj.id);
    },
  });

  // 疏散路线虚线层：绿色断续的中心线，模拟安全疏散标记
  const evacRouteProps = {
    id: "roads-evac-dashes",
    data,
    getPath: (d: RoadEdgeDatum) => d.path,
    widthUnits: "meters" as const,
    getWidth: 1.5,
    getColor: [34, 197, 94, 180], // 翡翠绿
    parameters: { depthTest: false },
    billboard: true,
    capRounded: false,
    jointRounded: false,

    // PathStyleExtension 提供虚线支持
    extensions: [new PathStyleExtension({ dash: true })],
    getDashArray: [6, 4], // 6 单位实线 + 4 单位间隔
    dashJustified: true,
    dashGapPickable: false,
  };
  const evacRoute = new PathLayer(evacRouteProps as any);

  return [outline, main, evacRoute];
}