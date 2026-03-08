export const WORLD_SCALE = 4;

/** Convert real map metres into the simulation's scaled metres. */
export function scaleMeters(distanceMeters: number): number {
  return distanceMeters * WORLD_SCALE;
}

/** Convert scaled simulation metres back into real map metres for rendering. */
export function logicMetersToMapMeters(distanceMeters: number): number {
  return distanceMeters / WORLD_SCALE;
}
