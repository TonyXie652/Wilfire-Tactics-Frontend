import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapView } from "./map/MapView";
import { makeRoadLayers } from "./map/layers/roads";
import { makeAgentsLayer } from "./map/layers/agents";
import { makeFireLayer } from "./map/layers/fire";
import { makeSafePointsLayer } from "./map/layers/safePoints";
import { stepFireSpread } from "./sim/fireSpread";
import { stepAgents, createResident, createGuide } from "./sim/agentEngine";
import { getGuideDecisions, resetGuideSessions } from "./sim/guideAgent";
import { EvacuationDialog } from "./ui/EvacuationDialog";
import type { Scenario, Agent, FireCell, GuideDecision } from "./app/types";

// ─── 场景数据 ───

const scenario: Scenario = {
  nodes: [
    { id: "n1", lng: -114.36310920658588, lat: 62.457758202819065 },
    { id: "n2", lng: -114.36431459420415, lat: 62.457205075648716 },
    { id: "n3", lng: -114.36831494505012, lat: 62.455718095957906 },
    { id: "n4", lng: -114.36200000000000, lat: 62.455000000000000 },
  ],
  edges: [
    { id: "e1", from: "n1", to: "n2" },
    { id: "e2", from: "n2", to: "n3" },
    { id: "e3", from: "n3", to: "n4" },
    { id: "e4", from: "n4", to: "n1" },
  ],
  safePoints: [
    { id: "s1", lng: -114.348, lat: 62.454 },
    { id: "s2", lng: -114.372, lat: 62.45 },
  ],
};

const initialAgents: Agent[] = [
  createResident("a1", -114.369, 62.454, 2),
  createResident("a2", -114.365, 62.453, 4),
  createResident("a3", -114.361, 62.452, 3),
  createGuide("g1", -114.358, 62.454),
];

const initialFire: FireCell[] = [
  {
    id: "fire-0",
    position: [-114.3718, 62.454],
    intensity: 1,
    size: 80,
    age: 0,
    activatedAt: 0,
  },
];

const AI_DECISION_INTERVAL = 10;

// 交互模式
type InteractionMode = "idle" | "placing-guide" | "show-dialog";

export default function App() {
  const [timeMs, setTimeMs] = useState(() => performance.now());
  const [fireCells, setFireCells] = useState<FireCell[]>(initialFire);
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [isPaused, setIsPaused] = useState(true);
  const [tick, setTick] = useState(0);

  // 交互状态
  const [mode, setMode] = useState<InteractionMode>("idle");
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

  const guideDecisionsRef = useRef<GuideDecision[]>([]);
  const blockedEdgesRef = useRef<Set<string>>(new Set());

  // ─── 动画循环 ───
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 33) {
        last = t;
        setTimeMs(t);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ─── 主仿真 tick 循环 ───
  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setTick((prevTick) => {
        const newTick = prevTick + 1;
        setFireCells((prevFire) => {
          const newFire = stepFireSpread(prevFire);
          setAgents((prevAgents) =>
            stepAgents(
              prevAgents, scenario, newFire, newTick,
              guideDecisionsRef.current, blockedEdgesRef.current
            )
          );
          return newFire;
        });
        if (newTick % AI_DECISION_INTERVAL === 0) {
          requestGuideDecisions(newTick);
        }
        return newTick;
      });
    }, 800);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const requestGuideDecisions = useCallback(
    async (currentTick: number) => {
      try {
        const decisions = await getGuideDecisions(agents, scenario, fireCells, currentTick);
        if (decisions.length > 0) guideDecisionsRef.current = decisions;
      } catch (err) {
        console.error("[App] Guide decision error:", err);
      }
    },
    [agents, fireCells]
  );

  // ─── 单击 Agent（选中/取消选中） ───
  const handlePickAgent = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent || agent.kind !== "guide") return;

      if (selectedGuideId === agentId) {
        // 再点同一个 → 取消选中
        setSelectedGuideId(null);
        setMode("idle");
      } else {
        // 选中引导员 → 放置模式
        setSelectedGuideId(agentId);
        setMode("placing-guide");
      }
    },
    [agents, selectedGuideId]
  );

  // ─── 双击 Agent（弹出撤离对话框） ───
  const handleDoubleClickAgent = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent || agent.kind !== "guide") return;
      setSelectedGuideId(agentId);
      setMode("show-dialog");
    },
    [agents]
  );

  // ─── 点击地图空白处 ───
  const handleMapClick = useCallback(
    (lng: number, lat: number) => {
      if (mode === "placing-guide" && selectedGuideId) {
        // 把引导员移动到点击位置
        setAgents((prev) =>
          prev.map((a) =>
            a.id === selectedGuideId
              ? { ...a, lng, lat, path: [], pathIndex: 0 }
              : a
          )
        );
        console.log(`[App] 引导员 ${selectedGuideId} 移动到 [${lng.toFixed(4)}, ${lat.toFixed(4)}]`);
      } else if (mode === "show-dialog") {
        // 点击空白关闭对话框，回到放置模式
        setMode("placing-guide");
      } else {
        // 点空白取消选中
        setSelectedGuideId(null);
        setMode("idle");
      }
    },
    [mode, selectedGuideId]
  );

  // ─── Esc 键取消选中 ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedGuideId(null);
        setMode("idle");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─── 确认撤离 ───
  const handleEvacuationConfirm = useCallback(() => {
    setIsPaused(false);
    setMode("idle");
    setSelectedGuideId(null);
  }, []);

  const handleEvacuationCancel = useCallback(() => {
    setMode("placing-guide"); // 回到放置模式，继续调整位置
  }, []);

  // ─── 重置 ───
  const handleReset = useCallback(() => {
    setIsPaused(true);
    setTick(0);
    setFireCells(initialFire);
    setAgents(initialAgents);
    setMode("idle");
    setSelectedGuideId(null);
    guideDecisionsRef.current = [];
    resetGuideSessions();
  }, []);

  // ─── 统计 ───
  const stats = useMemo(() => {
    const residents = agents.filter((a) => a.kind === "resident");
    const safe = residents.filter((a) => a.status === "safe").length;
    const dead = residents.filter((a) => a.status === "dead").length;
    const moving = residents.filter(
      (a) => a.status === "moving" || a.status === "idle"
    ).length;
    return { total: residents.length, safe, dead, moving };
  }, [agents]);

  const isSimDone = stats.moving === 0 && tick > 0;

  // ─── 构建图层 ───
  const layers = useMemo(() => {
    return [
      ...makeRoadLayers(scenario),
      ...makeFireLayer(fireCells),
      ...makeAgentsLayer(agents, {
        timeMs,
        selectedAgentId: selectedGuideId,
        onPickAgent: handlePickAgent,
        onDoubleClickAgent: handleDoubleClickAgent,
      }),
      ...makeSafePointsLayer(scenario.safePoints, { timeMs }),
    ];
  }, [timeMs, fireCells, agents, selectedGuideId, handlePickAgent]);

  // ─── 提示文字 ───
  const hintText = (() => {
    if (!isPaused) return null;
    if (mode === "placing-guide") return "👆 点击地图放置引导员，再点击引导员确认撤离";
    return "👆 点击绿色引导员开始";
  })();

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      {/* ─── 控制栏 ─── */}
      <div style={{
        position: "absolute", top: 16, right: 16, zIndex: 10,
        display: "flex", gap: 8, alignItems: "center",
      }}>
        <button
          onClick={() => setIsPaused((p) => !p)}
          style={{
            padding: "10px 16px", fontSize: "14px",
            background: isPaused ? "#2e7d32" : "#b71c1c",
            color: "white", border: "1px solid #444",
            borderRadius: "6px", cursor: "pointer",
          }}
        >
          {isPaused ? "▶ Start" : "⏸ Pause"}
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: "10px 16px", fontSize: "14px",
            background: "#424242", color: "white",
            border: "1px solid #444", borderRadius: "6px", cursor: "pointer",
          }}
        >
          ↺ Reset
        </button>
      </div>

      {/* ─── 状态面板 ─── */}
      <div style={{
        position: "absolute", top: 16, left: 16, zIndex: 10,
        background: "rgba(0,0,0,0.75)", color: "white",
        padding: "12px 16px", borderRadius: "8px",
        fontSize: "13px", lineHeight: 1.6, minWidth: 180,
        backdropFilter: "blur(8px)",
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 15 }}>
          🔥 Wildfire Tactics
        </div>
        <div>Tick: {tick}</div>
        <div>🔥 Fire cells: {fireCells.length}</div>
        <div>👥 Residents: {stats.total}</div>
        <div style={{ color: "#4caf50" }}>✅ Safe: {stats.safe}</div>
        <div style={{ color: "#f44336" }}>💀 Dead: {stats.dead}</div>
        <div style={{ color: "#2196f3" }}>🏃 Moving: {stats.moving}</div>
        {stats.total > 0 && (
          <div style={{ marginTop: 4, fontWeight: 600 }}>
            Evacuation Rate: {((stats.safe / stats.total) * 100).toFixed(0)}%
          </div>
        )}
        {isSimDone && (
          <div style={{
            marginTop: 8, padding: "6px 10px",
            background: stats.dead === 0 ? "#2e7d32" : "#b71c1c",
            borderRadius: 4, textAlign: "center", fontWeight: 700,
          }}>
            {stats.dead === 0 ? "🎉 ALL SAFE!" : `Simulation Complete`}
          </div>
        )}
        {hintText && (
          <div style={{
            marginTop: 8, padding: "6px 8px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: 4, fontSize: 11, color: "#10b981",
          }}>
            {hintText}
          </div>
        )}
      </div>

      {/* ─── 撤离对话框 ─── */}
      {mode === "show-dialog" && selectedGuideId && (
        <EvacuationDialog
          guideId={selectedGuideId}
          position={{ x: window.innerWidth / 2, y: window.innerHeight / 2 - 50 }}
          onConfirm={handleEvacuationConfirm}
          onCancel={handleEvacuationCancel}
        />
      )}

      <MapView layers={layers} onMapClick={handleMapClick} />
    </div>
  );
}