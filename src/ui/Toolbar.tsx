import React from 'react';

export type ToolType = "resident" | "guide" | "fire" | "roadblock" | "none";

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onSelectTool }) => {
  const tools: { id: ToolType; label: string; color: string; icon: string }[] = [
    { id: "none", label: "Cursor", color: "#888", icon: "🖱️" },
    { id: "guide", label: "Guide", color: "#fbc02d", icon: "🟡" },
    { id: "resident", label: "Random Residents", color: "#1976d2", icon: "🔵" },
    { id: "roadblock", label: "Roadblock", color: "#9ca3af", icon: "🛑" },
    { id: "fire", label: "Fire Source", color: "#d32f2f", icon: "🔥" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px", flex: 1 }}>
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelectTool(t.id)}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "16px 20px",
            background: activeTool === t.id ? t.color : "#2a2a2a",
            color: "#fff",
            border: `2px solid ${activeTool === t.id ? "#fff" : "#444"}`,
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)",
            transform: activeTool === t.id ? "scale(1.02)" : "scale(1)",
            boxShadow: activeTool === t.id ? `0 4px 12px ${t.color}66` : "none",
            width: "100%",
            boxSizing: "border-box" as const,
            flex: 1,
            minHeight: "80px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "50px", height: "50px" }}>
            <span style={{ fontSize: "32px" }}>{t.icon}</span>
          </div>
          <div style={{
            fontSize: "16px",
            fontWeight: activeTool === t.id ? "bold" : "normal",
            marginLeft: "20px",
            flex: 1,
            textAlign: "left" as const,
          }}>
            {t.label}
          </div>
        </button>
      ))}
    </div>
  );
};
