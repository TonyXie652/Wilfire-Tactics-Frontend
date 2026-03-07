// src/map/layers/roads.ts
import { PathLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { Scenario } from "../../app/types";

export type RoadEdgeDatum = {
  id: string;
  path: [number, number][];
};

type Options = {
  /** 被路障封掉的道路 edgeIds */
  blockedEdges?: Set<string>;
  /** 点击道路回调 */
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
  const { blockedEdges = new Set(), onPickEdge } = opts;

  const data = buildEdgeData(scenario);
  const normalData = data.filter((d) => !blockedEdges.has(d.id));
  const blockedData = data.filter((d) => blockedEdges.has(d.id));

  const handleClick = (info: { object: RoadEdgeDatum | null }) => {
    if (!info.object) return;
    onPickEdge?.(info.object.id);
  };

  // 外描边层
  const outline = new PathLayer<RoadEdgeDatum>({
    id: "roads-outline",
    data: normalData,
    getPath: (d) => d.path,
    widthUnits: "meters",
    getWidth: () => 8,
    getColor: () => [15, 23, 42, 255],
    parameters: ({ depthTest: false } as any),
    billboard: true,
    capRounded: true,
    jointRounded: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [59, 130, 246, 120],
    onClick: (info) => handleClick({ object: info.object as RoadEdgeDatum | null }),
  });

  // 主线层
  const main = new PathLayer<RoadEdgeDatum>({
    id: "roads-main",
    data: normalData,
    getPath: (d) => d.path,
    widthUnits: "meters",
    getWidth: () => 5,
    getColor: () => [255, 255, 255, 255],
    parameters: ({ depthTest: false } as any),
    billboard: true,
    capRounded: true,
    jointRounded: true,
    pickable: true,
    onClick: (info) => handleClick({ object: info.object as RoadEdgeDatum | null }),
  });

  // 路障层（红色）
  const blockedOutline = new PathLayer<RoadEdgeDatum>({
    id: "roads-blocked-outline",
    data: blockedData,
    getPath: (d) => d.path,
    widthUnits: "meters",
    getWidth: () => 10,
    getColor: () => [180, 0, 0, 255],
    parameters: ({ depthTest: false } as any),
    billboard: true,
    capRounded: true,
    jointRounded: true,
    pickable: true,
    onClick: (info) => handleClick({ object: info.object as RoadEdgeDatum | null }),
  });

  const blockedMain = new PathLayer<RoadEdgeDatum>({
    id: "roads-blocked-main",
    data: blockedData,
    getPath: (d) => d.path,
    widthUnits: "meters",
    getWidth: () => 6,
    getColor: () => [239, 68, 68, 255],
    parameters: ({ depthTest: false } as any),
    billboard: true,
    capRounded: true,
    jointRounded: true,
    pickable: true,
    onClick: (info) => handleClick({ object: info.object as RoadEdgeDatum | null }),
  });

  return [outline, main, blockedOutline, blockedMain];
}