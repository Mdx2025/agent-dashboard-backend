
import React, { useState, useEffect } from 'react';
import { COLORS, typography } from './theme/tokens';

// Import Tabs
import { OverviewTab } from './tabs/OverviewTab';
import { LogsTab } from './tabs/LogsTab';
import { UsageTab } from './tabs/UsageTab';
import { AgentsTab } from './tabs/AgentsTab';
import { SkillsTab } from './tabs/SkillsTab';
import { HealthTab } from './tabs/HealthTab';

// Main App Shell
export default function App() {
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeNav, setActiveNav] = useState("overview");

    useEffect(() => {
        const t = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const navItems = [
        { key: "overview", label: "Overview", icon: "⊞" },
        { key: "logs", label: "Logs", icon: "☰" },
        { key: "usage", label: "Usage", icon: "◎" },
        { key: "agents", label: "Agents", icon: "◈" },
        { key: "skills", label: "Skills", icon: "⚡" },
        { key: "health", label: "Health", icon: "♥" },
    ];
    
    const renderActiveTab = () => {
        switch (activeNav) {
            case "overview": return <OverviewTab />;
            case "logs": return <LogsTab />;
            case "usage": return <UsageTab />;
            case "agents": return <AgentsTab />;
            case "skills": return <SkillsTab />;
            case "health": return <HealthTab />;
            default: return <OverviewTab />;
        }
    };

    return (
        <div style={{ fontFamily: typography.fontFamily, color: COLORS.textPrimary, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

            {/* Top Bar */}
            <header style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: `1px solid ${COLORS.border}`, background: "rgba(10, 14, 26, 0.8)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.accent, letterSpacing: 2 }}>MDX</span>
                    <span style={{ width: 1, height: 20, background: COLORS.border }} />
                    <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 400, letterSpacing: 0.5 }}>Agent Operations</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.success, boxShadow: `0 0 8px ${COLORS.success}`, animation: "pulse 2s infinite" }} />
                        <span style={{ fontSize: 11, color: COLORS.success, fontWeight: 500 }}>Live</span>
                    </div>
                    <span style={{ fontSize: 10, color: COLORS.textMuted, fontVariantNumeric: "tabular-nums" }}>
                        {new Date(currentTime).toLocaleTimeString("en-US", { hour12: false })}
                    </span>
                    <button style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 8px", color: COLORS.textSecondary, cursor: "pointer", fontSize: 12 }}>↻</button>
                    <button onClick={() => setAutoRefresh(!autoRefresh)} style={{ background: autoRefresh ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${autoRefresh ? "rgba(59,130,246,0.4)" : COLORS.border}`, borderRadius: 6, padding: "3px 10px", color: autoRefresh ? COLORS.accent : COLORS.textMuted, cursor: "pointer", fontSize: 10, fontWeight: 500, letterSpacing: 0.5 }}>AUTO</button>
                </div>
            </header>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                {/* Sidebar */}
                <nav style={{ width: sidebarCollapsed ? 52 : 180, minWidth: sidebarCollapsed ? 52 : 180, borderRight: `1px solid ${COLORS.border}`, background: "rgba(10, 14, 26, 0.6)", padding: "12px 0", display: "flex", flexDirection: "column", transition: "all 200ms ease", overflow: "hidden" }}>
                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: "4px 16px", fontSize: 12, textAlign: "left", marginBottom: 8 }}>{sidebarCollapsed ? "→" : "←"}</button>
                    {navItems.map(item => (
                        <button key={item.key} onClick={() => setActiveNav(item.key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: sidebarCollapsed ? "10px 16px" : "10px 16px", background: activeNav === item.key ? "rgba(59,130,246,0.1)" : "transparent", border: "none", borderLeft: activeNav === item.key ? `2px solid ${COLORS.accent}` : "2px solid transparent", color: activeNav === item.key ? COLORS.accentBright : COLORS.textSecondary, cursor: "pointer", fontSize: 12, fontWeight: activeNav === item.key ? 600 : 400, transition: "all 150ms ease", width: "100%", textAlign: "left", fontFamily: "inherit" }}>
                            <span style={{ fontSize: 14, width: 18, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                            {!sidebarCollapsed && <span>{item.label}</span>}
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.success }} />
                            {!sidebarCollapsed && <span style={{ fontSize: 10, color: COLORS.textMuted }}>System Online</span>}
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
                    {renderActiveTab()}
                </main>
            </div>
        </div>
    );
}
