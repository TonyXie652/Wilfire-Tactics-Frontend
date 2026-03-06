import { useEffect, useMemo, useState } from "react";
import { MapView } from "./map/MapView";
import { makeRoadLayers } from "./map/layers/roads";
import { makeAgentsLayer } from "./map/layers/agents";
import { makeFireLayer } from "./map/layers/fire";
import { makeSafePointsLayer } from "./map/layers/safePoints";
import { stepFireSpread } from "./sim/fireSpread";
import type { Scenario, Agent, FireCell } from "./app/types";

// 生成一个小方形路网
//-114.36310920658588 62.457758202819065
//-114.36431459420415 62.457205075648716
//-114.36831494505012 62.455718095957906

const scenario: Scenario = {
  nodes: [
    { id: "n1", lng: -114.36310920658588, lat: 62.457758202819065 },
    { id: "n2", lng: -114.36431459420415, lat: 62.457205075648716 },
    { id: "n3", lng: -114.36831494505012, lat: 62.455718095957906 },
    
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

const agents: Agent[] = [
  { id: "a1", lng: -114.369, lat: 62.454, kind: "resident" },
  { id: "a2", lng: -114.365, lat: 62.453, kind: "resident" },
  { id: "a3", lng: -114.361, lat: 62.452, kind: "resident" },
  { id: "g1", lng: -114.358, lat: 62.454, kind: "guide" },
  { id: "t1", lng: -114.366, lat: 62.451, kind: "truck" },
];

const initialFire: FireCell[] = [
  {
    id: "fire-0",
    position: [-114.3718, 62.4540],
    intensity: 1,
    size: 80,
    age: 0,
    activatedAt: 0,
  },
];


export default function App() {
  const [timeMs, setTimeMs] = useState(() => performance.now());
  const [fireCells, setFireCells] = useState<FireCell[]>(initialFire);
  const [isPaused, setIsPaused] = useState(false);

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

  useEffect(() => {
    if (isPaused) return;

    const timer = window.setInterval(() => {
      setFireCells((prev) => stepFireSpread(prev));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  const layers = useMemo(() => {
    return [
      ...makeRoadLayers(scenario),
      ...makeFireLayer(fireCells),
      makeAgentsLayer(agents),
      ...makeSafePointsLayer(scenario.safePoints, { timeMs }),
    ];
  }, [timeMs, fireCells]);

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <button
        onClick={() => setIsPaused((p) => !p)}
        style={{
        position: "absolute",
        top: 20,
        right: 20,
        zIndex: 10,
        padding: "10px 16px",
        fontSize: "14px",
        background: isPaused ? "#2e7d32" : "#b71c1c",
        color: "white",
        border: "1px solid #444",
        borderRadius: "6px",
        cursor: "pointer",
        }}
      >
      {isPaused ? "Resume Fire" : "Pause Fire"}
      </button>

      <MapView layers={layers} />
    </div>
  );
}