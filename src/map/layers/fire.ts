import { ScatterplotLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { FireCell } from "../../app/types";

type Options = {
  visible?: boolean;
  pickable?: boolean;
  onPickFireCell?: (cell: FireCell) => void;
  pulseRatio?: number; 
};

/**
 * 优化后的颜色逻辑：
 * 1. 降低了最高强度的 Alpha 值，确保火区具有通透感。
 * 2. 采用了阶梯式的透明度：强度越高，颜色越深，但始终保持透明。
 */
function getFireCoreColor(intensity: number): [number, number, number, number] {
  if (intensity <= 0) return [0, 0, 0, 0];
  
  // 强度 1：亮橙黄 (Alpha: 140) - 比较轻盈
  if (intensity === 1) return [255, 200, 50, 140]; 
  
  // 强度 2：鲜橙色 (Alpha: 160)
  if (intensity === 2) return [255, 120, 0, 160];  
  
  // 强度 3：深红色 (Alpha: 175)
  if (intensity === 3) return [210, 30, 0, 175];   
  
  // 强度 4：极深红 (Alpha: 190) - 依然保留约 25% 的透明空间
  return [150, 0, 0, 190]; 
}

function getFireCoreRadius(intensity: number, baseSize: number): number {
  if (intensity >= 4) return baseSize * 0.75; 
  if (intensity === 3) return baseSize * 0.55; 
  if (intensity === 2) return baseSize * 0.45; 
  if (intensity === 1) return baseSize * 0.35; 
  return 0;
}

function getCellCenter(position: [number, number]): [number, number] {
  const [lng, lat] = position;
  // 依然保留微调偏移，确保圆心对齐
  return [lng + 0.00055, lat + 0.00022];
}

export function makeFireLayer(
  fireCells: FireCell[],
  opts: Options = {}
): Layer[] {
  const {
    visible = true,
    pickable = true,
    onPickFireCell,
    pulseRatio = 1.0, 
  } = opts;

  const cellSize = fireCells.length > 0 ? fireCells[0].size : 80;
  const activeFireCells = fireCells.filter((c) => c.intensity > 0);

  const fireLayer = new ScatterplotLayer<FireCell>({
    id: "fire-scatterplot-tactical-v2",
    data: activeFireCells,
    visible,
    pickable,

    getPosition: (d) => getCellCenter(d.position),
    getFillColor: (d) => getFireCoreColor(d.intensity),
    getRadius: (d) => getFireCoreRadius(d.intensity, cellSize) * pulseRatio,
    
    radiusUnits: 'meters',
    stroked: false,

    autoHighlight: true,
    highlightColor: [255, 255, 255, 150],

    onClick: (info) => {
      if (info.object && onPickFireCell) onPickFireCell(info.object);
    },

    parameters: {
      depthWriteEnabled: false,
      depthCompare: "always",
      blend: true,
      // 使用标准混合，透明度生效的关键
    } as any,

    updateTriggers: {
      getRadius: [pulseRatio, activeFireCells.map(c => c.intensity)],
      getFillColor: [activeFireCells.map(c => c.intensity)],
    },
  });

  return [fireLayer];
}