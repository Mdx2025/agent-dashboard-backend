
import React from 'react';
import { COLORS } from '../theme/tokens';

interface StatusPillProps {
    status: "active" | "running" | "idle" | "finished" | "failed" | "queued" | "online" | "offline";
}

export function StatusPill({ status }: StatusPillProps) {
    const statusMap = {
        active: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", color: "#4ade80", dot: COLORS.success },
        running: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", color: "#60a5fa", dot: COLORS.accent },
        idle: { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)", color: COLORS.textSecondary, dot: COLORS.textMuted },
        finished: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", color: "#86efac", dot: COLORS.success },
        failed: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#f87171", dot: COLORS.error },
        queued: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", color: "#fbbf24", dot: COLORS.warn },
        online: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", color: "#4ade80", dot: COLORS.success },
        offline: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#f87171", dot: COLORS.error },
    };

    const s = statusMap[status] || statusMap.idle;

    const dotStyle: React.CSSProperties = {
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: s.dot,
        boxShadow: (status === "running" || status === "active" || status === "online") ? `0 0 6px ${s.dot}` : "none",
        animation: status === "running" ? "pulse 1.5s infinite" : "none",
    };

    const spanStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        color: s.color,
        letterSpacing: 0.3,
        textTransform: 'capitalize',
    };

    return (
        <span style={spanStyle}>
            <span style={dotStyle} />
            {status}
        </span>
    );
}
