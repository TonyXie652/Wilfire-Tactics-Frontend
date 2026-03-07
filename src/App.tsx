import { useEffect, useMemo, useState } from "react";
import { MapView } from "./map/MapView";
import { makeRoadLayers } from "./map/layers/roads";
import { makeAgentsLayer } from "./map/layers/agents";
import { makeFireLayer } from "./map/layers/fire";
import { makeSafePointsLayer } from "./map/layers/safePoints";
import { stepFireSpread } from "./sim/fireSpread";
import type { Scenario, Agent, FireCell } from "./app/types";

// 生成一个小方形路网
//-114.36814069081184 62.45785395101211
//-114.36565616429823 62.45670855553141
//-114.36884908695268 62.45805328178463
//-114.36981729223326 62.457546840985856
//-114.36696494343657 62.45621346566435

const scenario: Scenario = {
  nodes: [
    { id: "n1", lng: -114.36310920658588, lat: 62.457758202819065 },
    { id: "n2", lng: -114.36431459420415, lat: 62.457205075648716 },
    { id: "n3", lng: -114.36831494505012, lat: 62.455718095957906 },
    { id: "n4", lng: -114.37655733618166, lat: 62.45181116735202 },
    { id: "n5", lng: -114.37090917879688, lat: 62.44926267350607 },
    { id: "n6", lng: -114.36497648861767, lat: 62.45206505046835 },
    { id: "n7", lng: -114.36381507219964, lat: 62.45261948914293 },
    { id: "n8", lng: -114.36287114080346, lat: 62.453328897004496 },
    { id: "n9", lng: -114.36177737953602, lat: 62.454470627599136 },
    { id: "n10", lng: -114.36163233442592, lat: 62.4548216711413 },
    { id: "n11", lng: -114.36165571613036, lat: 62.456013225205 },
    { id: "n12", lng: -114.36493647856521, lat: 62.45870146579131 },
    { id: "n13", lng: -114.3654451563115, lat: 62.45869959047337 },
    { id: "n14", lng: -114.36658077332825, lat: 62.45824609711707 },
    { id: "n15", lng: -114.3637030673371, lat: 62.457486820715474 },
    { id: "n16", lng: -114.36592038938649, lat: 62.45848742317287 },
    { id: "n17", lng: -114.36814069081184, lat: 62.45785395101211 },
    { id: "n18", lng: -114.36565616429823, lat: 62.45670855553141 },
    { id: "n19", lng: -114.36884908695268, lat: 62.45805328178463 },
    { id: "n20", lng: -114.36981729223326, lat: 62.457546840985856 },
    { id: "n21", lng: -114.36702632032875, lat: 62.45621346566435 },
    { id: "n22", lng: -114.370888461658, lat: 62.45689735027457 },
    { id: "n23", lng: -114.37231207297731, lat: 62.45646391182896 },
    { id: "n24", lng: -114.36949644461507, lat: 62.455173457423456 },
    { id: "n25", lng: -114.37346016108309, lat: 62.45590944249548 },
    { id: "n26", lng: -114.37067631404395, lat: 62.4546073350227 },
    { id: "n27", lng: -114.37405620035723, lat: 62.455629047360276 },
    { id: "n28", lng: -114.37413543791178, lat: 62.45509479549645 },
    { id: "n29", lng: -114.37184719439806, lat: 62.45404414485557 },
    { id: "n30", lng: -114.36620947367835, lat: 62.451512489580864 },
    { id: "n31", lng: -114.37517196323887, lat: 62.454493167666726 },
    { id: "n32", lng: -114.37301341311255, lat: 62.453494710684765 },
    { id: "n33", lng: -114.36740520369047, lat: 62.45093939817849 },
    { id: "n34", lng: -114.37638713124758, lat: 62.453944543513245 },
    { id: "n35", lng: -114.37419082515679, lat: 62.45293574098355 },
    { id: "n36", lng: -114.36857651653246, lat: 62.450390656830166 },
    { id: "n37", lng: -114.37755795794135, lat: 62.453391347831456 },
    { id: "n38", lng: -114.37539054167891, lat: 62.45238356203424 },
    { id: "n39", lng: -114.36973993160342, lat: 62.44984427563955 },
    { id: "n40", lng: -114.37129432544208, lat: 62.45166204682195 },
    { id: "n41", lng: -114.36782983539295, lat: 62.45331302765004 },
    { id: "n42", lng: -114.36663725196844, lat: 62.45388247809464 },
    { id: "n43", lng: -114.36546682004347, lat: 62.454445587997554 },
    { id: "n44", lng: -114.36429143225112, lat: 62.45500429885172 },
    { id: "n45", lng: -114.3621855990103, lat: 62.454099945551235 },
    { id: "n46", lng: -114.36499781177862, lat: 62.452080989077956 },
    { id: "n38", lng: -114.37539054167891, lat: 62.45238356203424 },
    { id: "n38", lng: -114.37539054167891, lat: 62.45238356203424 },
    
    
  ],

  edges: [
    { id: "e1", from: "n1", to: "n2" },
    { id: "e2", from: "n2", to: "n3" },
    { id: "e3", from: "n3", to: "n4" },
    { id: "e4", from: "n4", to: "n5" },
    { id: "e5", from: "n5", to: "n6" },
    { id: "e6", from: "n6", to: "n7" },
    { id: "e7", from: "n7", to: "n8" },
    { id: "e8", from: "n8", to: "n9" },
    { id: "e9", from: "n9", to: "n10" },
    { id: "e10", from: "n10", to: "n11" },
    { id: "e11", from: "n11", to: "n2" },
    { id: "e12", from: "n1", to: "n12" },
    { id: "e13", from: "n12", to: "n13" },
    { id: "e14", from: "n13", to: "n14" },
    { id: "e15", from: "n14", to: "n2" },
    { id: "e16", from: "n15", to: "n16" },
    { id: "e17", from: "n14", to: "n17" },
    { id: "e18", from: "n17", to: "n18" },
    { id: "e19", from: "n17", to: "n19" },
    { id: "e20", from: "n19", to: "n20" },
    { id: "e21", from: "n20", to: "n21" },
    { id: "e22", from: "n20", to: "n22" },
    { id: "e23", from: "n22", to: "n3" },
    { id: "e24", from: "n22", to: "n23" },
    { id: "e25", from: "n23", to: "n24" },
    { id: "e26", from: "n23", to: "n25" },
    { id: "e27", from: "n25", to: "n26" },
    { id: "e28", from: "n25", to: "n27" },
    { id: "e29", from: "n27", to: "n28" },
    { id: "e30", from: "n28", to: "n29" },
    { id: "e31", from: "n29", to: "n30" },
    { id: "e32", from: "n28", to: "n31" },
    { id: "e33", from: "n31", to: "n32" },
    { id: "e34", from: "n32", to: "n33" },
    { id: "e35", from: "n31", to: "n34" },
    { id: "e36", from: "n34", to: "n35" },
    { id: "e37", from: "n35", to: "n36" },
    { id: "e38", from: "n34", to: "n37" },
    { id: "e39", from: "n37", to: "n38" },
    { id: "e40", from: "n38", to: "n39" },
    { id: "e41", from: "n40", to: "n41" },
    { id: "e42", from: "n41", to: "n42" },
    { id: "e43", from: "n42", to: "n43" },
    { id: "e44", from: "n43", to: "n44" },
    { id: "e45", from: "n44", to: "n45" },
    { id: "e46", from: "n43", to: "n8" },
    { id: "e47", from: "n42", to: "n7" },
    { id: "e48", from: "n41", to: "n46" },
    { id: "e49", from: "n41", to: "n25" },
    { id: "e50", from: "n42", to: "n24" },
    { id: "e51", from: "n43", to: "n3" },
    { id: "e52", from: "n44", to: "n21" },
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