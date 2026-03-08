import React from 'react';
import { MousePointer2, UserRoundCheck, Users, Construction, Flame } from 'lucide-react';

export type ToolType = "resident" | "guide" | "fire" | "roadblock" | "none";

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  /** Current / max for guides, e.g. { current: 2, max: 5 } */
  guideLimits?: { current: number; max: number };
  /** Current / max for roadblocks, e.g. { current: 1, max: 3 } */
  roadblockLimits?: { current: number; max: number };
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  guideLimits,
  roadblockLimits,
}) => {
  const tools: { id: ToolType; label: string; color: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "none", label: "Cursor", color: "#888", icon: <MousePointer2 size={20} /> },
    {
      id: "guide",
      label: "Guide",
      color: "#fbc02d",
      icon: <UserRoundCheck size={20} />,
      badge: guideLimits ? `${guideLimits.current}/${guideLimits.max}` : undefined,
    },
    { id: "resident", label: "Random Residents", color: "#1976d2", icon: <Users size={20} /> },
    {
      id: "roadblock",
      label: "Roadblock",
      color: "#9ca3af",
      icon: <Construction size={20} />,
      badge: roadblockLimits ? `${roadblockLimits.current}/${roadblockLimits.max}` : undefined,
    },
    { id: "fire", label: "Fire Source", color: "#d32f2f", icon: <Flame size={20} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "16px", flex: 1, alignItems: "center" }}>
      <style>{`
        .tool-btn {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 0 16px;
          height: 48px;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(15, 15, 20, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          width: 85%;
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
          background: rgba(30, 30, 35, 0.8);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tool-btn:hover::after {
          left: 200%;
        }

        .tool-btn.active {
          background: rgba(30, 30, 40, 0.85);
          /* The border color and box-shadow is set inline via React */
        }

        .tool-btn.at-limit {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .tool-btn.at-limit:hover {
          transform: none;
          box-shadow: none;
        }
      `}</style>
      
      {tools.map((t) => {
        const isActive = activeTool === t.id;
        const atLimit =
          (t.id === "guide" && guideLimits && guideLimits.current >= guideLimits.max) ||
          (t.id === "roadblock" && roadblockLimits && roadblockLimits.current >= roadblockLimits.max);

        return (
          <button
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            className={`tool-btn ${isActive ? "active" : ""} ${atLimit ? "at-limit" : ""}`}
            style={{
              borderColor: isActive ? t.color : "rgba(255, 255, 255, 0.05)",
              boxShadow: isActive ? `0 0 15px -2px ${t.color}66, inset 0 0 8px -2px ${t.color}33` : "none",
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
            {t.badge && (
              <div style={{
                fontSize: "11px",
                fontWeight: "600",
                color: atLimit ? "#ff6b6b" : "#aaa",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "4px",
                padding: "2px 6px",
                marginLeft: "4px",
                fontFamily: "monospace",
              }}>
                {t.badge}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
