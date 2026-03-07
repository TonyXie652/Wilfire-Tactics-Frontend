import React from 'react';

type ToolType = "resident" | "guide" | "fire" | "roadblock" | "none";

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onSelectTool }) => {
  const tools: { id: ToolType; label: string; color: string; iconBase: string; imgSrc?: string }[] = [
    { id: "none", label: "Cursor", color: "#888", iconBase: "🖱️" },
    { id: "guide", label: "Guide", color: "#fbc02d", iconBase: "🟡" },
    { id: "resident", label: "Random Residents", color: "#1976d2", iconBase: "🔵" },
    { id: "roadblock", label: "Roadblock", color: "#9ca3af", iconBase: "🛑" },
    { id: "fire", label: "Fire Source", color: "#d32f2f", iconBase: "🔥" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        marginTop: "10px",
        flex: 1
      }}
    >
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
            boxSizing: "border-box",
            flex: 1,
            minHeight: "80px"
          }}
        >
          {/* Placeholder for future 2D Icon/Sprite */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "50px", height: "50px" }}>
            {t.imgSrc ? (
              <img 
                src={t.imgSrc} 
                alt={t.label} 
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "contain",
                  // image-rendering pixelated is good for 2d pixel art
                  imageRendering: "pixelated" 
                }} 
              />
            ) : (
              <span style={{ fontSize: "32px" }}>{t.iconBase}</span>
            )}
          </div>
          {/* Label Text */}
          <div style={{ 
            fontSize: "16px", 
            fontWeight: activeTool === t.id ? "bold" : "normal",
            marginLeft: "20px",
            flex: 1,
            textAlign: "left"
          }}>
            {t.label}
          </div>
        </button>
      ))}
    </div>
  );
};
