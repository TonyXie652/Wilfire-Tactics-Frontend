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
  kind: "resident" | "guide" | "truck"; // truck 可选，但你后面想放消防车就很方便
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