import { ScatterplotLayer } from "@deck.gl/layers";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import type { Layer } from "@deck.gl/core";
import type { FireCell } from "../../app/types";
import { GL } from "@luma.gl/constants";
import { GLTFLoader } from "@loaders.gl/gltf";

type Options = {
  visible?: boolean;
  pickable?: boolean;
  onPickFireCell?: (cell: FireCell) => void;
  pulseRatio?: number;
};

const FIRE_MODEL_URL = "/models/fire.glb";

// 1. 颜色计算：调整亮度和 Alpha 值，使用更明亮的颜色
function getFireCoreColor(intensity: number): [number, number, number, number] {
  if (intensity <= 0) return [0, 0, 0, 0];
  if (intensity === 1) return [255, 180, 50, 200]; 
  if (intensity === 2) return [255, 100, 0, 220];  
  if (intensity === 3) return [255, 60, 0, 255];   
  return [255, 0, 0, 255]; // 核心区明亮红色
}

// 2. 伪随机位置：增加高度偏移 (Z 轴)，解决闪烁
function getJitteredPosition(position: [number, number], id: string, amount: number): [number, number, number] {
  const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const offsetLng = (Math.sin(seed) * amount);
  const offsetLat = (Math.cos(seed) * amount);
  const [lng, lat] = position;
  // 【关键】：调整 Z 轴偏移方向。负数在 Deck.gl 中代表向上（远离地表，拉近镜头）
  const offsetZ = (4 + (seed % 10) * 20);
  return [lng + 0.00055 + offsetLng, lat + 0.00022 + offsetLat, offsetZ];
}

export function makeFireLayer(fireCells: FireCell[], opts: Options = {}): Layer[] {
  const { visible = true, pickable = true, onPickFireCell, pulseRatio = 1.0 } = opts;
  const cellSize = fireCells.length > 0 ? fireCells[0].size : 120; // 增大基础 CellSize
  const activeFireCells = fireCells.filter((c) => c.intensity > 0);

  // 1. 底座圆圈：给底层圆圈也加上微小的高度偏移，防止重叠面积相同的圆出现互相闪烁 (Z-Fighting)
  const fireBaseLayer = new ScatterplotLayer<FireCell>({
    id: "fire-base-layer",
    data: activeFireCells,
    visible,
    // 将 2D 圆的位置也像模型一样根据 ID 生成一个极小的 Z 轴偏移
    getPosition: (d) => {
      const seed = d.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const offsetZ = -(seed % 10) * 0.05; // 稍微下沉一点，避免挡住最上面的火焰 3D 层
      return [d.position[0] + 0.00055, d.position[1] + 0.00022, offsetZ];
    },
    getFillColor: (d) => getFireCoreColor(d.intensity),
    // 【解决面积过大】：缩小半径系数，之前是 0.4 + intensity * 0.2，现在改小一倍
    getRadius: (d) => cellSize * (0.2 + d.intensity * 0.1) * pulseRatio,
    radiusUnits: 'meters',

    // 【解决闪烁与横纹】：
    parameters: {
      depthWrite: false, 
      depthTest: true,
      blend: true,
      blendEquation: GL.FUNC_ADD,
      // 基础圆圈使用 Alpha 混合
      blendFunc: [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA]
    } as any,
  });

  // 2. 3D 模型层
  const fireModelLayer = new ScenegraphLayer<FireCell>({
    id: "fire-3d-models",
    // 【解决卡顿和太密集】：只给最核心的火（强度 4）渲染 3D 模型，或者增加一个取余数过滤
    data: activeFireCells.filter(d => d.intensity >= 4),
    visible,
    scenegraph: FIRE_MODEL_URL,
    loaders: [GLTFLoader],

    // 增加高度偏移 Z
    getPosition: (d) => getJitteredPosition(d.position, d.id, 0.0003),

    // 缩放倍数
    getScale: () => {
      const baseScale = 30; // 统一缩放大小
      const s = baseScale * pulseRatio;
      return [s, s, s];
    },

    // 不再使用 getColor 强行上色，让模型保持自己本身的贴图/材质颜色
    // getColor: (d) => getFireCoreColor(d.intensity),

    _animations: { '*': { playing: true } },
    _lighting: 'flat', // 使用 flat 恢复模型的原本的高亮发光感，pbr 会让没有环境光的模型变黑

    pickable,
    onClick: (info) => { if (info.object && onPickFireCell) onPickFireCell(info.object) },

    // 【关键修复】：
    parameters: {
      depthWrite: false,
      // 关闭深度测试，或者调整渲染顺序，让 3D 模型永远在底座圆圈之上渲染
      depthTest: false, 
      blend: true,
      blendEquation: GL.FUNC_ADD,
      // 恢复轻微的加法混合，让火焰更亮，但为了不过曝，采用 SRC_ALPHA 控制
      blendFunc: [GL.SRC_ALPHA, GL.ONE, GL.ONE, GL.ONE]
    } as any,

    updateTriggers: { getScale: [pulseRatio] }
  });

  return [fireBaseLayer, fireModelLayer];
}