import { useEffect, useMemo, useState } from "react";
import { TerrainWireframe } from '../components/TerrainWireframe';


type Orb = {
  width: number;
  height: number;
  top: string;
  left: string;
  delay: string;
  duration: string;
};

type Ember = {
  left: string;
  bottom: string;
  size: number;
  delay: string;
  duration: string;
  opacity: number;
  drift: number;
  flicker: number;
  blur: number;
};

export default function AnimatedBackground() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouse({ x, y });
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const orbs = useMemo<Orb[]>(
    () => [
      { width: 220, height: 220, top: "10%", left: "10%", delay: "0s", duration: "14s" },
      { width: 180, height: 180, top: "18%", left: "72%", delay: "2s", duration: "18s" },
      { width: 260, height: 260, top: "58%", left: "18%", delay: "4s", duration: "20s" },
      { width: 160, height: 160, top: "70%", left: "76%", delay: "1s", duration: "16s" },
      { width: 120, height: 120, top: "42%", left: "52%", delay: "3s", duration: "12s" },
    ],
    []
  );

  const embers = useMemo<Ember[]>(
    () =>
        Array.from({ length: 72 }, (_, i) => {
         const isLarge = i % 11 === 0;
         const isMedium = i % 4 === 0;

         return {
            left: `${2 + ((i * 7.3) % 96)}%`,
            bottom: `${-12 - (i % 8) * 6}%`,
            size: isLarge ? 6 : isMedium ? 4 : 2 + (i % 2),
            delay: `${(i % 12) * 0.38}s`,
            duration: `${8 + (i % 9) * 1.3}s`,
            opacity: isLarge ? 0.9 : isMedium ? 0.68 : 0.38 + (i % 4) * 0.08,
            drift: ((i % 5) - 2) * (isLarge ? 18 : isMedium ? 12 : 8),
            flicker: 1.6 + (i % 6) * 0.35,
            blur: isLarge ? 1.2 : isMedium ? 0.8 : 0.3,
            };
        }),
        []
    );

  const slowX = mouse.x * 26;
  const slowY = mouse.y * 18;
  const midX = mouse.x * 46;
  const midY = mouse.y * 30;
  const fastX = mouse.x * 70;
  const fastY = mouse.y * 42;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        background:
          "linear-gradient(120deg, #07101f 0%, #08162d 26%, #101c2f 55%, #1a1f2c 75%, #241816 100%)",
        backgroundSize: "200% 200%",
        animation: "gradientFlow 16s ease infinite",
      }}
    >
      {/* 主体渐变层：轻微鼠标视差 */}
      <div
        style={{
          position: "absolute",
          inset: "-4%",
          transform: `translate(${slowX}px, ${slowY}px) scale(1.03)`,
          transition: "transform 220ms ease-out",
        }}
      >
        {/* 左下火光 */}
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            left: "-140px",
            bottom: "-140px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(239,68,68,0.26) 0%, rgba(249,115,22,0.14) 38%, rgba(239,68,68,0.05) 58%, transparent 78%)",
            filter: "blur(40px)",
            animation: "pulseGlow 7s ease-in-out infinite",
          }}
        />

        {/* 右上暖光 */}
        <div
          style={{
            position: "absolute",
            width: 460,
            height: 460,
            right: "-100px",
            top: "-80px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(251,146,60,0.18) 0%, rgba(249,115,22,0.09) 42%, transparent 75%)",
            filter: "blur(38px)",
            animation: "pulseGlow 9s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* 科技网格 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.55,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.65), rgba(0,0,0,0.25))",
        }}
      />

        


      <TerrainWireframe offsetX={slowX * 0.3} offsetY={slowY * 0.3} />



    

      {/* 漂浮大光斑 */}
      {orbs.map((orb, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: orb.width,
            height: orb.height,
            top: orb.top,
            left: orb.left,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,140,80,0.14) 0%, rgba(255,90,40,0.07) 40%, transparent 72%)",
            filter: "blur(22px)",
            animation: `floatOrb ${orb.duration} ease-in-out ${orb.delay} infinite`,
            transform: `translate(${midX * 0.6}px, ${midY * 0.6}px)`,
            transition: "transform 240ms ease-out",
          }}
        />
      ))}

      {/* 底部烟雾层 1 */}
      <div
        style={{
          position: "absolute",
          left: "-10%",
          right: "-10%",
          bottom: "-18%",
          height: "42%",
          pointerEvents: "none",
          transform: `translate(${slowX * 0.5}px, ${slowY * 0.3}px)`,
          transition: "transform 260ms ease-out",
        }}
      >
    

      </div>

      {/* 底部烟雾层 2 */}
      <div
        style={{
          position: "absolute",
          left: "-6%",
          right: "-6%",
          bottom: "-22%",
          height: "46%",
          pointerEvents: "none",
          transform: `translate(${midX * 0.35}px, ${midY * 0.2}px)`,
          transition: "transform 320ms ease-out",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 15% 90%, rgba(220,220,220,0.08) 0%, rgba(130,130,130,0.05) 32%, transparent 60%), radial-gradient(ellipse at 55% 92%, rgba(210,210,210,0.09) 0%, rgba(120,120,120,0.05) 34%, transparent 62%), radial-gradient(ellipse at 85% 88%, rgba(190,190,190,0.08) 0%, rgba(100,100,100,0.05) 28%, transparent 60%)",
            filter: "blur(46px)",
            animation: "smokeRise2 24s ease-in-out infinite",
          }}
        />
      </div>

      {/* ember 粒子 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${fastX * 0.23}px, ${fastY * 0.15}px)`,
          transition: "transform 140ms ease-out",
        }}
      >
        {embers.map((ember, i) => (
            <div
                key={i}
                style={{
                position: "absolute",
                left: ember.left,
                bottom: ember.bottom,
                width: ember.size,
                height: ember.size,
                transform: `translate3d(${ember.drift * 0.2}px, 0, 0)`,
                animation: `emberRiseReal ${ember.duration} linear ${ember.delay} infinite`,
                transition: "transform 120ms ease-out",
                pointerEvents: "none",
            }}
        >
            <div
                style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background:
                    ember.size >= 6
                    ? "radial-gradient(circle, rgba(255,245,210,1) 0%, rgba(255,180,90,0.95) 28%, rgba(255,110,40,0.75) 58%, rgba(255,90,40,0.08) 100%)"
                    : ember.size >= 4
                    ? "radial-gradient(circle, rgba(255,235,190,0.98) 0%, rgba(255,165,80,0.92) 36%, rgba(255,100,40,0.55) 70%, rgba(255,90,40,0.06) 100%)"
                    : "radial-gradient(circle, rgba(255,220,170,0.95) 0%, rgba(255,145,70,0.88) 42%, rgba(255,90,40,0.18) 100%)",
                opacity: ember.opacity,
                filter: `blur(${ember.blur}px)`,
                boxShadow:
                    ember.size >= 6
                    ? "0 0 10px rgba(255,210,120,0.88), 0 0 22px rgba(255,130,50,0.42), 0 0 40px rgba(255,90,40,0.18)"
                    : ember.size >= 4
                    ? "0 0 8px rgba(255,190,90,0.72), 0 0 18px rgba(255,120,40,0.28)"
                    : "0 0 5px rgba(255,180,80,0.55), 0 0 10px rgba(255,110,40,0.16)",
                animation: `
                    emberFlickerReal ${ember.flicker}s ease-in-out ${(i % 5) * 0.21}s infinite,
                    emberPulse ${2.8 + (i % 4) * 0.45}s ease-in-out ${(i % 3) * 0.2}s infinite
                `,
                transformOrigin: "center center",
            }}
            />
            </div>
            ))}
      </div>

      {/* 暗角 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, transparent 42%, rgba(0,0,0,0.24) 100%)",
        }}
      />

      <style>
        {`
          @keyframes gradientFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @keyframes floatOrb {
            0% {
              transform: translate3d(0, 0, 0) scale(1);
              opacity: 0.55;
            }
            25% {
              transform: translate3d(16px, -18px, 0) scale(1.06);
              opacity: 0.72;
            }
            50% {
              transform: translate3d(-10px, -30px, 0) scale(0.96);
              opacity: 0.5;
            }
            75% {
              transform: translate3d(12px, -10px, 0) scale(1.03);
              opacity: 0.68;
            }
            100% {
              transform: translate3d(0, 0, 0) scale(1);
              opacity: 0.55;
            }
          }

          @keyframes pulseGlow {
            0% {
              transform: scale(1);
              opacity: 0.72;
            }
            50% {
              transform: scale(1.08);
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 0.72;
            }
          }

          @keyframes smokeRise1 {
            0% {
              transform: translateY(20px) scale(1.02);
              opacity: 0.45;
            }
            50% {
              transform: translateY(-16px) scale(1.08);
              opacity: 0.6;
            }
            100% {
              transform: translateY(20px) scale(1.02);
              opacity: 0.45;
            }
          }

          @keyframes smokeRise2 {
            0% {
              transform: translateY(28px) scale(1);
              opacity: 0.32;
            }
            50% {
              transform: translateY(-22px) scale(1.1);
              opacity: 0.5;
            }
            100% {
              transform: translateY(28px) scale(1);
              opacity: 0.32;
            }
          }

@keyframes emberRiseReal {
  0% {
    transform: translate3d(0px, 0px, 0) scale(0.72) rotate(0deg);
    opacity: 0;
  }
  6% {
    opacity: 1;
  }
  18% {
    transform: translate3d(-8px, -90px, 0) scale(1.05) rotate(8deg);
    opacity: 0.95;
  }
  36% {
    transform: translate3d(12px, -180px, 0) scale(0.96) rotate(-10deg);
    opacity: 0.88;
  }
  54% {
    transform: translate3d(-10px, -290px, 0) scale(0.82) rotate(12deg);
    opacity: 0.74;
  }
  76% {
    transform: translate3d(16px, -400px, 0) scale(0.62) rotate(-14deg);
    opacity: 0.42;
  }
  100% {
    transform: translate3d(-6px, -540px, 0) scale(0.28) rotate(18deg);
    opacity: 0;
  }
}

@keyframes emberFlickerReal {
  0% {
    opacity: 0.42;
    filter: brightness(0.85);
  }
  18% {
    opacity: 0.95;
    filter: brightness(1.18);
  }
  34% {
    opacity: 0.58;
    filter: brightness(0.92);
  }
  52% {
    opacity: 1;
    filter: brightness(1.26);
  }
  73% {
    opacity: 0.7;
    filter: brightness(1);
  }
  100% {
    opacity: 0.5;
    filter: brightness(0.88);
  }
}

@keyframes emberPulse {
  0% {
    transform: scale(0.95);
  }
  50% {
    transform: scale(1.14);
  }
  100% {
    transform: scale(0.95);
  }
}  
        

        `}
      </style>
    </div>
  );
}