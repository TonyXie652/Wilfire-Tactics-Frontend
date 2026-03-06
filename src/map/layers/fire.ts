import { GridCellLayer } from "@deck.gl/layers";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import type { Layer } from "@deck.gl/core";
import type { FireCell } from "../../app/types";

type Options = {
  visible?: boolean;
  pickable?: boolean;
  onPickFireCell?: (cell: FireCell) => void;
};

function getFireColor(intensity: number): [number, number, number, number] {
  if (intensity <= 0) return [0, 0, 0, 0];
  if (intensity === 1) return [255, 220, 0, 100];
  if (intensity === 2) return [255, 140, 0, 130];
  if (intensity === 3) return [255, 60, 0, 160];
  return [180, 0, 0, 190];
}

function getFireElevation(intensity: number): number {
  if (intensity <= 0) return 0;
  if (intensity === 1) return 7;
  if (intensity === 2) return 14;
  if (intensity === 3) return 20;
  return 60;
}

// 你的 fire cell position 更像格子左下角，所以往中心挪一点
function getCellCenter(position: [number, number]): [number, number] {
  const [lng, lat] = position;

  // 如果后面发现偏左/偏下，再继续微调这两个值
  const lngOffset = 0.00055;
  const latOffset = 0.00022;

  return [lng + lngOffset, lat + latOffset];
}

function getFireModelScale(intensity: number): number {
  if (intensity >= 4) return 13;
  if (intensity === 3) return 10;
  if (intensity === 2) return 7;
  return 0;
}

export function makeFireLayer(
  fireCells: FireCell[],
  opts: Options = {}
): Layer[] {
  const {
    visible = true,
    pickable = true,
    onPickFireCell,
  } = opts;

  const cellSize = fireCells.length > 0 ? fireCells[0].size : 80;

  const gridLayer = new GridCellLayer<FireCell>({
    id: "fire-grid-layer",
    data: fireCells,
    visible,
    pickable,

    extruded: true,
    cellSize,
    coverage: 0.95,

    getPosition: (d) => d.position,
    getFillColor: (d) => getFireColor(d.intensity),
    getLineColor: [255, 255, 255, 80],
    getElevation: (d) => getFireElevation(d.intensity),

    autoHighlight: true,
    highlightColor: [255, 255, 255, 80],

    onClick: (info) => {
      if (info.object && onPickFireCell) {
        onPickFireCell(info.object);
      }
    },
  });

  const flameCells = fireCells.filter((c) => c.intensity >= 3);

  const fireModelLayer = new ScenegraphLayer<FireCell>({
    id: "fire-model-layer",
    data: flameCells,
    visible,
    pickable: false,

    scenegraph: "/models/fire.glb",

    getPosition: (d) => {
      const [lng, lat] = getCellCenter(d.position);

      // 控制火焰在格子上方的高度
      const z = getFireElevation(d.intensity) + 18;

      return [lng, lat, z];
    },

    getScale: (d) => {
      const s = getFireModelScale(d.intensity);
      return [s, s, s];
    },

    // 如果模型方向不对，再改这里
    getOrientation: () => [0, 0, 90],

    
    sizeScale: 1,
    _lighting: "flat",

    _animations: {
      "*": { speed: 1 }
    },

    parameters: {
      depthWriteEnabled: true,
      depthCompare: "less-equal",
    },

    updateTriggers: {
      getScale: flameCells.map((c) => c.intensity),
      getPosition: flameCells.map((c) => c.intensity),
    },
  });

  return [gridLayer, fireModelLayer];
}