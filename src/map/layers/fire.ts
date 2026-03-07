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
  if (intensity === 1) return [255, 180, 50, 230]; 
  if (intensity === 2) return [255, 100, 0, 245];  
  if (intensity === 3) return [255, 60, 0, 250];
  return [255, 0, 0, 255]; // 核心区完全不透明
}

// 定义一个自定义的散点图层，用来注入 GPU 着色器实现辐射光晕
class GlowScatterplotLayer<T = any> extends ScatterplotLayer<T> {
  getShaders() {
    const shaders = super.getShaders();
    return {
      ...shaders,
      inject: {
        ...shaders.inject,
        'fs:DECKGL_FILTER_COLOR': `
          // geometry.uv 范围是从 (-1, -1) 到 (1, 1)，中心点为 (0,0)
          // 计算当前像素到圆心的距离 (0.0 ~ 1.0)
          float dist = length(geometry.uv);
          // 边缘衰减：从距离中心 0.0 开始衰减，到 1.0 全透明
          color.a *= smoothstep(1.0, 0.0, dist);
        `
      }
    };
  }
}
GlowScatterplotLayer.layerName = 'GlowScatterplotLayer';

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

  // 1. 底座辐射圆圈：重写 ScatterplotLayer，使用 GPU Shader 直接渲染边缘衰减的柔和辐射层
  const fireBaseLayer = new GlowScatterplotLayer<FireCell>({
    id: "fire-base-layer",
    data: activeFireCells,
    visible,

    // 所有火圈统一放在同一个微小正高度上，不再使用随机 Z 偏移
    // 这样配合 depthWrite: false + depthTest: false，所有火圈能完美叠加，不会互相遮挡
    getPosition: (d) => [d.position[0] + 0.00055, d.position[1] + 0.00022, 0.5],

    // 单圈模式下，适当增加辐射范围
    getRadius: (d) => cellSize * (0.4 + d.intensity * 0.15) * pulseRatio * 1.5,
    radiusUnits: 'meters',

    // 我们把整体火区都填满高亮核心颜色，然后由于 shader 的作用，它的边缘会自动变成辐射光晕！
    getFillColor: (d) => getFireCoreColor(d.intensity),

    // 不再需要实心描边防闪烁，因为这是自然过度的辐射光晕
    stroked: false,

    parameters: {
      depthWrite: false,
      depthTest: false,  // 关闭深度测试！让所有火圈通过加法混合自由叠加，不互相遮挡
      blend: true,
      blendEquation: GL.FUNC_ADD,
      blendFunc: [GL.SRC_ALPHA, GL.ONE, GL.ONE, GL.ONE] // 叠加光晕，非常亮
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
    getPosition: (d) => getJitteredPosition(d.position, d.id, 0.0003),

    _animations: { '*': { playing: true } },

    // 由于 Deck.gl 内置 _animations 暂不接受 DataAccessor，
    // 要打破一致性，我们可以微调一下每团火的 Y 轴（高度）缩放，
    // 不影响 X、Z 轴定位，但这会使模型在视觉上错开。
    getScale: (d) => {
      const baseScale = 18;
      const seed = d.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100;
      // 在 Y 轴向上引入 0.8 ~ 1.2 的体积方差，打破完全复制的单调感
      const randomYOffset = 0.8 + (seed / 100) * 0.4;

      const sX = baseScale * pulseRatio;
      const sY = baseScale * pulseRatio * randomYOffset;
      const sZ = baseScale * pulseRatio;
      return [sX, sY, sZ];
    },
    _lighting: 'flat',
    opacity: 0.7, // 降低不透明度让 3D 火焰不要覆盖辐射光晕

    pickable,
    onClick: (info) => { if (info.object && onPickFireCell) onPickFireCell(info.object) },

    // 【关键修复】：
    parameters: {
      depthWrite: false,
      // 关闭深度测试，或者调整渲染顺序，让 3D 模型永远在底座圆圈之上渲染
      depthTest: false,
      blend: true,
      blendEquation: GL.FUNC_ADD,
      // 改为正常 alpha 混合，避免纯白过曝
      blendFunc: [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA]
    } as any,

    updateTriggers: { getScale: [pulseRatio] }
  });

  return [fireBaseLayer, fireModelLayer];
}