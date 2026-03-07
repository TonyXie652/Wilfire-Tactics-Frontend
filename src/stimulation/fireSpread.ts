import type { FireCell } from "../app/types";

const MAX_INTENSITY = 4;
const SPREAD_THRESHOLD = 2;

const LNG_STEP = 0.00105;
const LAT_STEP = 0.00055;
// 间距稍微收紧一点点（从 0.00055 降到 0.0005），让火区连绵感更强
const MIN_DISTANCE_THRESHOLD = 0.0003;

// --- 节奏平衡配置 ---
/**
 * 【下调】升级概率：从 0.08 降至 0.02
 * 让升级速度变慢，适合观察模拟演变。
 */
const BASE_GROWTH_CHANCE = 0.06;

/**
 * 【下调】扩散概率：从 0.09 降至 0.04
 * 配合变慢的升级速度，火势蔓延变得更稳定。
 */
const BASE_SPREAD_CHANCE = 0.05;

const DIRECTIONS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
];

function getDist(p1: [number, number], p2: [number, number]): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

export function stepFireSpread(fireCells: FireCell[]): FireCell[] {
  // 1. 内部升级逻辑 (慢节奏演化)
  const activeCells = fireCells.map(cell => {
    const nextCell = { ...cell, age: (cell.age ?? 0) + 1 };

    // 升级概率：取消了之前的动态加成，改为纯随机，让升级变得“佛系”
    if (Math.random() < BASE_GROWTH_CHANCE && nextCell.intensity < MAX_INTENSITY) {
      nextCell.intensity += 1;
    }
    return nextCell;
  });

  const nextFireList = [...activeCells];

  // 2. 外部扩散逻辑 (快节奏占地)
  for (const cell of activeCells) {
    // 【优化】：增加传播的冷却期，从 1 秒加到 3 秒
    if (cell.intensity < SPREAD_THRESHOLD || (cell.age ?? 0) < 3) continue;

    // 扩散概率随强度增长，但基数变大
    // 强度 2: 9% | 强度 3: 18% | 强度 4: 27% (大火扩散非常猛)
    const dynamicSpreadChance = BASE_SPREAD_CHANCE * (cell.intensity - 1);

    if (Math.random() > dynamicSpreadChance) continue;

    // 随机选 1 个方向
    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

    const neighborPos: [number, number] = [
      cell.position[0] + dir[0] * LNG_STEP * 0.85, // 缩短步长，增加紧凑感
      cell.position[1] + dir[1] * LAT_STEP * 0.85
    ];

    const jitter = 0.12;
    const finalPos: [number, number] = [
      neighborPos[0] + (Math.random() - 0.5) * LNG_STEP * jitter,
      neighborPos[1] + (Math.random() - 0.5) * LAT_STEP * jitter
    ];

    // 空间检查
    const isTooCrowded = nextFireList.some(existing =>
      getDist(existing.position, finalPos) < MIN_DISTANCE_THRESHOLD
    );

    if (!isTooCrowded) {
      nextFireList.push({
        id: `fire-${Date.now()}-${Math.random()}`,
        position: finalPos,
        size: cell.size,
        intensity: 1,
        age: 0,
        activatedAt: Date.now(),
      });
    }
  }

  return nextFireList;
}