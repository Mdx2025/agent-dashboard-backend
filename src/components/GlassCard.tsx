
import React, { useState, CSSProperties, ReactNode } from 'react';
import { COLORS } from '../theme/tokens';

interface GlassCardProps {
    children: ReactNode;
    style?: CSSProperties;
    hover?: boolean;
    onClick?: () => void;
    padding?: string | number;
}

export function GlassCard({ children, style, hover = false, onClick, padding = "24px" }: GlassCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    const baseStyle: CSSProperties = {
        background: isHovered && hover ? COLORS.bgCardHover : COLORS.bgCard,
        backdropFilter: "blur(20px)",
        border: `1px solid ${isHovered && hover ? COLORS.borderHover : COLORS.border}`,
        borderRadius: 12,
        padding,
        transition: "all 180ms ease",
        transform: isHovered && hover ? "translateY(-1px)" : "none",
        boxShadow: isHovered && hover 
            ? `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${COLORS.borderHover}, inset 0 1px 0 rgba(255,255,255,0.03)` 
            : "0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)",
        cursor: onClick ? "pointer" : "default",
        ...style,
    };

    return (
        <div 
            onClick={onClick} 
            onMouseEnter={() => setIsHovered(true)} 
            onMouseLeave={() => setIsHovered(false)} 
            style={baseStyle}
        >
            {children}
        </div>
    );
}
