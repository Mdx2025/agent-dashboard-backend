
import React from 'react';
import { COLORS } from '../theme/tokens';

interface ContextBarProps {
    pct: number;
}

export function ContextBar({ pct }: ContextBarProps) {
    const color = pct > 80 ? COLORS.error : pct > 60 ? COLORS.warn : COLORS.accent;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ 
                    width: `${pct}%`, 
                    height: "100%", 
                    borderRadius: 2, 
                    background: color, 
                    transition: "width 300ms ease" 
                }} />
            </div>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
        </div>
    );
}
