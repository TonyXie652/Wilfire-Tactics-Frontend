// src/app/types.ts

export type Node = {
  id: string
  lng: number
  lat: number
}

export type Edge = {
  id: string
  from: string
  to: string
  baseCost?: number
}

export type SafePoint = {
  id: string
  lng: number
  lat: number
}

export type Scenario = {
  nodes: Node[]
  edges: Edge[]
  safePoints: SafePoint[]
}

export type Agent = {
  id: string;
  lng: number;
  lat: number;
  kind: "resident" | "guide" | "truck" | "roadblock"; // truck 可选，但你后面想放消防车就很方便
  status?: "moving" | "safe" | "dead";
};

export type FireCell = {
  id: string;
  position: [number, number];
  intensity: number;
  size: number;
  age?: number;
  activatedAt?: number;
}; // intensity 0..1

/**
 * 风力配置，供用户在 UI 中实时调整。
 *
 * angleDeg - 风向角度 (0=北, 90=东, 180=南, 270=西)
 * speed - 风速 (0~1 的归一化系数，用来放大迎风面的蔓延概率)
 * baseSpreadChance - 基础蔓延概率，方便 UI 调节整体难度
 */
export type WindConfig = {
  angleDeg: number;
  speed: number;
  baseSpreadChance: number;
};