import React from 'react';


interface TerrainProps { 
  offsetX: number; 
  offsetY: number; 
}

export const TerrainWireframe: React.FC<TerrainProps> = ({ offsetX, offsetY }) => {
  // --- 第一部分：地形生成逻辑 ---
  const GRID_SIZE = 22; // 网格密度
  const terrainPaths = [];
  const firePos = { x: 0, y: 0 }; // 记录起火点坐标
  

  // 生成地形网格线
  for (let r = 0; r < GRID_SIZE; r++) {
    let rowPath = "M ";
    for (let c = 0; c < GRID_SIZE; c++) {
      // 数学函数生成地形高度 (Z轴)
      const z1 = 150 * Math.exp(-(Math.pow(r - 10, 2) + Math.pow(c - 12, 2)) / 15);
      const z2 = 60 * Math.exp(-(Math.pow(r - 16, 2) + Math.pow(c - 5, 2)) / 10);
      const z = z1 + z2;

      // 等轴测投影转换为 2D 坐标
      const x = 300 + (c - r) * 15;
      const y = 380 + (c + r) * 7.5 - z; 

      if (r === 10 && c === 12) {
        firePos.x = x;
        firePos.y = y;
      }
      rowPath += `${x},${y} `;
    }
    terrainPaths.push(
      <path key={`row-${r}`} d={rowPath} stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
    );
  }

  // 添加纵向线
  for (let c = 0; c < GRID_SIZE; c++) {
    let colPath = "M ";
    for (let r = 0; r < GRID_SIZE; r++) {
      const z1 = 150 * Math.exp(-(Math.pow(r - 10, 2) + Math.pow(c - 12, 2)) / 15);
      const z2 = 60 * Math.exp(-(Math.pow(r - 16, 2) + Math.pow(c - 5, 2)) / 10);
      const z = z1 + z2;
      const x = 300 + (c - r) * 15;
      const y = 380 + (c + r) * 7.5 - z;
      colPath += `${x},${y} `;
    }
    terrainPaths.push(
      <path key={`col-${c}`} d={colPath} stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none" />
    );
  }

  // --- 第二部分：渲染视图 ---
  return (
    <div
      style={{
        position: "absolute",
        right: "40%",
        top: "-12%",
        width: "42%",
        height: "84%",
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        transition: "transform 180ms ease-out",
        pointerEvents: "none",
        opacity: 0.85,
      }}
    >
      <svg viewBox="0 0 600 600" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <filter id="fireGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <style>
            {`
              .fire-ring { transform-origin: ${firePos.x}px ${firePos.y}px; animation: fireSpread 4s infinite ease-out; }
              .fire-ring-delay-1 { animation-delay: 1.3s; }
              .fire-ring-delay-2 { animation-delay: 2.6s; }
              @keyframes fireSpread {
                0% { transform: scale(0.2); opacity: 0.8; stroke-width: 2px; }
                100% { transform: scale(4.5); opacity: 0; stroke-width: 0.5px; }
              }
              @keyframes pulseLight {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 1; }
              }
            `}
          </style>
        </defs>

        <g>{terrainPaths}</g>

        <g filter="url(#fireGlow)">
          <line x1={firePos.x} y1={firePos.y} x2={firePos.x} y2={firePos.y - 120} stroke="#ff4d4d" strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: "pulseLight 2s infinite" }} />
          <circle cx={firePos.x} cy={firePos.y} r="20" fill="none" stroke="#ff6b6b" className="fire-ring" />
          <circle cx={firePos.x} cy={firePos.y} r="20" fill="none" stroke="#ff9e42" className="fire-ring fire-ring-delay-1" />
          <circle cx={firePos.x} cy={firePos.y} r="20" fill="none" stroke="#ff4d4d" className="fire-ring fire-ring-delay-2" />
          <circle cx={firePos.x} cy={firePos.y} r="4" fill="#ffffff" />
          <circle cx={firePos.x} cy={firePos.y} r="8" fill="#ff4d4d" opacity="0.8" style={{ animation: "pulseLight 1s infinite" }} />
        </g>

        <g transform={`translate(${firePos.x + 20}, ${firePos.y - 110})`} fill="#ff4d4d" style={{ fontSize: "12px", fontFamily: "monospace", animation: "pulseLight 2s infinite" }}>
          <rect x="-5" y="-12" width="130" height="40" fill="rgba(255, 77, 77, 0.1)" stroke="#ff4d4d" strokeWidth="0.5" rx="2" />
          <text x="5" y="3" fill="#fff">LOC: PEAK ALPHA</text>
          <text x="5" y="19" fill="#ff9e42">STATUS: IGNITED</text>
          <circle cx="-15" cy="-2" r="2" fill="#ff4d4d" />
          <path d="M -15,-2 L -5,3" stroke="#ff4d4d" strokeWidth="0.5" />
        </g>
      </svg>
    </div>
  );
};