import { ScatterplotLayer, ColumnLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { SafePoint } from "../../app/types";

type Options = {
  selectedSafePointId?: string | null;
  onPickSafePoint?: (safePointId: string) => void;
  timeMs?: number;

  radiusMeters?: number;
  ringExtraMeters?: number;
  ringPeriodMs?: number;
};

function hash01(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function makeSafePointsLayer(
  safePoints: SafePoint[],
  opts: Options = {}
): Layer[] {
  const safePointRadiusMeters = opts.radiusMeters ?? 30;
  const safePointRingExtraMeters = opts.ringExtraMeters ?? safePointRadiusMeters * 3;
  const {
    selectedSafePointId = null,
    onPickSafePoint,
    timeMs = 0,
    ringPeriodMs = 1400,
  } = opts;

  const colorNormal: [number, number, number, number] = [34, 197, 94, 120];   // Increased transparency (from 255 to 120)
  const colorSelected: [number, number, number, number] = [74, 222, 128, 180]; // Increased transparency (from 255 to 180)

  const t = ringPeriodMs > 0 ? (timeMs % ringPeriodMs) / ringPeriodMs : 0;

  const isSelected = (d: SafePoint) =>
    !!selectedSafePointId && d.id === selectedSafePointId;

  const getRingRadius = (d: SafePoint) => {
    const phase = hash01(d.id) * 0.35;
    const tt = (t + phase) % 1;
    return safePointRadiusMeters + safePointRingExtraMeters * tt;
  };

  const getRingAlpha = (d: SafePoint) => {
    const phase = hash01(d.id) * 0.35;
    const tt = (t + phase) % 1;
    const a = Math.max(0, 1 - tt);
    return Math.round(180 * a);
  };

  const ringLayer = new ScatterplotLayer<SafePoint>({
    id: "safe-points-ring",
    data: safePoints,
    getPosition: (d) => [d.lng, d.lat, 6],
    radiusUnits: "meters",
    radiusMinPixels: 3,
    getRadius: getRingRadius,
    filled: false,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: (d) => (isSelected(d) ? 3 : 2),
    getLineColor: (d) =>
      isSelected(d)
        ? ([255, 255, 255, getRingAlpha(d)] as any)
        : ([34, 197, 94, getRingAlpha(d)] as any),
    updateTriggers: {
      getRadius: timeMs,
      getLineColor: timeMs,
    },
    pickable: false,
    parameters: { depthTest: false } as any,
  });

  const innerLayer = new ColumnLayer<SafePoint>({
    id: "safe-points-inner",
    data: safePoints,
    diskResolution: 32,
    radius: safePointRadiusMeters,
    extruded: true,
    pickable: true,
    elevationScale: 1,
    getPosition: (d) => [d.lng, d.lat],
    getElevation: (d) => (isSelected(d) ? 60 : 40), // Increased height: Base 40, selected 60
    getFillColor: (d) => (isSelected(d) ? colorSelected : colorNormal),
    getLineColor: () => [255, 255, 255, 255],
    stroked: true,
    lineWidthMinPixels: 2,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 90],
    parameters: { depthTest: true, depthCompare: 'always' } as any, // luma.gl v9 depth requirements
    onClick: (info) => {
      const obj = info.object as SafePoint | null;
      if (!obj) return;
      onPickSafePoint?.(obj.id);
    },
  });

  return [ringLayer, innerLayer];
}
