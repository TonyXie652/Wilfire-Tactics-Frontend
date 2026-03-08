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

  // 外描边层（深色轮廓）
  const outline = new PathLayer<RoadEdgeDatum>({
    id: "roads-outline",
    data: normalData,
    getPath: (d) => d.path,
    widthUnits: "meters",
    getWidth: () => 7,
    getColor: () => [110, 120, 110, 255],
    parameters: ({ depthTest: false } as any),
    billboard: true,
    capRounded: true,
    jointRounded: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [59, 130, 246, 120],
    onClick: (info) => handleClick({ object: info.object as RoadEdgeDatum | null }),
  });

  // 道路底色层（略白的灰色，代表路面）
  const roadBase = new PathLayer<RoadEdgeDatum>({
    id: "roads-base",
    data: normalData,
    getPath: (d) => d.path,
    widthUnits: "meters",
    getWidth: () => 5,
    getColor: () => [235, 238, 235, 255],
    parameters: ({ depthTest: false } as any),
    billboard: true,
    capRounded: true,
    jointRounded: true,
    pickable: false,
  });

  // 中间绿色小方格层（安全撤离通道标识）
  const centerDash = new PathLayer<RoadEdgeDatum>({
    id: "roads-center-dash",
    data: normalData,
    getPath: (d: RoadEdgeDatum) => d.path,
    widthUnits: "meters",
    getWidth: () => 2,
    getColor: () => [74, 210, 120, 255],
    parameters: ({ depthTest: false } as any),
    billboard: true,
    capRounded: false,
    jointRounded: false,
    pickable: false,
    extensions: [new PathStyleExtension({ dash: true })],
    getDashArray: () => [4, 4] as [number, number],
    dashJustified: false,
    dashGapPickable: false,
  } as any);

  // 路障层（黄底 + 黑色条纹，模拟现实路障）
  const blockedOutline = new PathLayer<RoadEdgeDatum>({
    id: "roads-blocked-outline",
    data: blockedData,
    getPath: (d) => d.path,
    widthUnits: "meters",
    getWidth: () => 10,
    getColor: () => [30, 30, 30, 255],
    parameters: ({ depthTest: false } as any),
    billboard: true,
    capRounded: true,
    jointRounded: true,
    pickable: true,
    onClick: (info) => handleClick({ object: info.object as RoadEdgeDatum | null }),
  });

  const blockedBase = new PathLayer<RoadEdgeDatum>({
    id: "roads-blocked-base",
    data: blockedData,
    getPath: (d) => d.path,
    widthUnits: "meters",
    getWidth: () => 7,
    getColor: () => [255, 200, 0, 255],
    parameters: ({ depthTest: false } as any),
    billboard: true,
    capRounded: true,
    jointRounded: true,
    pickable: true,
    onClick: (info) => handleClick({ object: info.object as RoadEdgeDatum | null }),
  });

  const blockedStripes = new PathLayer<RoadEdgeDatum>({
    id: "roads-blocked-stripes",
    data: blockedData,
    getPath: (d: RoadEdgeDatum) => d.path,
    widthUnits: "meters",
    getWidth: () => 5,
    getColor: () => [20, 20, 20, 220],
    parameters: ({ depthTest: false } as any),
    billboard: true,
    capRounded: false,
    jointRounded: false,
    pickable: false,
    extensions: [new PathStyleExtension({ dash: true })],
    getDashArray: () => [6, 6] as [number, number],
    dashJustified: false,
    dashGapPickable: false,
  } as any);

  return [outline, roadBase, centerDash, blockedOutline, blockedBase, blockedStripes];
}
