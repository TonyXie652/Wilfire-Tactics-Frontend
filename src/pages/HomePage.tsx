import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div
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

            {/* 主标题：修改 #2 添加了橙色渐变和光晕 */}
            <h1
              style={{
                fontSize: "74px",
                lineHeight: 1.02,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.03em",
                marginBottom: "20px",
                // 渐变文字
                background: "linear-gradient(135deg, #ffffff 30%, #f97316 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                // 使用 drop-shadow 替代 text-shadow，让渐变字的阴影更自然
                filter: "drop-shadow(0 12px 30px rgba(239, 68, 68, 0.25))",
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

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/simulation")}
                onMouseEnter={() => setIsHoverPrimary(true)}
                onMouseLeave={() => setIsHoverPrimary(false)}
                style={{
                  padding: "15px 26px",
                  fontSize: "18px",
                  fontWeight: 700,
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: isHoverPrimary 
                    ? "linear-gradient(135deg, #f87171 0%, #fb923c 100%)" 
                    : "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
                  color: "white",
                  cursor: "pointer",
                  boxShadow: isHoverPrimary
                    ? "0 18px 42px rgba(239, 68, 68, 0.4), 0 8px 24px rgba(249,115,22,0.25)"
                    : "0 14px 34px rgba(239, 68, 68, 0.28), 0 6px 18px rgba(249,115,22,0.18)",
                  transform: isHoverPrimary ? "translateY(-2px)" : "translateY(0)",
                  transition: "all 0.3s ease",
                }}
              >
                Enter Simulation
              </button>

              <button
                onMouseEnter={() => setIsHoverSecondary(true)}
                onMouseLeave={() => setIsHoverSecondary(false)}
                style={{
                  padding: "15px 24px",
                  fontSize: "18px",
                  fontWeight: 500,
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: isHoverSecondary 
                    ? "rgba(255,255,255,0.12)" 
                    : "rgba(255,255,255,0.04)",
                  color: "white",
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                  transform: isHoverSecondary ? "translateY(-2px)" : "translateY(0)",
                  borderColor: isHoverSecondary ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.16)",
                  transition: "all 0.3s ease",
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
    </div>
  );
}