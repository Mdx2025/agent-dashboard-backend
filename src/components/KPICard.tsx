
import React, { ReactNode } from 'react';
import { COLORS } from '../theme/tokens';
import { GlassCard } from './GlassCard';

interface KPICardProps {
    label: string;
    value?: string | number;
    sub?: string;
    icon?: ReactNode;
    accent?: string;
    trend?: string;
    children?: ReactNode;
}

export function KPICard({ label, value, sub, icon, accent = COLORS.accent, trend, children }: KPICardProps) {
    return (
        <GlassCard hover style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    {label}
                </span>
                <span style={{ fontSize: 16, opacity: 0.4 }}>{icon}</span>
            </div>
            
            {value && (
                <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: -0.5, lineHeight: 1.1 }}>
                    {value}
                </div>
            )}

            {children}
            
            {sub && <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{sub}</div>}
            
            {trend && (
                <div style={{ 
                    fontSize: 11, 
                    color: trend.startsWith("+") ? COLORS.success : trend.startsWith("-") ? COLORS.error : COLORS.textMuted, 
                    marginTop: 4, 
                    fontWeight: 500 
                }}>
                    {trend}
                </div>
            )}
        </GlassCard>
    );
}
