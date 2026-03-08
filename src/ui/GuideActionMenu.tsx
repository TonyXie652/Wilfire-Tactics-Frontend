type Props = {
  guideId: string;
  isTracked: boolean;
  position: { x: number; y: number };
  onTrack: () => void;
  onRemove: () => void;
  onClose: () => void;
};

export function GuideActionMenu({
  guideId,
  isTracked,
  position,
  onTrack,
  onRemove,
  onClose,
}: Props) {
  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -115%)",
        zIndex: 120,
        minWidth: 220,
        borderRadius: 12,
        border: "1px solid rgba(16, 185, 129, 0.5)",
        background: "rgba(15, 23, 42, 0.96)",
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.42)",
        backdropFilter: "blur(12px)",
        color: "white",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(148, 163, 184, 0.18)" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Guide {guideId}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
          Select an action
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, padding: 12 }}>
        <button
          onClick={onTrack}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(59, 130, 246, 0.35)",
            background: isTracked ? "rgba(59, 130, 246, 0.25)" : "rgba(59, 130, 246, 0.14)",
            color: "#bfdbfe",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isTracked ? "Tracking" : "Track Logs"}
        </button>

        <button
          onClick={onRemove}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(239, 68, 68, 0.35)",
            background: "rgba(239, 68, 68, 0.14)",
            color: "#fecaca",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Remove Guide
        </button>

        <button
          onClick={onClose}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(148, 163, 184, 0.22)",
            background: "rgba(51, 65, 85, 0.3)",
            color: "#cbd5e1",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
