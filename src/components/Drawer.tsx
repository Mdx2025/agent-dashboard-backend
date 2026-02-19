
import React, { ReactNode } from 'react';
import { COLORS } from '../theme/tokens';

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
    if (!open) {
        return null;
    }

    const overlayStyle: React.CSSProperties = {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 999,
        animation: "fadeIn 150ms ease",
    };

    const drawerStyle: React.CSSProperties = {
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 480,
        maxWidth: "90vw",
        background: "linear-gradient(180deg, #0d1326 0%, #0a0e1a 100%)",
        borderLeft: `1px solid ${COLORS.border}`,
        zIndex: 1000,
        boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
        animation: "slideIn 200ms ease",
        overflowY: "auto",
    };

    const headerStyle: React.CSSProperties = {
        padding: "20px 24px",
        borderBottom: `1px solid ${COLORS.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        background: "rgba(13,19,38,0.95)",
        backdropFilter: "blur(12px)",
        zIndex: 1,
    };

    return (
        <>
            <div onClick={onClose} style={overlayStyle} />
            <div style={drawerStyle}>
                <div style={headerStyle}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>{title}</span>
                    <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "4px 10px", color: COLORS.textSecondary, cursor: "pointer", fontSize: 12 }}>
                        ✕
                    </button>
                </div>
                <div style={{ padding: 24 }}>{children}</div>
            </div>
        </>
    );
}
