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
          background: "rgba(15, 20, 25, 0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.15)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 6px 16px rgba(0, 0, 0, 0.4)",
          padding: "8px 32px",
          gap: "28px",
          pointerEvents: "auto",
          maskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}
      >
        <div style={{ width: "2px", height: "20px", background: "rgba(255, 255, 255, 0.2)", borderRadius: "2px" }} />

        <div
          onMouseEnter={() => setHoveredBlock("safe")}
          onMouseLeave={() => setHoveredBlock(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            filter: hoveredBlock === "safe" ? "drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))" : "none",
            transition: "all 0.2s ease-out",
            cursor: "default",
          }}
        >
          <ShieldCheck size={26} color={hoveredBlock === "safe" ? "#34d399" : "#10b981"} />
          <span style={{ fontSize: "28px", fontWeight: 900, color: "#fff", fontFamily: "'Orbitron', sans-serif", letterSpacing: "2px", lineHeight: 1 }}>
            {safeCount}
          </span>
        </div>

        <div style={{ width: "2px", height: "20px", background: "rgba(255, 255, 255, 0.2)", borderRadius: "2px" }} />

        <div
          onMouseEnter={() => setHoveredBlock("dead")}
          onMouseLeave={() => setHoveredBlock(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            filter: hoveredBlock === "dead" ? "drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))" : "none",
            transition: "all 0.2s ease-out",
            cursor: "default",
          }}
        >
          <Skull size={26} color={hoveredBlock === "dead" ? "#f87171" : "#ef4444"} />
          <span style={{ fontSize: "28px", fontWeight: 900, color: "#fff", fontFamily: "'Orbitron', sans-serif", letterSpacing: "2px", lineHeight: 1 }}>
            {deadCount}
          </span>
        </div>

        <div style={{ width: "2px", height: "20px", background: "rgba(255, 255, 255, 0.2)", borderRadius: "2px" }} />

        <div
          onMouseEnter={() => setHoveredBlock("moving")}
          onMouseLeave={() => setHoveredBlock(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            filter: hoveredBlock === "moving" ? "drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))" : "none",
            transition: "all 0.2s ease-out",
            cursor: "default",
          }}
        >
          <Activity size={26} color={hoveredBlock === "moving" ? "#60a5fa" : "#3b82f6"} />
          <span style={{ fontSize: "28px", fontWeight: 900, color: "#fff", fontFamily: "'Orbitron', sans-serif", letterSpacing: "2px", lineHeight: 1 }}>
            {movingCount}
          </span>
        </div>

        <div style={{ width: "2px", height: "20px", background: "rgba(255, 255, 255, 0.2)", borderRadius: "2px" }} />
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
