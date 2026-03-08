import { useEffect, useState } from "react";
import type { Agent } from "../app/types";
import type { DecisionEntry } from "../sim/decisionLog";

type Props = {
  guide: Agent | null;
  decisions: DecisionEntry[];
  onClose: () => void;
};

export function GuideTrackerPanel({ guide, decisions, onClose }: Props) {
  const [position, setPosition] = useState({ x: 16, y: 110 });
  const [dragState, setDragState] = useState<{
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      setPosition({
        x: Math.max(8, event.clientX - dragState.offsetX),
        y: Math.max(8, event.clientY - dragState.offsetY),
      });
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState]);

  if (!guide) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        zIndex: 40,
        width: 320,
        maxHeight: "calc(100vh - 150px)",
        overflow: "auto",
        borderRadius: 14,
        border: "1px solid rgba(59, 130, 246, 0.28)",
        background: "rgba(15, 23, 42, 0.9)",
        color: "white",
        backdropFilter: "blur(14px)",
        boxShadow: "0 18px 42px rgba(0, 0, 0, 0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px 10px",
          borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
          cursor: dragState ? "grabbing" : "grab",
          userSelect: "none",
        }}
        onMouseDown={(event) => {
          const rect = event.currentTarget.parentElement?.getBoundingClientRect();
          if (!rect) return;
          setDragState({
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
          });
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>追踪 Guide {guide.id}</div>
          <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 4 }}>
            status={guide.status ?? "moving"} target={guide.targetSafePointId ?? "-"}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            color: "#cbd5e1",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: "12px 16px", fontSize: 12, color: "#cbd5e1" }}>
        位置: [{guide.lng.toFixed(5)}, {guide.lat.toFixed(5)}]
      </div>

      <div style={{ padding: "0 12px 12px", display: "grid", gap: 8 }}>
        {decisions.length === 0 ? (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "rgba(30, 41, 59, 0.7)",
              color: "#94a3b8",
              fontSize: 12,
            }}
          >
            暂无该 Guide 的 AI 决策日志
          </div>
        ) : (
          decisions.slice().reverse().map((entry, index) => (
            <div
              key={`${entry.guideId}-${entry.tick}-${index}`}
              style={{
                padding: 12,
                borderRadius: 10,
                background: "rgba(30, 41, 59, 0.78)",
                border: "1px solid rgba(59, 130, 246, 0.14)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#bfdbfe", marginBottom: 6 }}>
                Tick {entry.tick} → {entry.targetSafePointId}
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.45 }}>
                {entry.reason}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
