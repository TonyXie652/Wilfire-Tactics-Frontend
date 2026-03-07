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

export type AgentStatus = "idle" | "moving" | "safe" | "dead";

export type Agent = {
  id: string;
  lng: number;
  lat: number;
  kind: "resident" | "guide" | "truck";
  status: AgentStatus;

  // 移动参数
  speed: number;              // 每 tick 移动距离（经纬度单位，约 0.00005 ≈ 5米）
  currentNodeId?: string;     // 当前最近的路网节点
  targetNodeId?: string;      // 路径中的下一个目标节点

  // A* 路径
  path: string[];             // A* 算出的 nodeId 列表
  pathIndex: number;          // 当前走到 path 的第几步
  pathHistory: [number, number][];  // 历史轨迹坐标（用于回放）

  // 跟随引导员
  followingGuideId?: string;  // 正在跟随的引导员 ID（如果有）
  willFollowGuide?: boolean;  // 是否选择跟随（只掷骰一次）
  targetSafePointId?: string; // 当前路径对应的目标安全点

  // 反应延迟
  reactionDelay: number;      // 多少 tick 后才开始行动
  ticksSinceStart: number;    // 从模拟开始经过的 tick 数
  spawnTick?: number;         // 生成时的全局 tick（用于 reactionDelay）
};

/** 引导员 AI 的一次决策 */
export type GuideDecision = {
  guideId: string;
  targetSafePointId: string;
  reason?: string;
};

export type FireCell = {
  id: string;
  position: [number, number];
  intensity: number;
  size: number;
  age?: number;
  activatedAt?: number;
};

export type WindConfig = {
  angleDeg: number;
  speed: number;
  baseSpreadChance?: number;
};
