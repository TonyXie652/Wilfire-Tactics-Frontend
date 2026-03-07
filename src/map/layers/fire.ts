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
  if (intensity === 3) return [255, 60, 0, 220]; // 增加少量透明度 (从 255 降至 220)
  return [255, 0, 0, 230]; // 核心区明亮红色，但也保留一丝透明度 (从 255 降至 230)
}

// 2. 伪随机位置：增加高度偏移 (Z 轴)，解决闪烁
function getJitteredPosition(position: [number, number], id: string, amount: number): [number, number, number] {
  const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const offsetLng = (Math.sin(seed) * amount);
  const offsetLat = (Math.cos(seed) * amount);
  const [lng, lat] = position;
  // 【关键】：调整 Z 轴偏移方向。负数在 Deck.gl 中代表向上（远离地表，拉近镜头）
  const offsetZ = (2 + (seed % 10) * 10);
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

    stroked: true,
    getLineColor: (d) => {
      // 获取当前强度的颜色，保持色相但提高亮度和不透明度作为发光边缘
      const core = getFireCoreColor(d.intensity);
      // 如果火苗强度极低，就不增加刺眼的边缘了
      if (d.intensity <= 1) return [core[0], core[1], core[2], 0];
      // 对于中大火，边缘加上明黄/亮橙色的光环效果，并大幅增加透明度让边缘更柔和、不那么实心
      return [255, 220, 100, 225];
    },
    getLineWidth: 2,
    lineWidthUnits: 'pixels',

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
    // 【空间打散排列】：不再完全按随机数看天吃饭（会导致时密时疏）。
    // 我们强制要求每两个 3D 模型之间的地理坐标距离必须大于一个规定的最小间距。
    data: (() => {
      const candidates = activeFireCells.filter(d => d.intensity >= 4);
      const selected: FireCell[] = [];
      // 这个距离阈值控制着 3D 模型的最终观感密度（建议在 0.0006 - 0.001 之间）
      const MIN_MODEL_SPACING = 0.0007;

      for (const cell of candidates) {
        // 检查这个准模型和已经选中的模型是不是太近了
        const isTooClose = selected.some(s => {
          const dx = s.position[0] - cell.position[0];
          const dy = s.position[1] - cell.position[1];
          return Math.sqrt(dx * dx + dy * dy) < MIN_MODEL_SPACING;
        });

        if (!isTooClose) {
          selected.push(cell);
        }
      }
      return selected;
    })(),
    visible,
    scenegraph: FIRE_MODEL_URL,
    loaders: [GLTFLoader],

    // 增加高度偏移 Z
    getPosition: (d) => {
      const pos = getJitteredPosition(d.position, d.id, 0.0003);
      return [pos[0], pos[1], pos[2] ? pos[2] + 18 : 18];
    },

    _animations: { '*': { playing: true } },

    // 由于 Deck.gl 内置 _animations 暂不接受 DataAccessor，
    // 要打破一致性，我们可以微调一下每团火的 Y 轴（高度）缩放，
    // 不影响 X、Z 轴定位，但这会使模型在视觉上错开。
    getScale: (d) => {
      const baseScale = 30;
      const seed = d.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100;
      // 在 Y 轴向上引入 0.8 ~ 1.2 的体积方差，打破完全复制的单调感
      const randomYOffset = 0.8 + (seed / 100) * 0.4;

      const sX = baseScale * pulseRatio;
      const sY = baseScale * pulseRatio * randomYOffset;
      const sZ = baseScale * pulseRatio;
      return [sX, sY, sZ];
    },
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