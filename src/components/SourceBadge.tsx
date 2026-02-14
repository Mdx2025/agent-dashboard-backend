
import React from 'react';
import { COLORS } from '../theme/tokens';

interface SourceBadgeProps {
    source: "MAIN" | "SUBAGENT" | "CRON";
}

export function SourceBadge({ source }: SourceBadgeProps) {
    const map = {
        MAIN: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", color: COLORS.accentBright },
        SUBAGENT: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", color: COLORS.purple },
        CRON: { bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.3)", color: COLORS.cyan },
    };

    const s = map[source] || map.MAIN;

    const style: React.CSSProperties = {
        padding: "2px 6px",
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        color: s.color,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    };

    return <span style={style}>{source}</span>;
}
