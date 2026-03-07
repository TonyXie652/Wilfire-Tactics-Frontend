import React from 'react';
import { MousePointer2, UserRoundCheck, Users, Construction, Flame } from 'lucide-react';

export type ToolType = "resident" | "guide" | "fire" | "roadblock" | "none";

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onSelectTool }) => {
  const tools: { id: ToolType; label: string; color: string; icon: React.ReactNode }[] = [
    { id: "none", label: "Cursor", color: "#888", icon: <MousePointer2 size={20} /> },
    { id: "guide", label: "Guide", color: "#fbc02d", icon: <UserRoundCheck size={20} /> },
    { id: "resident", label: "Random Residents", color: "#1976d2", icon: <Users size={20} /> },
    { id: "roadblock", label: "Roadblock", color: "#9ca3af", icon: <Construction size={20} /> },
    { id: "fire", label: "Fire Source", color: "#d32f2f", icon: <Flame size={20} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "16px", flex: 1 }}>
      <style>{`
        .tool-btn {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 0 16px;
          height: 56px;
          color: #fff;
          border: none;
          background: rgba(40, 40, 40, 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
          border-left: 3px solid transparent;
          width: 100%;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }
        
        .tool-btn::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
          transform: skewX(-20deg);
          transition: all 0.5s ease;
        }

        .tool-btn:hover {
          background: rgba(60, 60, 60, 0.6);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .tool-btn:hover::after {
          left: 200%;
        }

        .tool-btn.active {
          background: rgba(50, 50, 50, 0.8);
          /* The left border color is set inline via React */
        }
      `}</style>
      
      {tools.map((t) => {
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            className={`tool-btn ${isActive ? "active" : ""}`}
            style={{
              borderLeftColor: isActive ? t.color : "transparent",
              boxShadow: isActive ? `-2px 0 15px -2px ${t.color}` : "none",
            }}
          >
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              width: "32px", 
              color: isActive ? t.color : "rgba(255, 255, 255, 0.5)",
              transition: "all 0.3s ease",
            }}>
              {t.icon}
            </div>
            <div style={{
              fontSize: "14px",
              fontWeight: isActive ? "600" : "400",
              marginLeft: "12px",
              flex: 1,
              textAlign: "left",
              color: isActive ? "#fff" : "#aeaeae",
              transition: "all 0.3s ease",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}>
              {t.label}
            </div>
          </button>
        );
      })}
    </div>
  );
};
