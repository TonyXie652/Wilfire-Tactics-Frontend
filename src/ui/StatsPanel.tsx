import { useState } from "react";
import { ShieldCheck, Skull, Activity } from "lucide-react";

type Props = {
  safeCount: number;
  deadCount: number;
  movingCount: number;
  isSimDone: boolean;
};

export function StatsPanel({
  safeCount,
  deadCount,
  movingCount,
  isSimDone,
}: Props) {
  const [hoveredBlock, setHoveredBlock] = useState<"safe" | "dead" | "moving" | null>(null);

  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(15, 15, 20, 0.65)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "100px", // 胶囊形状
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(255,255,255,0.05)",
          padding: "10px 32px",
          gap: "28px",
          pointerEvents: "auto",
        }}
      >
        {/* SAFE Block */}
        <div
          onMouseEnter={() => setHoveredBlock("safe")}
          onMouseLeave={() => setHoveredBlock(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            filter: hoveredBlock === "safe" ? "drop-shadow(0 0 12px rgba(16, 185, 129, 0.6))" : "drop-shadow(0 0 4px rgba(16, 185, 129, 0.1))",
            transition: "all 0.3s ease-out",
            cursor: "default",
          }}
        >
          <div style={{
            background: "rgba(16, 185, 129, 0.15)",
            padding: "8px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <ShieldCheck size={20} color={hoveredBlock === "safe" ? "#6ee7b7" : "#34d399"} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span style={{ fontSize: "24px", fontWeight: 800, color: "#fff", fontFamily: "'Orbitron', sans-serif", letterSpacing: "1px", lineHeight: 1 }}>
              {safeCount}
            </span>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#6ee7b7", letterSpacing: "2px", marginTop: "2px" }}>SAFE</span>
          </div>
        </div>

        <div style={{ width: "1px", height: "30px", background: "rgba(255, 255, 255, 0.1)" }} />

        {/* DEAD Block */}
        <div
          onMouseEnter={() => setHoveredBlock("dead")}
          onMouseLeave={() => setHoveredBlock(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            filter: hoveredBlock === "dead" ? "drop-shadow(0 0 12px rgba(239, 68, 68, 0.6))" : "drop-shadow(0 0 4px rgba(239, 68, 68, 0.1))",
            transition: "all 0.3s ease-out",
            cursor: "default",
          }}
        >
          <div style={{
            background: "rgba(239, 68, 68, 0.15)",
            padding: "8px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Skull size={20} color={hoveredBlock === "dead" ? "#fca5a5" : "#f87171"} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span style={{ fontSize: "24px", fontWeight: 800, color: "#fff", fontFamily: "'Orbitron', sans-serif", letterSpacing: "1px", lineHeight: 1 }}>
              {deadCount}
            </span>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#fca5a5", letterSpacing: "2px", marginTop: "2px" }}>DEAD</span>
          </div>
        </div>

        <div style={{ width: "1px", height: "30px", background: "rgba(255, 255, 255, 0.1)" }} />

        {/* MOVING Block */}
        <div
          onMouseEnter={() => setHoveredBlock("moving")}
          onMouseLeave={() => setHoveredBlock(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            filter: hoveredBlock === "moving" ? "drop-shadow(0 0 12px rgba(59, 130, 246, 0.6))" : "drop-shadow(0 0 4px rgba(59, 130, 246, 0.1))",
            transition: "all 0.3s ease-out",
            cursor: "default",
          }}
        >
          <div style={{
            background: "rgba(59, 130, 246, 0.15)",
            padding: "8px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Activity size={20} color={hoveredBlock === "moving" ? "#93c5fd" : "#60a5fa"} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span style={{ fontSize: "24px", fontWeight: 800, color: "#fff", fontFamily: "'Orbitron', sans-serif", letterSpacing: "1px", lineHeight: 1 }}>
              {movingCount}
            </span>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#93c5fd", letterSpacing: "2px", marginTop: "2px" }}>MOVING</span>
          </div>
        </div>

      </div>

      {isSimDone && (
        <div
          style={{
            padding: "8px 16px",
            background: deadCount === 0 ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)",
            color: "white",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "14px",
            letterSpacing: "0.5px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {deadCount === 0 ? "ALL SAFE! EVACUATION SUCCESSFUL" : "SIMULATION COMPLETE"}
        </div>
      )}
    </div>
  );
}
