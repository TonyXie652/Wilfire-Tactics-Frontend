import type { FireCell } from "../app/types";

const MAX_INTENSITY = 4;
const SPREAD_THRESHOLD = 4;
const SPREAD_INTERVAL = 5;

const LNG_STEP = 0.00105;
const LAT_STEP = 0.00055;

const INTENSITY_GROWTH_INTERVAL = 12;
const SPREAD_CHANCE = 0.15;

type FireCellInternal = FireCell & {
  age?: number;
};

function shouldSpread(age: number): boolean {
  return age > 0 && age % SPREAD_INTERVAL === 0;
}

function cellKey(position: [number, number]): string {
  const [lng, lat] = position;
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

function getNeighbors(position: [number, number]): [number, number][] {
  const [lng, lat] = position;

  return [
    [lng + LNG_STEP, lat],
    [lng - LNG_STEP, lat],
    [lng, lat + LAT_STEP],
    [lng, lat - LAT_STEP],
  ];
}

function shouldIncreaseIntensity(age: number): boolean {
  return age > 0 && age % INTENSITY_GROWTH_INTERVAL === 0;
}

function cloneCell(cell: FireCellInternal): FireCellInternal {
  return {
    ...cell,
    position: [...cell.position] as [number, number],
  };
}

export function stepFireSpread(fireCells: FireCell[]): FireCell[] {
  const currentCells: FireCellInternal[] = fireCells.map((cell) => ({
    ...cell,
    age: cell.age ?? 0,
  }));

  const nextMap = new Map<string, FireCellInternal>();

  for (const cell of currentCells) {
    const nextCell = cloneCell(cell);
    nextCell.age = (nextCell.age ?? 0) + 1;

    if (
      shouldIncreaseIntensity(nextCell.age) &&
      nextCell.intensity < MAX_INTENSITY
    ) {
      nextCell.intensity += 1;
    }

    nextMap.set(cellKey(nextCell.position), nextCell);
  }

  const newCells: FireCellInternal[] = [];

  for (const cell of nextMap.values()) {
    if (cell.intensity < SPREAD_THRESHOLD) continue;
    if (!shouldSpread(cell.age ?? 0)) continue;

    const neighbors = getNeighbors(cell.position);

    for (const neighborPos of neighbors) {
      const key = cellKey(neighborPos);

      if (nextMap.has(key)) continue;
      if (Math.random() > SPREAD_CHANCE) continue;

      const alreadyQueued = newCells.some(
        (c) => cellKey(c.position) === key
      );
      if (alreadyQueued) continue;

      newCells.push({
        id: `fire-${key}`,
        position: neighborPos,
        size: cell.size,
        intensity: 1,
        age: 0,
      });
    }
  }

  for (const cell of newCells) {
    nextMap.set(cellKey(cell.position), cell);
  }

  return Array.from(nextMap.values());
}