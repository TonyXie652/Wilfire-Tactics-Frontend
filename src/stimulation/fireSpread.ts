import type { FireCell, WindConfig } from "../app/types";

const MAX_INTENSITY = 4;
const SPREAD_THRESHOLD = 2;

const LNG_STEP = 0.00105;
const LAT_STEP = 0.00055;
// 间距必须小于最小步幅 (LAT_STEP * 1.2 = 0.00066)，否则南北方向永远无法扩散
const MIN_DISTANCE_THRESHOLD = 0.0005;

// --- 节奏平衡配置 ---
/**
 * 【调整】升级概率
 * 稍微加快一点升级速度，让火情能较快到达可以蔓延的级别 (Intensity > 2)
 */
const BASE_GROWTH_CHANCE = 0.012;

/** 每次升级之间的最小冷却时间（毫秒） */
const MIN_UPGRADE_COOLDOWN_MS = 5000;

/**
 * 【调整】扩散概率
 * 确保火势能肉眼可见地向外复制蔓延。
 */
const BASE_SPREAD_CHANCE = 0.00025;

const DIRECTIONS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
];

function getDist(p1: [number, number], p2: [number, number]): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

export function stepFireSpread(
  fireCells: FireCell[],
  wind?: WindConfig
): FireCell[] {
  const now = Date.now();

  // 1. 内部升级逻辑 (基于真实时间截的冷却期)
  const activeCells = fireCells.map(cell => {
    const nextCell = { ...cell, age: (cell.age ?? 0) + 1 };

    // 距离上次升级（或诞生）过了多久（毫秒）
    const timeSinceLastUpgrade = now - (nextCell.activatedAt ?? now);

    if (timeSinceLastUpgrade >= MIN_UPGRADE_COOLDOWN_MS && Math.random() < BASE_GROWTH_CHANCE && nextCell.intensity < MAX_INTENSITY) {
      console.log(`[FIRE] ${nextCell.id} 升级: ${nextCell.intensity} → ${nextCell.intensity + 1} (冷却了 ${(timeSinceLastUpgrade / 1000).toFixed(1)}秒)`);
      nextCell.intensity += 1;
      nextCell.activatedAt = now; // 用真实时间截重置冷却
    }
    return nextCell;
  });

  const nextFireList = [...activeCells];

  // 2. 外部扩散逻辑 (快节奏占地)
  for (const cell of activeCells) {
    // 【调整】：蔓延冷却期改为 2 秒，稍微比之前快一点，配合较高的生长率
    if (cell.intensity < SPREAD_THRESHOLD || (now - (cell.activatedAt ?? now)) < 2000) continue;

    // 扩散概率随强度增长，但基数变大
    // 强度 2: 9% | 强度 3: 18% | 强度 4: 27% (大火扩散非常猛)
    const dynamicSpreadChance = BASE_SPREAD_CHANCE * (cell.intensity - 1);

    // 注意：不在这里做随机判定，统一在风力修正后的 line 88 判定一次

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
      cell.position[0] + dir[0] * LNG_STEP * 1.2, // 加大蔓延步幅，保证每次新生火点都在最小间距阈值之外
      cell.position[1] + dir[1] * LAT_STEP * 1.2
    ];

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