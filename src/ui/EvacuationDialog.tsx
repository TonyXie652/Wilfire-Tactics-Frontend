// src/ui/EvacuationDialog.tsx
// 点击引导员弹出的撤离确认对话框

type Props = {
    guideId: string;
    onConfirm: () => void;
    onCancel: () => void;
    position?: { x: number; y: number };
};

export function EvacuationDialog({ guideId, onConfirm, onCancel, position }: Props) {
    return (
        <div
            style={{
                position: "absolute",
                left: position?.x ?? "50%",
                top: position?.y ?? "50%",
                transform: "translate(-50%, -120%)",
                zIndex: 100,
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(16, 185, 129, 0.6)",
                borderRadius: 12,
                padding: "16px 20px",
                color: "white",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                minWidth: 220,
                textAlign: "center",
                animation: "fadeIn 0.2s ease-out",
            }}
        >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                🟢 引导员 {guideId}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                是否开始撤离疏散？
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button
                    onClick={onConfirm}
                    style={{
                        padding: "8px 20px",
                        fontSize: 13,
                        fontWeight: 600,
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "transform 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                    ✅ 开始撤离
                </button>
                <button
                    onClick={onCancel}
                    style={{
                        padding: "8px 16px",
                        fontSize: 13,
                        background: "rgba(100, 116, 139, 0.3)",
                        color: "#94a3b8",
                        border: "1px solid rgba(100, 116, 139, 0.3)",
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "transform 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                    取消
                </button>
            </div>
        </div>
    );
}
