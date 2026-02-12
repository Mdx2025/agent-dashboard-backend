import { useState, useEffect, useRef } from "react";

// ─── Mock Data ───────────────────────────────────────────────────────────
const MOCK_SUMMARY = {
  activeSessions: 7,
  totalTokensAllTime: 2847210,
  totalTokens24h: 412850,
  totalCostAllTime: 61.65,
  totalCost24h: 12.45,
  totalRequests: 689,
  requests24h: 145,
  agents: 5,
  mainModel: "anthropic/claude-opus-4",
  errors24h: 2,
  gateway: { status: "online", host: "gw-us-east-1.openclaw.dev", lastHeartbeat: Date.now() - 4200 },
  lastUpdateAt: new Date().toISOString(),
};

const MOCK_AGENTS = [
  { id: "main-agent", name: "MainAgent", type: "MAIN", status: "active", model: "anthropic/claude-opus-4", lastRun: Date.now() - 120000, runs24h: 67, errors24h: 0 },
  { id: "research-sub", name: "ResearchBot", type: "SUBAGENT", status: "active", model: "anthropic/claude-sonnet-4", lastRun: Date.now() - 300000, runs24h: 34, errors24h: 1 },
  { id: "code-sub", name: "CodeWriter", type: "SUBAGENT", status: "idle", model: "google/gemini-2.5-pro", lastRun: Date.now() - 900000, runs24h: 22, errors24h: 0 },
  { id: "data-sub", name: "DataAnalyst", type: "SUBAGENT", status: "active", model: "openai/gpt-4o", lastRun: Date.now() - 60000, runs24h: 18, errors24h: 1 },
  { id: "monitor-sub", name: "HealthMonitor", type: "SUBAGENT", status: "idle", model: "anthropic/claude-haiku-4", lastRun: Date.now() - 1800000, runs24h: 4, errors24h: 0 },
];

const MOCK_SESSIONS = [
  { id: "sess_a1b2c3", status: "active", started: Date.now() - 3600000, lastSeen: Date.now() - 12000, tokens24h: 89420, model: "claude-opus-4", agent: "MainAgent" },
  { id: "sess_d4e5f6", status: "active", started: Date.now() - 7200000, lastSeen: Date.now() - 45000, tokens24h: 67100, model: "claude-sonnet-4", agent: "ResearchBot" },
  { id: "sess_g7h8i9", status: "active", started: Date.now() - 1800000, lastSeen: Date.now() - 5000, tokens24h: 34200, model: "gemini-2.5-pro", agent: "CodeWriter" },
  { id: "sess_j0k1l2", status: "active", started: Date.now() - 900000, lastSeen: Date.now() - 120000, tokens24h: 22050, model: "gpt-4o", agent: "DataAnalyst" },
  { id: "sess_m3n4o5", status: "active", started: Date.now() - 5400000, lastSeen: Date.now() - 300000, tokens24h: 15800, model: "claude-opus-4", agent: "MainAgent" },
  { id: "sess_p6q7r8", status: "idle", started: Date.now() - 10800000, lastSeen: Date.now() - 600000, tokens24h: 8900, model: "claude-haiku-4", agent: "HealthMonitor" },
  { id: "sess_s9t0u1", status: "active", started: Date.now() - 2700000, lastSeen: Date.now() - 20000, tokens24h: 41300, model: "claude-opus-4", agent: "MainAgent" },
];

const MOCK_RUNS = [
  { id: "run_001", source: "MAIN", label: "User query: deploy analysis", status: "running", started: Date.now() - 45000, duration: null, model: "claude-opus-4", contextPct: 67, tokensIn: 12400, tokensOut: 3200, finishReason: null },
  { id: "run_002", source: "SUBAGENT", label: "Research: API rate limits", status: "running", started: Date.now() - 30000, duration: null, model: "claude-sonnet-4", contextPct: 42, tokensIn: 8900, tokensOut: 1800, finishReason: null },
  { id: "run_003", source: "CRON", label: "Scheduled: health check", status: "finished", started: Date.now() - 120000, duration: 4200, model: "claude-haiku-4", contextPct: 12, tokensIn: 2100, tokensOut: 890, finishReason: "stop" },
  { id: "run_004", source: "MAIN", label: "User query: refactor auth module", status: "finished", started: Date.now() - 300000, duration: 18400, model: "claude-opus-4", contextPct: 78, tokensIn: 34500, tokensOut: 12800, finishReason: "stop" },
  { id: "run_005", source: "SUBAGENT", label: "Code generation: middleware", status: "finished", started: Date.now() - 420000, duration: 8900, model: "gemini-2.5-pro", contextPct: 55, tokensIn: 18200, tokensOut: 7600, finishReason: "stop" },
  { id: "run_006", source: "MAIN", label: "User query: database optimization", status: "failed", started: Date.now() - 600000, duration: 2100, model: "claude-opus-4", contextPct: 89, tokensIn: 42000, tokensOut: 200, finishReason: "error" },
  { id: "run_007", source: "SUBAGENT", label: "Data analysis: usage metrics", status: "finished", started: Date.now() - 720000, duration: 6700, model: "gpt-4o", contextPct: 34, tokensIn: 9800, tokensOut: 4500, finishReason: "stop" },
  { id: "run_008", source: "CRON", label: "Scheduled: token audit", status: "finished", started: Date.now() - 900000, duration: 3200, model: "claude-haiku-4", contextPct: 8, tokensIn: 1200, tokensOut: 600, finishReason: "stop" },
  { id: "run_009", source: "MAIN", label: "User query: implement caching layer", status: "finished", started: Date.now() - 1200000, duration: 22100, model: "claude-opus-4", contextPct: 82, tokensIn: 38900, tokensOut: 15200, finishReason: "stop" },
  { id: "run_010", source: "SUBAGENT", label: "Research: Redis best practices", status: "queued", started: Date.now() - 10000, duration: null, model: "claude-sonnet-4", contextPct: 0, tokensIn: 0, tokensOut: 0, finishReason: null },
  { id: "run_011", source: "MAIN", label: "User query: CI/CD pipeline setup", status: "finished", started: Date.now() - 1500000, duration: 15600, model: "claude-opus-4", contextPct: 71, tokensIn: 28700, tokensOut: 11400, finishReason: "stop" },
  { id: "run_012", source: "CRON", label: "Scheduled: dependency scan", status: "finished", started: Date.now() - 1800000, duration: 5400, model: "claude-haiku-4", contextPct: 15, tokensIn: 3400, tokensOut: 1200, finishReason: "stop" },
];

const MOCK_USAGE_BREAKDOWN = [
  { model: "claude-opus-4", provider: "Anthropic", requests: 145, tokensIn: 234000, tokensOut: 89000, cost: 12.45, pct: 42 },
  { model: "claude-sonnet-4", provider: "Anthropic", requests: 89, tokensIn: 156000, tokensOut: 67000, cost: 8.32, pct: 24 },
  { model: "gemini-2.5-pro", provider: "Google", requests: 67, tokensIn: 89000, tokensOut: 45000, cost: 6.78, pct: 18 },
  { model: "gpt-4o", provider: "OpenAI", requests: 34, tokensIn: 45000, tokensOut: 22000, cost: 3.42, pct: 10 },
  { model: "claude-haiku-4", provider: "Anthropic", requests: 22, tokensIn: 18000, tokensOut: 8000, cost: 0.68, pct: 6 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
  return n.toLocaleString();
};

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const durFmt = (ms) => {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

// ─── Style Constants ─────────────────────────────────────────────────────
const COLORS = {
  bg: "#0a0e1a",
  bgCard: "rgba(14, 20, 36, 0.7)",
  bgCardHover: "rgba(18, 26, 48, 0.85)",
  border: "rgba(56, 78, 135, 0.25)",
  borderHover: "rgba(56, 120, 255, 0.4)",
  accent: "#3b82f6",
  accentGlow: "rgba(59, 130, 246, 0.15)",
  accentBright: "#60a5fa",
  success: "#22c55e",
  successGlow: "rgba(34, 197, 94, 0.2)",
  warn: "#f59e0b",
  warnGlow: "rgba(245, 158, 11, 0.15)",
  error: "#ef4444",
  errorGlow: "rgba(239, 68, 68, 0.15)",
  textPrimary: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  cyan: "#06b6d4",
  purple: "#a78bfa",
};

// ─── Components ──────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    active: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", color: "#4ade80", dot: "#22c55e" },
    running: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", color: "#60a5fa", dot: "#3b82f6" },
    idle: { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)", color: "#94a3b8", dot: "#64748b" },
    finished: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", color: "#86efac", dot: "#22c55e" },
    failed: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#f87171", dot: "#ef4444" },
    queued: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", color: "#fbbf24", dot: "#f59e0b" },
    online: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", color: "#4ade80", dot: "#22c55e" },
    offline: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#f87171", dot: "#ef4444" },
  };
  const s = map[status] || map.idle;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 6, fontSize: 11, fontWeight: 500, color: s.color, letterSpacing: 0.3, }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, boxShadow: status === "running" || status === "active" ? `0 0 6px ${s.dot}` : "none", animation: status === "running" ? "pulse 1.5s infinite" : "none" }} />
      {status}
    </span>
  );
}

function SourceBadge({ source }) {
  const map = {
    MAIN: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", color: "#60a5fa" },
    SUBAGENT: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", color: "#a78bfa" },
    CRON: { bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.3)", color: "#22d3ee" },
  };
  const s = map[source] || map.MAIN;
  return (
    <span style={{ padding: "2px 6px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 4, fontSize: 10, fontWeight: 600, color: s.color, letterSpacing: 0.5, textTransform: "uppercase", }}>{source}</span>
  );
}

function GlassCard({ children, style, hover = false, onClick, padding = "16px" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ background: hovered && hover ? COLORS.bgCardHover : COLORS.bgCard, backdropFilter: "blur(20px)", border: `1px solid ${hovered && hover ? COLORS.borderHover : COLORS.border}`, borderRadius: 12, padding, transition: "all 180ms ease", transform: hovered && hover ? "translateY(-1px)" : "none", boxShadow: hovered && hover ? `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${COLORS.borderHover}, inset 0 1px 0 rgba(255,255,255,0.03)` : "0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)", cursor: onClick ? "pointer" : "default", ...style, }} >{children}</div>
  );
}

function KPICard({ label, value, sub, icon, accent = COLORS.accent, trend }) {
  return (
    <GlassCard hover style={{ minWidth: 0, flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</span>
        <span style={{ fontSize: 16, opacity: 0.4 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: -0.5, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{sub}</div>}
      {trend && (
        <div style={{ fontSize: 11, color: trend.startsWith("+") ? COLORS.success : trend.startsWith("-") ? COLORS.error : COLORS.textMuted, marginTop: 4, fontWeight: 500 }}>
          {trend}
        </div>
      )}
    </GlassCard>
  );
}

function ContextBar({ pct }) {
  const color = pct > 80 ? COLORS.error : pct > 60 ? COLORS.warn : COLORS.accent;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: color, transition: "width 300ms ease" }} />
      </div>
      <span style={{ fontSize: 11, color: COLORS.textMuted, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
    </div>
  );
}

// ─── Drawer ──────────────────────────────────────────────────────────────
function Drawer({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 999, animation: "fadeIn 150ms ease", }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, maxWidth: "90vw", background: "linear-gradient(180deg, #0d1326 0%, #0a0e1a 100%)", borderLeft: `1px solid ${COLORS.border}`, zIndex: 1000, boxShadow: "-8px 0 40px rgba(0,0,0,0.5)", animation: "slideIn 200ms ease", overflowY: "auto", }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "rgba(13,19,38,0.95)", backdropFilter: "blur(12px)", zIndex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>{title}</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "4px 10px", color: COLORS.textSecondary, cursor: "pointer", fontSize: 12 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────
export default function MDXDashboard() {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("overview");
  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const filteredSessions = MOCK_SESSIONS.filter(s => s.id.toLowerCase().includes(sessionSearch.toLowerCase()) || s.agent.toLowerCase().includes(sessionSearch.toLowerCase()) );

  const navItems = [
    { key: "overview", label: "Overview", icon: "⊞" },
    { key: "logs", label: "Logs", icon: "☰" },
    { key: "usage", label: "Usage", icon: "◎" },
    { key: "agents", label: "Agents", icon: "◈" },
    { key: "skills", label: "Skills", icon: "⚡" },
    { key: "health", label: "Health", icon: "♥" },
  ];

  const suggestedTabs = [
    { key: "workflows", label: "Workflows", icon: "⟐", desc: "Multi-step agent pipelines & DAGs" },
    { key: "tools", label: "Tools", icon: "⚙", desc: "MCP tools registry & invocation logs" },
    { key: "memory", label: "Memory", icon: "◉", desc: "Vector store & context management" },
    { key: "alerts", label: "Alerts", icon: "△", desc: "Thresholds, anomalies & notifications" },
    { key: "playground", label: "Playground", icon: "▷", desc: "Test agents interactively" },
  ];

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace", background: `radial-gradient(ellipse at 20% 0%, rgba(15,23,60,1) 0%, ${COLORS.bg} 60%)`, color: COLORS.textPrimary, minHeight: "100vh", display: "flex", flexDirection: "column", }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        input::placeholder { color: rgba(148,163,184,0.5); }
      `}</style>

      {/* ── Top Bar ─────────────────────────────────── */}
      <header style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: `1px solid ${COLORS.border}`, background: "rgba(10, 14, 26, 0.8)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, }}>
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
          <button style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 8px", color: COLORS.textSecondary, cursor: "pointer", fontSize: 12, }}>↻</button>
          <button onClick={() => setAutoRefresh(!autoRefresh)} style={{ background: autoRefresh ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${autoRefresh ? "rgba(59,130,246,0.4)" : COLORS.border}`, borderRadius: 6, padding: "3px 10px", color: autoRefresh ? COLORS.accent : COLORS.textMuted, cursor: "pointer", fontSize: 10, fontWeight: 500, letterSpacing: 0.5, }} >
            AUTO
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Sidebar ───────────────────────────────── */}
        <nav style={{ width: sidebarCollapsed ? 52 : 180, minWidth: sidebarCollapsed ? 52 : 180, borderRight: `1px solid ${COLORS.border}`, background: "rgba(10, 14, 26, 0.6)", padding: "12px 0", display: "flex", flexDirection: "column", transition: "all 200ms ease", overflow: "hidden", }}>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: "4px 16px", fontSize: 12, textAlign: "left", marginBottom: 8, }} >{sidebarCollapsed ? "→" : "←"}</button>
          {navItems.map(item => (
            <button key={item.key} onClick={() => setActiveNav(item.key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: sidebarCollapsed ? "10px 16px" : "10px 16px", background: activeNav === item.key ? "rgba(59,130,246,0.1)" : "transparent", border: "none", borderLeft: activeNav === item.key ? `2px solid ${COLORS.accent}` : "2px solid transparent", color: activeNav === item.key ? COLORS.accentBright : COLORS.textSecondary, cursor: "pointer", fontSize: 12, fontWeight: activeNav === item.key ? 600 : 400, transition: "all 150ms ease", width: "100%", textAlign: "left", fontFamily: "inherit", }}>
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

        {/* ── Main Content ──────────────────────────── */}
        <main style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {/* Page Header */}
          <div style={{ marginBottom: 20, display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: COLORS.textPrimary, letterSpacing: -0.3 }}>Overview</h1>
            <span style={{ fontSize: 11, color: COLORS.textMuted }}>Real-time agent operations monitoring</span>
          </div>

          {/* ── KPI Row ────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
            <KPICard label="Active Sessions" value={MOCK_SUMMARY.activeSessions} icon="◉" accent={COLORS.success} sub={`${MOCK_SESSIONS.filter(s => s.status === "active").length} connected`} />
            <KPICard label="Total Tokens" value={fmt(MOCK_SUMMARY.totalTokensAllTime)} icon="◇" accent={COLORS.accent} sub={`${fmt(MOCK_SUMMARY.totalTokens24h)} last 24h`} trend="+18% vs yesterday" />
            <KPICard label="Cost" value={`$${MOCK_SUMMARY.totalCostAllTime.toFixed(2)}`} icon="$" accent={COLORS.warn} sub={`$${MOCK_SUMMARY.totalCost24h.toFixed(2)} last 24h`} trend="+12% vs last period" />
            <KPICard label="Agents" value={MOCK_SUMMARY.agents} icon="◈" accent={COLORS.purple} sub={`1 main + ${MOCK_SUMMARY.agents - 1} subagents`} />
            <GlassCard style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>Main Model</span>
                <span style={{ fontSize: 16, opacity: 0.4 }}>⬡</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.cyan, marginTop: -4, wordBreak: "break-all", lineHeight: 1.3 }}>{MOCK_SUMMARY.mainModel}</div>
            </GlassCard>
          </div>

          {/* ── Agents Quick Strip ─────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Agents</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {MOCK_AGENTS.map(a => (
                <GlassCard key={a.id} hover onClick={() => setSelectedAgent(a)} style={{ minWidth: 180, flex: "0 0 auto" }} padding="10px 14px" >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary }}>{a.name}</span>
                    <StatusPill status={a.status} />
                  </div>
                  <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 2 }}>{a.model}</div>
                  <div style={{ display: "flex", gap: 12, fontSize: 10, color: COLORS.textMuted }}>
                    <span>{a.runs24h} runs</span>
                    <span style={{ color: a.errors24h > 0 ? COLORS.error : COLORS.textMuted }}> {a.errors24h} errors </span>
                    <span>{timeAgo(a.lastRun)}</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* ── Two Column Layout ──────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>
            {/* LEFT: Active Sessions */}
            <GlassCard padding="0">
              <div style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary }}>Active Sessions</span>
                <span style={{ fontSize: 10, color: COLORS.textMuted, background: "rgba(59,130,246,0.1)", padding: "2px 6px", borderRadius: 4 }}>{filteredSessions.length}</span>
              </div>
              <div style={{ padding: "8px 14px 4px" }}>
                <input type="text" placeholder="Search sessions..." value={sessionSearch} onChange={e => setSessionSearch(e.target.value