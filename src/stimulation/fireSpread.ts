import type { FireCell, WindConfig } from "../app/types";

/** Line segment intersection test (2D). */
function segmentsIntersect(
  p1: [number, number], p2: [number, number],
  p3: [number, number], p4: [number, number],
): boolean {
  const d1x = p2[0] - p1[0], d1y = p2[1] - p1[1];
  const d2x = p4[0] - p3[0], d2y = p4[1] - p3[1];
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-14) return false; // parallel
  const dx = p3[0] - p1[0], dy = p3[1] - p1[1];
  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

const MAX_INTENSITY = 4;
const SPREAD_THRESHOLD = 2;

const LNG_STEP = 0.00105;
const LAT_STEP = 0.00055;
const MIN_DISTANCE_THRESHOLD = 0.0006;

// --- 节奏平衡配置 ---
const BASE_GROWTH_CHANCE = 0.2;

/**
 * Spread chance per tick. At intensity 2: 30%, intensity 3: 60%, intensity 4: 90%.
 * Reduced from 0.6 so high-intensity fire doesn't guarantee spread every tick.
 */
const BASE_SPREAD_CHANCE = 0.3;

/**
 * Ticks before a cell starts decaying. At 1s/tick this is ~20 seconds of burning.
 * After this age, the cell loses intensity instead of gaining it.
 */
const BURNOUT_AGE = 20;

/**
 * Probability per tick that a burning-out cell loses 1 intensity level.
 */
const BASE_DECAY_CHANCE = 0.2;

const DIRECTIONS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
];

function getDist(p1: [number, number], p2: [number, number]): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/** Fire spread probability multiplier when crossing a roadblock. */
const ROADBLOCK_FIRE_PENALTY = 0.1;

export function stepFireSpread(
  fireCells: FireCell[],
  wind?: WindConfig,
  blockedSegments: Array<[[number, number], [number, number]]> = [],
): FireCell[] {
  // 1. Growth / burnout logic
  const activeCells: FireCell[] = [];
  for (const cell of fireCells) {
    const nextCell = { ...cell, age: (cell.age ?? 0) + 1 };

    if (nextCell.age >= BURNOUT_AGE) {
      // Cell is burning out: decay intensity
      if (Math.random() < BASE_DECAY_CHANCE) {
        nextCell.intensity -= 1;
      }
    } else {
      // Cell is still growing
      if (Math.random() < BASE_GROWTH_CHANCE && nextCell.intensity < MAX_INTENSITY) {
        nextCell.intensity += 1;
      }
    }

    // Remove fully extinguished cells
    if (nextCell.intensity > 0) {
      activeCells.push(nextCell);
    }
  }

  const nextFireList = [...activeCells];

  // 2. 外部扩散逻辑 (快节奏占地)
  for (const cell of activeCells) {
    // 【调整】：蔓延冷却期改为 2 秒，稍微比之前快一点，配合较高的生长率
    if (cell.intensity < SPREAD_THRESHOLD || (cell.age ?? 0) < 2) continue;

    // 扩散概率随强度增长，但基数变大
    // 强度 2: 9% | 强度 3: 18% | 强度 4: 27% (大火扩散非常猛)
    const dynamicSpreadChance = BASE_SPREAD_CHANCE * (cell.intensity - 1);

    if (Math.random() > dynamicSpreadChance) continue;

    // 随机选 1 个方向
    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

    // 【风力影响核心逻辑恢复】计算这股火苗是不是顺风
    let finalSpreadChance = dynamicSpreadChance;
    if (wind && wind.speed > 0) {
      // 0度向北(dy=1), 90向东(dx=1) => Math.atan2(dx, dy)
      // dir[0] 是经度差(东), dir[1] 是纬度差(北)
      const fireAngleRad = Math.atan2(dir[0], dir[1]);
      const fireAngleDeg = (fireAngleRad * 180) / Math.PI;

      const angleDiff = Math.abs(wind.angleDeg - fireAngleDeg);
      const angleDiffRad = (angleDiff * Math.PI) / 180;

      // cosine 对齐度：顺风=+1，侧风=0，逆风=-1
      const alignment = Math.cos(angleDiffRad);

      // 顺风时最多放大3倍（根据风速），逆风时最少只剩15%
      const multiplier = 1 + alignment * wind.speed * 2;
      finalSpreadChance = Math.max(finalSpreadChance * 0.15, finalSpreadChance * multiplier);
    }

    if (Math.random() > finalSpreadChance) continue;

    const neighborPos: [number, number] = [
      cell.position[0] + dir[0] * LNG_STEP * 0.65,
      cell.position[1] + dir[1] * LAT_STEP * 0.65
    ];

    // Check if this spread crosses a roadblock — if so, greatly reduce chance
    if (blockedSegments.length > 0) {
      const crossesBlock = blockedSegments.some((seg) =>
        segmentsIntersect(cell.position, neighborPos, seg[0], seg[1])
      );
      if (crossesBlock && Math.random() > ROADBLOCK_FIRE_PENALTY) continue;
    }

    const jitter = 0.02; // 极小的 jitter 偏差，完全杜绝越出圆圈
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