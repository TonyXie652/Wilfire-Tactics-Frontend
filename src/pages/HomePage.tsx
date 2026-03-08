import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedBackground from "../components/AnimatedBackground";

const featureCards = [
  {
    title: "Fire Spread Tracking",
    text: "Visualize wildfire growth, intensity escalation, and propagation patterns across the target area in real time.",
  },
  {
    title: "Evacuation Network",
    text: "Display roads, responders, residents, and safe points to support route planning and emergency coordination.",
  },
  {
    title: "Interactive Control",
    text: "Pause, resume, and inspect the simulation flow to demonstrate tactical decisions and system behavior clearly.",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  
  const [isHoverPrimary, setIsHoverPrimary] = useState(false);
  const [isHoverSecondary, setIsHoverSecondary] = useState(false);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        width: "100vw",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        color: "white",
        backgroundColor: "#0a0a0f", // 确保底色够深，衬托光影
      }}
    >
      <AnimatedBackground />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "row",
        }}
      >
        {/* 左侧文字区域：修改 #4 添加了黑色渐变遮罩，确保文字不被网格线干扰 */}
        <div
          style={{
            flex: 1.15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 56px 64px 72px",
            // 从左向右的柔和暗色渐变，分离前后景
            background: "linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)",
          }}
        >
          <div style={{ maxWidth: 720 }}>
            <div
              style={{
                display: "inline-block",
                padding: "8px 14px",
                borderRadius: "999px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.28)",
                color: "#fecaca",
                fontSize: "14px",
                marginBottom: "22px",
                backdropFilter: "blur(8px)",
                boxShadow: "0 8px 30px rgba(239,68,68,0.08)",
              }}
            >
              Real-time Emergency Response Demo
            </div>

            {/* 主标题：火焰渐变 + 呼吸辉光动画 */}
            <style>{`
              @keyframes fireGlow {
                0%, 100% { filter: drop-shadow(0 8px 24px rgba(239, 68, 68, 0.25)) drop-shadow(0 0 40px rgba(249, 115, 22, 0.08)); }
                50% { filter: drop-shadow(0 12px 36px rgba(239, 68, 68, 0.4)) drop-shadow(0 0 60px rgba(249, 115, 22, 0.18)); }
              }
            `}</style>
            <h1
              style={{
                fontSize: "78px",
                lineHeight: 1.02,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.03em",
                marginBottom: "20px",
                background: "linear-gradient(135deg, #fff8f0 0%, #ffbd59 35%, #f97316 65%, #dc2626 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "fireGlow 3s ease-in-out infinite",
              }}
            >
              Wildfire
              <br />
              Tactics
            </h1>

            <p
              style={{
                fontSize: "22px",
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.82)",
                marginBottom: "34px",
                maxWidth: "640px",
              }}
            >
              An interactive wildfire evacuation simulation system for exploring
              fire spread, road accessibility, responder movement, and safe-point
              coordination through a clear visual workflow.
            </p>

            <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => navigate("/simulation")}
                onMouseEnter={() => setIsHoverPrimary(true)}
                onMouseLeave={() => setIsHoverPrimary(false)}
                style={{
                  padding: "18px 36px",
                  fontSize: "20px",
                  fontWeight: 700,
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: isHoverPrimary 
                    ? "linear-gradient(135deg, #f87171 0%, #fb923c 100%)" 
                    : "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
                  color: "white",
                  cursor: "pointer",
                  boxShadow: isHoverPrimary
                    ? "0 20px 50px rgba(239, 68, 68, 0.45), 0 8px 24px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                    : "0 14px 38px rgba(239, 68, 68, 0.3), 0 6px 18px rgba(249,115,22,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
                  transform: isHoverPrimary ? "translateY(-3px) scale(1.02)" : "translateY(0) scale(1)",
                  transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                  letterSpacing: "0.02em",
                }}
              >
                Enter Simulation
              </button>

              <button
                onClick={() => window.location.href = "/Overview.html"}
                onMouseEnter={() => setIsHoverSecondary(true)}
                onMouseLeave={() => setIsHoverSecondary(false)}
                style={{
                  padding: "16px 24px",
                  fontSize: "16px",
                  fontWeight: 500,
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: isHoverSecondary 
                    ? "rgba(255,255,255,0.1)" 
                    : "transparent",
                  color: isHoverSecondary ? "#fff" : "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                  transform: isHoverSecondary ? "translateY(-2px)" : "translateY(0)",
                  borderColor: isHoverSecondary ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.14)",
                  transition: "all 0.3s ease",
                  letterSpacing: "0.01em",
                }}
              >
                View Overview
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 56px 48px 20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              display: "grid",
              gap: "18px",
            }}
          >
            {featureCards.map((item, index) => {
              const isCardHovered = hoveredCardIndex === index;
              
              return (
                <div
                  key={item.title}
                  onMouseEnter={() => setHoveredCardIndex(index)}
                  onMouseLeave={() => setHoveredCardIndex(null)}
                  style={{
                    // 修改 #3：极致玻璃拟物质感 (Glassmorphism)
                    background: isCardHovered 
                      ? "rgba(255,255,255,0.06)" 
                      : "rgba(255,255,255,0.02)", // 默认背景更通透
                    backdropFilter: "blur(24px)", // 更强的毛玻璃模糊
                    // 精细的边缘高光：模拟光线从左上方打下来
                    borderTop: isCardHovered ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.12)",
                    borderLeft: isCardHovered ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.08)",
                    borderBottom: isCardHovered ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.02)",
                    borderRight: isCardHovered ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.02)",
                    borderRadius: "22px",
                    padding: "24px",
                    boxShadow: isCardHovered
                      ? "0 20px 40px rgba(0,0,0,0.3), 0 0 15px rgba(255,255,255,0.05)" // 悬浮时阴影更深，外加微弱光晕
                      : "0 10px 30px rgba(0,0,0,0.2)",
                    transform: isCardHovered ? "translateY(-6px)" : "translateY(0)",
                    // 使用 cubic-bezier 曲线让悬浮动画带有轻微的“弹簧”质感
                    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    cursor: "pointer",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "10px",
                      fontSize: "24px",
                      letterSpacing: "-0.01em",
                      color: isCardHovered ? "#ffffff" : "rgba(255,255,255,0.9)",
                      transition: "color 0.3s ease",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: isCardHovered ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.65)",
                      lineHeight: 1.72,
                      fontSize: "16px",
                      transition: "color 0.3s ease",
                    }}
                  >
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          zIndex: 2,
          padding: "20px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxSizing: "border-box",
          background: "linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
          © 2026 Wildfire Tactics · HACK CAN — University of Waterloo
        </span>
        <div style={{ display: "flex", gap: "10px" }}>
          {["React", "Deck.gl", "Mapbox", "TypeScript"].map((tech) => (
            <span
              key={tech}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.45)",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.03em",
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
