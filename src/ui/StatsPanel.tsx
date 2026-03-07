type Props = {
  tick: number;
  fireCellsCount: number;
  totalResidents: number;
  safeCount: number;
  deadCount: number;
  movingCount: number;
  isSimDone: boolean;
  hintText: string | null;
};

export function StatsPanel({
  tick,
  fireCellsCount,
  totalResidents,
  safeCount,
  deadCount,
  movingCount,
  isSimDone,
  hintText,
}: Props) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 10,
        background: "rgba(0,0,0,0.75)",
        color: "white",
        padding: "12px 16px",
        borderRadius: "8px",
        fontSize: "13px",
        lineHeight: 1.6,
        minWidth: 180,
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 15 }}>
        🔥 Wildfire Tactics
      </div>
      <div>Tick: {tick}</div>
      <div>🔥 Fire cells: {fireCellsCount}</div>
      <div>👥 Residents: {totalResidents}</div>
      <div style={{ color: "#4caf50" }}>✅ Safe: {safeCount}</div>
      <div style={{ color: "#f44336" }}>💀 Dead: {deadCount}</div>
      <div style={{ color: "#2196f3" }}>🏃 Moving: {movingCount}</div>
      {totalResidents > 0 && (
        <div style={{ marginTop: 4, fontWeight: 600 }}>
          Evacuation Rate: {((safeCount / totalResidents) * 100).toFixed(0)}%
        </div>
      )}
      {isSimDone && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 10px",
            background: deadCount === 0 ? "#2e7d32" : "#b71c1c",
            borderRadius: 4,
            textAlign: "center",
            fontWeight: 700,
          }}
        >
          {deadCount === 0 ? "🎉 ALL SAFE!" : "Simulation Complete"}
        </div>
      )}
      {hintText && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 8px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: 4,
            fontSize: 11,
            color: "#10b981",
          }}
        >
          {hintText}
        </div>
      )}
    </div>
  );
}
