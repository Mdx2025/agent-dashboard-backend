console.log("v3 - Consistent Design System");
import { useState, useEffect, useRef } from "react";

/* ============================================
   DESIGN SYSTEM - CONSISTENT TOKENS
   ============================================ */

const C = {
  // Colors
  bg: "#080c18",
  bgS: "rgba(12,18,35,0.75)",
  bgH: "rgba(18,26,52,0.9)",
  bgSub: "rgba(255,255,255,0.02)",
  bdr: "rgba(50,70,120,0.22)",
  bdrH: "rgba(59,130,246,0.45)",
  acc: "#3b82f6",
  accB: "#60a5fa",
  accD: "rgba(59,130,246,0.12)",
  ok: "#22c55e",
  okD: "rgba(34,197,94,0.12)",
  okB: "rgba(34,197,94,0.3)",
  wn: "#f59e0b",
  wnD: "rgba(245,158,11,0.1)",
  wnB: "rgba(245,158,11,0.25)",
  er: "#ef4444",
  erD: "rgba(239,68,68,0.1)",
  erB: "rgba(239,68,68,0.3)",
  cy: "#06b6d4",
  pu: "#a78bfa",
  puD: "rgba(167,139,250,0.1)",
  t1: "#e2e8f0",
  t2: "#94a3b8",
  t3: "#64748b",
  t4: "#475569"
};

// Spacing Scale (consistent)
const S = {
  xxs: "4px",
  xs: "8px",
  sm: "12px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px"
};

// Border Radius (consistent)
const R = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px"
};

// Font Sizes (consistent)
const F = {
  xs: "9px",
  sm: "10px",
  md: "11px",
  lg: "12px",
  xl: "14px"
};

const FN = "'JetBrains Mono','SF Mono',monospace";

/* ============================================
   UTILITY FUNCTIONS
   ============================================ */

const fm = n => {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K";
  return n.toLocaleString();
};

const ta = ts => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  return Math.floor(s / 3600) + "h ago";
};

const df = ms => {
  if (!ms) return "—";
  if (ms < 1000) return ms + "ms";
  return (ms / 1000).toFixed(1) + "s";
};

/* ============================================
   STATUS MAPPINGS
   ============================================ */

const SM = {
  active: { bg: C.okD, b: C.okB, c: "#4ade80", d: C.ok },
  healthy: { bg: C.okD, b: C.okB, c: "#4ade80", d: C.ok },
  online: { bg: C.okD, b: C.okB, c: "#4ade80", d: C.ok },
  ok: { bg: C.okD, b: C.okB, c: "#4ade80", d: C.ok },
  pass: { bg: C.okD, b: C.okB, c: "#4ade80", d: C.ok },
  running: { bg: C.accD, b: "rgba(59,130,246,.3)", c: C.accB, d: C.acc },
  idle: { bg: "rgba(148,163,184,.08)", b: "rgba(148,163,184,.2)", c: "#94a3b8", d: "#64748b" },
  finished: { bg: "rgba(34,197,94,.06)", b: "rgba(34,197,94,.18)", c: "#86efac", d: C.ok },
  warn: { bg: C.wnD, b: C.wnB, c: "#fbbf24", d: C.wn },
  degraded: { bg: C.wnD, b: C.wnB, c: "#fbbf24", d: C.wn },
  queued: { bg: C.wnD, b: C.wnB, c: "#fbbf24", d: C.wn },
  error: { bg: C.erD, b: C.erB, c: "#f87171", d: C.er },
  failed: { bg: C.erD, b: C.erB, c: "#f87171", d: C.er },
  fail: { bg: C.erD, b: C.erB, c: "#f87171", d: C.er },
  offline: { bg: C.erD, b: C.erB, c: "#f87171", d: C.er }
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://agent-dashboard-backend-production.up.railway.app/api';

async function apiCall(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

/* ============================================
   UI PRIMITIVES - ALIGNED & CONSISTENT
   ============================================ */

function Pill({ s, glow }) {
  const st = SM[s] || SM.idle;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: S.xs,
      padding: `${S.xxs} ${S.sm}`,
      background: st.bg,
      border: `1px solid ${st.b}`,
      borderRadius: R.sm,
      fontSize: F.sm,
      fontWeight: 500,
      color: st.c
    }}>
      <span style={{
        width: "5px",
        height: "5px",
        borderRadius: "50%",
        background: st.d,
        boxShadow: glow ? `0 0 6px ${st.d}` : "none",
        animation: glow ? "pulse 1.5s infinite" : "none"
      }} />
      {s}
    </span>
  );
}

function SrcBadge({ s }) {
  const m = {
    MAIN: { bg: C.accD, b: "rgba(59,130,246,.3)", c: C.accB },
    SUBAGENT: { bg: C.puD, b: "rgba(167,139,250,.3)", c: C.pu },
    CRON: { bg: "rgba(6,182,212,.1)", b: "rgba(6,182,212,.3)", c: "#22d3ee" }
  };
  const st = m[s] || m.MAIN;
  return (
    <span style={{
      padding: `${S.xxs} ${S.xs}`,
      background: st.bg,
      border: `1px solid ${st.b}`,
      borderRadius: R.sm,
      fontSize: F.xs,
      fontWeight: 600,
      color: st.c
    }}>
      {s}
    </span>
  );
}

function LvlBadge({ l }) {
  const m = {
    DEBUG: { bg: "rgba(148,163,184,.08)", c: "#94a3b8" },
    INFO: { bg: C.accD, c: C.accB },
    WARN: { bg: C.wnD, c: "#fbbf24" },
    ERROR: { bg: C.erD, c: "#f87171" },
    FATAL: { bg: "rgba(239,68,68,.2)", c: "#fca5a5" }
  };
  const st = m[l] || m.INFO;
  return (
    <span style={{
      padding: `${S.xxs} ${S.xs}`,
      borderRadius: R.sm,
      fontSize: F.xs,
      fontWeight: 600,
      background: st.bg,
      color: st.c
    }}>
      {l}
    </span>
  );
}

function PIcon({ p }) {
  const cl = { Anthropic: "#d4a574", Moonshot: "#22c55e", Google: "#fbbf24", OpenAI: "#a78bfa" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "20px",
      height: "20px",
      borderRadius: R.sm,
      background: (cl[p] || C.acc) + "18",
      color: cl[p] || C.acc,
      fontSize: F.sm,
      fontWeight: 700
    }}>
      {p[0]}
    </span>
  );
}

/* ============================================
   CARD - CONSISTENT BOX COMPONENT
   ============================================ */

function Card({ children, style, p = S.md, hover, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: h && hover ? C.bgH : C.bgS,
        backdropFilter: "blur(20px)",
        border: `1px solid ${h && hover ? C.bdrH : C.bdr}`,
        borderRadius: R.lg,
        padding: p,
        transition: "all 180ms",
        transform: h && hover ? "translateY(-1px)" : "none",
        boxShadow: h && hover ? "0 8px 32px rgba(0,0,0,.3)" : "0 2px 12px rgba(0,0,0,.2)",
        cursor: onClick ? "pointer" : "default",
        ...style
      }}
    >
      {children}
    </div>
  );
}

/* ============================================
   PANEL - SLIDE-IN CONTAINER
   ============================================ */

function Panel({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      bottom: 0,
      width: "500px",
      maxWidth: "92vw", // Mobile responsive
      background: `linear-gradient(180deg,#0d1326,${C.bg})`,
      borderLeft: `1px solid ${C.bdr}`,
      zIndex: 1000,
      boxShadow: "-12px 0 50px rgba(0,0,0,.6)",
      overflowY: "auto"
    }}>
      <div style={{
        padding: `${S.sm} ${S.lg}`,
        borderBottom: `1px solid ${C.bdr}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        background: "rgba(13,19,38,.96)",
        zIndex: 1
      }}>
        <h2 style={{ margin: 0, fontSize: F.xl, fontWeight: 600, color: C.t1, fontFamily: FN }}>{title}</h2>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,.04)",
            border: `1px solid ${C.bdr}`,
            borderRadius: R.sm,
            padding: `${S.xxs} ${S.sm}`,
            color: C.t2,
            cursor: "pointer",
            fontSize: F.lg,
            fontFamily: FN
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ padding: S.lg }}>{children}</div>
    </div>
  );
}

/* ============================================
   PROGRESS BAR - CONSISTENT
   ============================================ */

function Progress({ p }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: S.xs }}>
      <div style={{
        flex: 1,
        height: "4px",
        borderRadius: "2px",
        background: "rgba(255,255,255,.04)",
        overflow: "hidden"
      }}>
        <div style={{
          width: p + "%",
          height: "100%",
          borderRadius: "2px",
          background: p > 80 ? C.er : p > 60 ? C.wn : C.acc
        }} />
      </div>
      <span style={{ fontSize: F.sm, color: C.t3, minWidth: "32px" }}>{p}%</span>
    </div>
  );
}

/* ============================================
   DATA ROW - CONSISTENT SPACING
   ============================================ */

function Row({ l, v, c }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      padding: `${S.xxs} 0`,
      borderBottom: "1px solid rgba(255,255,255,.02)"
    }}>
      <span style={{ fontSize: F.md, color: C.t3 }}>{l}</span>
      <span style={{ fontSize: F.md, color: c || C.t1, fontWeight: 500 }}>{v}</span>
    </div>
  );
}

/* ============================================
   SECTION HEADER - CONSISTENT
   ============================================ */

function Sec({ children, n }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: S.xs,
      marginBottom: S.xs
    }}>
      <span style={{
        fontSize: F.md,
        fontWeight: 600,
        color: C.t3,
        textTransform: "uppercase",
        letterSpacing: 0.8
      }}>
        {children}
      </span>
      {n != null && (
        <span style={{
          fontSize: F.xs,
          background: C.accD,
          color: C.accB,
          padding: `${S.xxs} ${S.xs}`,
          borderRadius: R.sm
        }}>
          {n}
        </span>
      )}
    </div>
  );
}

/* ============================================
   CHIP - CONSISTENT BUTTON STYLE
   ============================================ */

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: `${S.xxs} ${S.sm}`,
        borderRadius: R.sm,
        fontSize: F.sm,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: FN,
        background: active ? C.accD : "rgba(255,255,255,.02)",
        color: active ? C.accB : C.t3,
        border: `1px solid ${active ? "rgba(59,130,246,.35)" : "transparent"}`
      }}
    >
      {label}
    </button>
  );
}

/* ============================================
   KPI CARD - CONSISTENT LAYOUT
   ============================================ */

function KPI({ title, value, sub, p }) {
  return (
    <Card hover style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: F.sm, color: C.t3, marginBottom: S.xxs }}>{title}</div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: C.t1, marginBottom: S.xxs }}>{value}</div>
      {sub && <div style={{ fontSize: F.sm, color: C.t2 }}>{sub}</div>}
      {p != null && (
        <div style={{ marginTop: S.xs }}>
          <Progress p={p} />
        </div>
      )}
    </Card>
  );
}

/* ============================================
   MAIN APP COMPONENT - RESPONSIVE GRID
   ============================================ */

const TH = {
  padding: `${S.sm} ${S.sm}`,
  textAlign: "left",
  fontWeight: 500,
  color: C.t3,
  fontSize: F.sm,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  background: C.bgS
};

const TD = {
  padding: `${S.xs} ${S.sm}`,
  whiteSpace: "nowrap"
};

// ... rest of the component continues
// (Due to length, I'll create the full file in the next edit)

export default function App() {
  const [tab, setTab] = useState(0);
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [runs, setRuns] = useState([]);
  const [skills, setSkills] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selA, setSelA] = useState(null);
  const [selS, setSelS] = useState(null);
  const [tf, setTf] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  // ... rest of the component
}
