console.log("v2");
import { useState, useEffect, useRef } from "react";

/* ============================================
   DESIGN SYSTEM - SPACING & TYPOGRAPHY TOKENS
   ============================================ */

// Spacing Scale (8px base unit)
const SPACING = {
  xxs: 4,   // 0.5x - Fine spacing (icon gaps, label spacing)
  xs: 8,    // 1x - Tight spacing (inline elements)
  sm: 12,   // 1.5x - Default spacing (card padding, grid gaps)
  md: 16,   // 2x - Medium spacing (section padding)
  lg: 20,   // 2.5x - Large spacing (section margins)
  xl: 24,   // 3x - XL spacing (major sections)
  "2xl": 32 // 4x - Extra large spacing
} as const;

// Border Radius Scale
const RADIUS = {
  sm: 4,   // Pills, badges
  md: 6,   // Buttons, chips
  lg: 8,   // Cards
  xl: 12   // Panels, modals
} as const;

// Typography Scale
const FONT_SIZE = {
  xs: 9,   // Badges, metadata
  sm: 10,  // Labels, captions
  md: 11,  // Body text, data
  lg: 12,  // Emphasis text
  xl: 14,  // Subheadings
  "2xl": 17, // Section headings
  "3xl": 22, // Large numbers
  "4xl": 24  // Display numbers
} as const;

// Line Heights
const LINE_HEIGHT = {
  tight: 1.1,
  normal: 1.2,
  relaxed: 1.5
} as const;

// Color System (existing)
const C = {
  bg:"#080c18", bgS:"rgba(12,18,35,0.75)", bgH:"rgba(18,26,52,0.9)", bgSub:"rgba(255,255,255,0.02)",
  bdr:"rgba(50,70,120,0.22)", bdrH:"rgba(59,130,246,0.45)",
  acc:"#3b82f6", accB:"#60a5fa", accD:"rgba(59,130,246,0.12)",
  ok:"#22c55e", okD:"rgba(34,197,94,0.12)", okB:"rgba(34,197,94,0.3)",
  wn:"#f59e0b", wnD:"rgba(245,158,11,0.1)", wnB:"rgba(245,158,11,0.25)",
  er:"#ef4444", erD:"rgba(239,68,68,0.1)", erB:"rgba(239,68,68,0.3)",
  cy:"#06b6d4", pu:"#a78bfa", puD:"rgba(167,139,250,0.1)",
  t1:"#e2e8f0", t2:"#94a3b8", t3:"#64748b", t4:"#475569"
} as const;

const FN = "'JetBrains Mono','SF Mono',monospace" as const;

/* ============================================
   UTILITY FUNCTIONS
   ============================================ */

const fm = n => {
  if(n>=1e6) return (n/1e6).toFixed(1)+"M";
  if(n>=1e3) return (n/1e3).toFixed(n>=1e4?0:1)+"K";
  return n.toLocaleString();
};

const ta = ts => {
  const s=Math.floor((Date.now()-ts)/1000);
  if(s<60) return s+"s ago";
  if(s<3600) return Math.floor(s/60)+"m ago";
  return Math.floor(s/3600)+"h ago";
};

const df = ms => {
  if(!ms) return "—";
  if(ms<1000) return ms+"ms";
  return (ms/1000).toFixed(1)+"s";
};

/* ============================================
   STATUS MAPPINGS
   ============================================ */

const SM = {
  active:{bg:"#052e16",b:"#166534",c:"#22c55e",d:"#16a34a",label:"ACTIVE"},
  healthy:{bg:"#052e16",b:"#166534",c:"#22c55e",d:"#16a34a",label:"HEALTHY"},
  online:{bg:"#052e16",b:"#166534",c:"#22c55e",d:"#16a34a",label:"ONLINE"},
  ok:{bg:"#052e16",b:"#166534",c:"#22c55e",d:"#16a34a",label:"OK"},
  pass:{bg:"#052e16",b:"#166534",c:"#22c55e",d:"#16a34a",label:"PASS"},
  running:{bg:"#1e3a5f",b:"#1d4ed8",c:"#60a5fa",d:"#3b82f6",label:"RUNNING"},
  idle:{bg:"#1f2937",b:"#374151",c:"#9ca3af",d:"#6b7280",label:"IDLE"},
  finished:{bg:"#052e16",b:"#166534",c:"#22c55e",d:"#16a34a",label:"FINISHED"},
  warn:{bg:"#451a03",b:"#b45309",c:"#fbbf24",d:"#d97706",label:"WARN"},
  degraded:{bg:"#451a03",b:"#b45309",c:"#fbbf24",d:"#d97706",label:"DEGRADED"},
  queued:{bg:"#451a03",b:"#b45309",c:"#fbbf24",d:"#d97706",label:"QUEUED"},
  error:{bg:"#450a0a",b:"#dc2626",c:"#f87171",d:"#ef4444",label:"ERROR"},
  failed:{bg:"#450a0a",b:"#dc2626",c:"#f87171",d:"#ef4444",label:"FAILED"},
  fail:{bg:"#450a0a",b:"#dc2626",c:"#f87171",d:"#ef4444",label:"FAIL"},
  offline:{bg:"#450a0a",b:"#dc2626",c:"#f87171",d:"#ef4444",label:"OFFLINE"}
} as const;

/* ============================================
   API & HELPERS
   ============================================ */

const API_BASE = import.meta.env.VITE_API_URL || 'https://agent-dashboard-backend-production.up.railway.app';

async function apiCall(endpoint, options = {}) {
  // Ensure /api prefix if not present
  const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
  const res = await fetch(`${API_BASE}${apiEndpoint}`, {
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
   UI COMPONENTS
   ============================================ */

// Status Pill Component - Improved with better visual hierarchy
function Pill({s, glow}) {
  const st = SM[s] || SM.idle;
  const isActive = s === 'active' || s === 'running';
  return (
    <span style={{
      display:"inline-flex",
      alignItems:"center",
      gap:"6px",
      padding:"4px 10px",
      background:st.bg,
      border:"1px solid "+st.b,
      borderRadius:"6px",
      fontSize:"10px",
      fontWeight:600,
      color:st.c,
      textTransform:"uppercase",
      letterSpacing:"0.5px",
      boxShadow: isActive && glow ? `0 0 8px ${st.d}40` : 'none',
    }}>
      <span style={{
        width:"6px",
        height:"6px",
        borderRadius:"50%",
        background:st.d,
        boxShadow: isActive && glow ? `0 0 6px ${st.d}` : 'none',
        animation: isActive && glow ? "pulse 1.5s infinite" : "none",
        flexShrink:0,
      }} />
      {st.label || s}
    </span>
  );
}

// Toggle Badge Component - ON/OFF with improved visual
function ToggleBadge({enabled}) {
  return (
    <span style={{
      display:"inline-flex",
      alignItems:"center",
      gap:"5px",
      padding:"3px 8px",
      background: enabled ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
      border:`1px solid ${enabled ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
      borderRadius:"6px",
      fontSize:"9px",
      fontWeight:600,
      color: enabled ? "#22c55e" : "#f87171",
      textTransform:"uppercase",
      letterSpacing:"0.5px",
    }}>
      <span style={{
        width:"5px",
        height:"5px",
        borderRadius:"50%",
        background: enabled ? "#22c55e" : "#f87171",
        boxShadow: enabled ? "0 0 4px #22c55e" : "0 0 4px #f87171",
      }} />
      {enabled ? "ON" : "OFF"}
    </span>
  );
}

function SrcBadge({s}) {
  const m = {
    MAIN:{bg:"rgba(59,130,246,0.15)",b:"rgba(59,130,246,0.4)",c:"#60a5fa",label:"MAIN"},
    SUBAGENT:{bg:"rgba(167,139,250,0.15)",b:"rgba(167,139,250,0.4)",c:"#a78bfa",label:"SUBAGENT"},
    CRON:{bg:"rgba(6,182,212,0.15)",b:"rgba(6,182,212,0.4)",c:"#22d3ee",label:"CRON"}
  };
  const st = m[s] || m.MAIN;
  return (
    <span style={{
      padding:"3px 8px",
      background:st.bg,
      border:`1px solid ${st.b}`,
      borderRadius:"4px",
      fontSize:"9px",
      fontWeight:600,
      color:st.c,
      textTransform:"uppercase",
      letterSpacing:"0.5px",
    }}>
      {st.label || s}
    </span>
  );
}

function LvlBadge({l}) {
  const m = {
    DEBUG:{bg:"rgba(148,163,184,0.1)",c:"#94a3b8",label:"DEBUG"},
    INFO:{bg:"rgba(59,130,246,0.15)",c:"#60a5fa",label:"INFO"},
    WARN:{bg:"rgba(245,158,11,0.15)",c:"#fbbf24",label:"WARN"},
    ERROR:{bg:"rgba(239,68,68,0.15)",c:"#f87171",label:"ERROR"},
    FATAL:{bg:"rgba(239,68,68,0.25)",c:"#fca5a5",label:"FATAL"}
  };
  const st = m[l] || m.INFO;
  return (
    <span style={{
      padding:"2px 8px",
      borderRadius:"4px",
      fontSize:"9px",
      fontWeight:600,
      background:st.bg,
      color:st.c,
      textTransform:"uppercase",
      letterSpacing:"0.3px",
    }}>
      {st.label || l}
    </span>
  );
}

function PIcon({p}) {
  const cl = {Anthropic:"#d4a574",Moonshot:"#22c55e",Google:"#fbbf24",OpenAI:"#a78bfa",MiniMax:"#f97316",GLM:"#8b5cf6"};
  return (
    <span style={{
      display:"inline-flex",
      alignItems:"center",
      justifyContent:"center",
      width:"22px",
      height:"22px",
      borderRadius:"5px",
      background:`${(cl[p]||C.acc)}18`,
      color:cl[p]||C.acc,
      fontSize:"10px",
      fontWeight:700,
    }}>
      {p[0]}
    </span>
  );
}

function Card({children, style, p: pad = "16px", hover, onClick}) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: h && hover ? "rgba(18,26,52,0.95)" : "rgba(12,18,35,0.75)",
        backdropFilter:"blur(20px)",
        border:`1px solid ${h && hover ? "rgba(59,130,246,0.35)" : "rgba(50,70,120,0.22)"}`,
        borderRadius:"12px",
        padding:pad,
        transition:"all 180ms ease",
        transform: h && hover ? "translateY(-2px)" : "none",
        boxShadow: h && hover ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 12px rgba(0,0,0,0.2)",
        cursor:onClick ? "pointer" : "default",
        ...style
      }}>
      {children}
    </div>
  );
}

function Drawer({open, onClose, title, children}) {
  if (!open) return null;
  return (
    <div>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",backdropFilter:"blur(6px)",zIndex:999}} />
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:500,maxWidth:"92vw",background:"linear-gradient(180deg,#0d1326,"+C.bg+")",borderLeft:"1px solid "+C.bdr,zIndex:1000,boxShadow:"-12px 0 50px rgba(0,0,0,.6)",overflowY:"auto"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid "+C.bdr,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"rgba(13,19,38,.96)",zIndex:1}}>
          <span style={{fontSize:14,fontWeight:600,color:C.t1}}>{title}</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.04)",border:"1px solid "+C.bdr,borderRadius:6,padding:"4px 10px",color:C.t2,cursor:"pointer",fontSize:12,fontFamily:FN}}>✕</button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}

function MBar({v}) {
  const p = Math.min(v, 100);
  return (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div style={{flex:1,height:4,borderRadius:2,background:"rgba(255,255,255,.04)",overflow:"hidden"}}>
        <div style={{width:p+"%",height:"100%",borderRadius:2,background:p>80?C.er:p>60?C.wn:C.acc}} />
      </div>
      <span style={{fontSize:10,color:C.t3,minWidth:30,textAlign:"right"}}>{Math.round(p)}%</span>
    </div>
  );
}

function InfoR({l, v, c}) {
  return (<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.02)"}}><span style={{fontSize:11,color:C.t3}}>{l}</span><span style={{fontSize:11,color:c||C.t1,fontWeight:500}}>{v}</span></div>);
}

function SLbl({children, n}) {
  return (<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:11,fontWeight:600,color:C.t3,textTransform:"uppercase",letterSpacing:0.8}}>{children}</span>{n!=null && <span style={{fontSize:9,background:C.accD,color:C.accB,padding:"1px 6px",borderRadius:4}}>{n}</span>}</div>);
}

function Chip({label, active, onClick}) {
  return (
    <button onClick={onClick} style={{
      padding:"6px 12px",
      borderRadius:"6px",
      fontSize:"11px",
      fontWeight:500,
      cursor:"pointer",
      fontFamily:FN,
      background: active ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)",
      color: active ? "#60a5fa" : "#64748b",
      border: `1px solid ${active ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.06)"}`,
      transition:"all 150ms ease",
      textTransform:"uppercase",
      letterSpacing:"0.3px",
    }}>
      {label}
    </button>
  );
}

function KPI({label, value, sub, trend}) {
  return (
    <Card hover style={{flex:1,minWidth:0,border:"1px solid rgba(50,70,120,0.22)",padding:"16px 18px"}}>
      <div style={{fontSize:11,color:C.t3,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10,fontWeight:500}}>{label}</div>
      <div style={{fontSize:32,fontWeight:700,color:C.t1,lineHeight:1.1,marginBottom:6,letterSpacing:"-1px"}}>{value}</div>
      {sub && <div style={{fontSize:11,color:C.t2,marginTop:4}}>{sub}</div>}
      {trend && <div style={{fontSize:11,color:trend.startsWith("+")?C.ok:C.t3,marginTop:8,fontWeight:500}}>{trend}</div>}
    </Card>
  );
}

function CtxBar({p}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div style={{width:60,height:4,borderRadius:2,background:"rgba(255,255,255,.05)",overflow:"hidden"}}>
        <div style={{width:p+"%",height:"100%",borderRadius:2,background:p>80?C.er:p>60?C.wn:C.acc}} />
      </div>
      <span style={{fontSize:10,color:C.t3}}>{p}%</span>
    </div>
  );
}

function DGrid({items}) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      {items.map((x, i) => (
        <div key={i} style={{background:C.bgSub,borderRadius:8,padding:"12px 14px",border:"1px solid "+C.bdr}}>
          <div style={{fontSize:9,color:C.t3,marginBottom:6,textTransform:"uppercase"}}>{x.l}</div>
          <div style={{fontSize:11,color:C.t1}}>{x.v}</div>
        </div>
      ))}
    </div>
  );
}

const TH = {padding:"12px 16px",textAlign:"left",fontWeight:500,color:C.t3,fontSize:10,textTransform:"uppercase",whiteSpace:"nowrap",background:C.bgS};
const TD = {padding:"12px 16px",whiteSpace:"nowrap"};

function TRow({children, onClick}) {
  return (
    <tr onClick={onClick} style={{borderBottom:"1px solid rgba(255,255,255,.02)",cursor:onClick?"pointer":"default"}}
      onMouseEnter={e => {e.currentTarget.style.background = "rgba(59,130,246,.03)";}}
      onMouseLeave={e => {e.currentTarget.style.background = "transparent";}}>
      {children}
    </tr>
  );
}

/* TAB: OVERVIEW */

function OverviewTab() {
  const [selR, setSelR] = useState(null);
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  // Calculate how many runs can fit based on viewport height
  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate items per page: viewport - (header 80 + KPIs 80 + Agents 100 + Sessions header 40) = available
  const ROW_HEIGHT = 48; // Height of each run row
  const HEADER_SPACE = 250; // Reduced header space to allow more items (was 300)
  const MAX_RUNS = 40; // Increased to 40 runs with scroll (was 30)
  const availableHeight = viewportHeight - HEADER_SPACE;
  const runsPerPage = Math.min(Math.floor(availableHeight / ROW_HEIGHT), MAX_RUNS);
  const displayRuns = runs.slice(0, Math.max(runsPerPage, 20)); // Minimum 20 items for scroll

  useEffect(() => {
    async function loadData() {
      try {
        const results = await Promise.allSettled([
          apiCall('/agents'),
          apiCall('/sessions'),
          apiCall('/runs'),
        ]);

        const [a, s, r] = results.map(r =>
          r.status === 'fulfilled' ? r.value : []
        );

        // Log individual failures without breaking UI
        if (results[0].status === 'rejected') {
          console.error('Failed to load agents:', results[0].reason?.message);
        }
        if (results[1].status === 'rejected') {
          console.error('Failed to load sessions:', results[1].reason?.message);
        }
        if (results[2].status === 'rejected') {
          console.error('Failed to load runs:', results[2].reason?.message);
        }

        setAgents(a || []);
        setSessions(s || []);
        setRuns(r || []);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const totalTokensIn = agents.reduce((sum, a) => sum + (a.tokensIn24h || 0), 0);
  const totalTokensOut = agents.reduce((sum, a) => sum + (a.tokensOut24h || 0), 0);
  const totalCost = agents.reduce((sum, a) => sum + (a.costDay || 0), 0);

  if (loading) return <div style={{color:C.t2,padding:20}}>Loading...</div>;

  return (
    <div>
      <h1 style={{fontSize:22,fontWeight:700,color:C.t1,marginBottom:6,letterSpacing:"-0.3px"}}>Overview</h1>
      <span style={{fontSize:12,color:C.t2}}>Last updated: {new Date().toLocaleTimeString()} • {activeSessions} active session{activeSessions !== 1 ? 's' : ''}</span>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,margin:"24px 0"}}>
        <KPI label="Sessions" value={sessions.length} sub={`${activeSessions} active`} />
        <KPI label="Tokens In" value={fm(totalTokensIn)} sub="24h" />
        <KPI label="Tokens Out" value={fm(totalTokensOut)} sub="24h" />
        <KPI label="Cost" value={"$" + totalCost.toFixed(2)} sub="24h" />
        <Card hover style={{minWidth:0,border:"1px solid "+C.bdr}}>
          <div style={{fontSize:10,color:C.t3,textTransform:"uppercase",marginBottom:6}}>MAIN MODEL</div>
          <div style={{fontSize:13,fontWeight:600,color:C.cy}}>{agents[0]?.model || 'N/A'}</div>
          <div style={{fontSize:10,color:C.t3,marginTop:4}}>{agents.length} agents</div>
        </Card>
      </div>

      <SLbl>Agents</SLbl>
      <div style={{display:"flex",gap:14,overflowX:"auto",paddingBottom:14,marginBottom:28}}>
        {agents.map(a => (
          <Card key={a.id} hover p="12px 16px" style={{minWidth:160,flex:"0 0 auto",border:"1px solid "+C.bdr}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:600,color:C.t1}}>{a.name}</span>
              <Pill s={a.status} glow={a.status==="active"} />
            </div>
            <div style={{fontSize:9,color:C.t3}}>{a.model}</div>
            <div style={{display:"flex",gap:8,fontSize:9,color:C.t3,marginTop:2}}>
              <span>{a.runs24h || 0} runs</span>
              <span style={{color:a.err24h>0?C.er:C.t3}}>{a.err24h || 0} err</span>
            </div>
          </Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"minmax(280px,300px) 1fr",gap:20,alignItems:"stretch",minWidth:0}}>
        <Card p="0" style={{display:"flex",flexDirection:"column",padding:"18px",border:"1px solid "+C.bdr}}>
          <div style={{padding:"0 0 14px 0",borderBottom:"1px solid "+C.bdr,fontSize:13,fontWeight:600,color:C.t1}}>Active Sessions</div>
          <div style={{flex:1,overflowY:"auto",maxHeight: Math.min(Math.floor((viewportHeight - 280) / 45), 25) * 45 + 20,padding:"12px 0 0 0"}}>
            {sessions.slice(0, Math.min(Math.floor((viewportHeight - 250) / 45), 25)).map(s => (
              <div key={s.id} style={{padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,.02)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:11,fontWeight:600,color:C.accB}}>{s.id.substring(0,16)}</span>
                  <Pill s={s.status} />
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3}}>
                  <span>{s.agent}</span><span>{fm(s.tokens24h || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card p="0" style={{display:"flex",flexDirection:"column",overflow:"hidden",padding:"18px",border:"1px solid "+C.bdr}}>
          <div style={{padding:"0 0 14px 0",borderBottom:"1px solid "+C.bdr,fontSize:13,fontWeight:600,color:C.t1}}>Recent Runs</div>
          <div style={{flex:1,overflow:"auto",overflowX:"auto",maxHeight: Math.min(Math.floor((viewportHeight - 280) / 48), 30) * 48 + 50,padding:"12px 0 0 0"}}>
            <table style={{width:"100%",minWidth:600,borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{borderBottom:"1px solid "+C.bdr}}>
                {["Src","Label","Status","When","Model","Ctx","Tokens"].map(h => <th key={h} style={{...TH,padding:"8px 12px"}}>{h}</th>)}
              </tr></thead>
              <tbody>{displayRuns.map(r => (
                <TRow key={r.id} onClick={() => setSelR(r)}>
                  <td style={{...TD,padding:"10px 12px"}}><SrcBadge s={r.source || 'MAIN'} /></td>
                  <td style={{...TD,color:C.t1,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",padding:"10px 12px"}}>{r.label}</td>
                  <td style={{...TD,padding:"10px 12px"}}><Pill s={r.status} glow={r.status==="running"} /></td>
                  <td style={{...TD,color:C.t3,padding:"10px 12px"}}>{ta(r.startedAt)}</td>
                  <td style={{...TD,color:C.t2,fontSize:10,padding:"10px 12px"}}>{r.model}</td>
                  <td style={{...TD,padding:"10px 12px"}}>{r.contextPct ? <CtxBar p={r.contextPct} /> : "—"}</td>
                  <td style={{...TD,color:C.t3,padding:"10px 12px"}}>{fm(r.tokensIn || 0)}-{fm(r.tokensOut || 0)}</td>
                </TRow>
              ))}</tbody>
            </table>
          </div>
        </Card>
      </div>

      <Drawer open={!!selR} onClose={() => setSelR(null)} title={"Run " + (selR ? selR.id : "")}>
        {selR && (
          <DGrid items={[
            {l:"Status",v:<Pill s={selR.status}/>},
            {l:"Source",v:<SrcBadge s={selR.source || 'MAIN'}/>},
            {l:"Model",v:<span style={{color:C.cy}}>{selR.model}</span>},
            {l:"Duration",v:df(selR.duration)},
            {l:"Context",v:selR.contextPct ? <CtxBar p={selR.contextPct}/> : "—"},
            {l:"Tokens",v:fm(selR.tokensIn || 0)+"-"+fm(selR.tokensOut || 0)}
          ]} />
        )}
      </Drawer>
    </div>
  );
}

/* TAB: TOKENS */

function TokenUsageTab() {
  const [loading, setLoading] = useState(true);
  const [pf, setPf] = useState("ALL");
  const [tokens, setTokens] = useState([]);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const t = await apiCall('/tokens');
        setTokens(t || []);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{color:C.t2,padding:20}}>Loading...</div>;

  const provs = [...new Set(tokens.map(r => r.provider))];
  const fl = tokens.filter(r => pf==="ALL" || r.provider===pf);
  const tCost = fl.reduce((s,r) => s + (r.cost || 0), 0);
  const tIn = fl.reduce((s,r) => s + (r.tokensIn || 0), 0);
  const tOut = fl.reduce((s,r) => s + (r.tokensOut || 0), 0);

  return (
    <div>
      <h1 style={{fontSize:20,fontWeight:600,color:C.t1,marginBottom:4,letterSpacing:"-0.3px"}}>Token Usage</h1>
      <span style={{fontSize:12,color:C.t3}}>Per-request token tracking</span>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,margin:"20px 0"}}>
        <Card p="16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>TOTAL COST</div><div style={{fontSize:28,fontWeight:700,color:C.t1}}>${tCost.toFixed(4)}</div></Card>
        <Card p="16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>TOKENS IN</div><div style={{fontSize:28,fontWeight:700,color:C.t1}}>{fm(tIn)}</div></Card>
        <Card p="16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>TOKENS OUT</div><div style={{fontSize:28,fontWeight:700,color:C.t1}}>{fm(tOut)}</div></Card>
        <Card p="16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>AVG SPEED</div><div style={{fontSize:28,fontWeight:700,color:C.t1}}>{fl.length ? (tOut / (tIn + 1)).toFixed(1) : "0"} tps</div></Card>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <Chip label="ALL" active={pf==="ALL"} onClick={() => setPf("ALL")} />
        {provs.map(p => <Chip key={p} label={p} active={pf===p} onClick={() => setPf(p)} />)}
        <span style={{fontSize:11,color:C.t3,marginLeft:"auto",alignSelf:"center"}}>{fl.length} requests</span>
      </div>

      <Card p="0" style={{overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",minWidth:800,borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{borderBottom:"1px solid "+C.bdr}}>
              {["Timestamp","","Model","Agent","Tokens","Cost","Speed","Finish"].map((h,i) => <th key={i} style={{...TH,padding:"10px 14px",width:i===0?"140px":i===1?"40px":i===2?"140px":i===3?"120px":i===4?"100px":i===5?"80px":i===6?"70px":"auto"}}>{h}</th>)}
            </tr></thead>
            <tbody>{fl.map(r => (
              <TRow key={r.id} onClick={() => setSel(r)}>
                <td style={{...TD,padding:"10px 14px",color:C.t2,fontVariantNumeric:"tabular-nums"}}>{new Date(r.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric"})}, {new Date(r.timestamp).toLocaleTimeString("en-US",{hour12:true,hour:"2-digit",minute:"2-digit"})}</td>
                <td style={{...TD,padding:"10px 8px"}}><PIcon p={r.provider} /></td>
                <td style={{...TD,padding:"10px 14px"}}><span style={{color:C.accB,fontWeight:600}}>{r.model}</span></td>
                <td style={{...TD,padding:"10px 14px",color:C.t2}}>{r.agent}</td>
                <td style={{...TD,padding:"10px 14px",fontVariantNumeric:"tabular-nums"}}><span style={{color:C.t1}}>{(r.tokensIn || 0).toLocaleString()}</span><span style={{color:C.t4,margin:"0 4px"}}>-</span><span style={{color:C.t2}}>{(r.tokensOut || 0).toLocaleString()}</span></td>
                <td style={{...TD,padding:"10px 14px",color:C.ok,fontWeight:500}}>$ {(r.cost || 0).toFixed(4)}</td>
                <td style={{...TD,padding:"10px 14px",color:C.t2}}>{r.speed} tps</td>
                <td style={{...TD,padding:"10px 14px"}}><span style={{color:C.t3}}>{r.finishReason || "—"}</span></td>
              </TRow>
            ))}</tbody>
          </table>
        </div>
      </Card>

      <Drawer open={!!sel} onClose={() => setSel(null)} title="Request Detail">
        {sel && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <DGrid items={[
              {l:"Provider",v:<span style={{display:"flex",gap:6,alignItems:"center"}}><PIcon p={sel.provider}/>{sel.provider}</span>},
              {l:"Model",v:<span style={{color:C.accB,fontWeight:600}}>{sel.model}</span>},
              {l:"Agent",v:sel.agent},
              {l:"Tokens In",v:<span style={{fontSize:15,fontWeight:700}}>{(sel.tokensIn || 0).toLocaleString()}</span>},
              {l:"Tokens Out",v:<span style={{fontSize:15,fontWeight:700}}>{(sel.tokensOut || 0).toLocaleString()}</span>},
              {l:"Cost",v:<span style={{color:C.ok,fontWeight:600}}>${(sel.cost || 0).toFixed(4)}</span>},
              {l:"Speed",v:sel.speed+" tps"},
              {l:"Finish",v:sel.finishReason},
              {l:"Time",v:new Date(sel.timestamp).toLocaleString()}
            ]} />
            <SLbl>Cost Breakdown</SLbl>
            <InfoR l="Input" v={"$"+((sel.tokensIn || 0)*0.000015).toFixed(6)} c={C.ok} />
            <InfoR l="Output" v={"$"+((sel.tokensOut || 0)*0.000075).toFixed(6)} c={C.ok} />
            <InfoR l="Total" v={"$"+(sel.cost || 0).toFixed(4)} c={C.ok} />
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* TAB: AGENTS */

function AgentsTab() {
  const [loading, setLoading] = useState(true);
  const [tf, setTf] = useState("ALL");
  const [agents, setAgents] = useState([]);
  const [sel, setSel] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const a = await apiCall('/agents');
        setAgents(a || []);
        setLastUpdated(new Date());
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{color:C.t2,padding:20}}>Loading...</div>;

  const ags = agents.filter(a => tf==="ALL" || a.type===tf);
  const tC = agents.reduce((s,a) => s + (a.costDay || 0), 0);
  const tR = agents.reduce((s,a) => s + (a.runs24h || 0), 0);

  // Custom styles for Agents table
  const agentTH = {...TH, padding:"10px 14px", fontSize:11, letterSpacing:"0.5px"};
  const agentTD = {...TD, padding:"10px 14px", fontSize:12};

  return (
    <div>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:4,letterSpacing:"-0.3px"}}>Agents</h1>
      {lastUpdated && <span style={{fontSize:11,color:C.t3}}>Last updated: {lastUpdated.toLocaleTimeString()}</span>}
      
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,margin:"20px 0"}}>
        <Card p="16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>TOTAL</div><div style={{fontSize:24,fontWeight:700,color:C.t1}}>{agents.length}</div></Card>
        <Card p="16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>RUNS 24H</div><div style={{fontSize:24,fontWeight:700,color:C.t1}}>{tR}</div></Card>
        <Card p="16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>ERRORS</div><div style={{fontSize:24,fontWeight:700,color:C.er}}>{agents.reduce((s,a) => s + (a.err24h || 0), 0)}</div></Card>
        <Card p="16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>COST TODAY</div><div style={{fontSize:24,fontWeight:700,color:C.t1}}>${tC.toFixed(2)}</div></Card>
      </div>
      
      <div style={{display:"flex",gap:8,marginBottom:16}}>{["ALL","MAIN","SUBAGENT"].map(t => <Chip key={t} label={t} active={tf===t} onClick={() => setTf(t)} />)}</div>
      
      <Card p="0"><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",minWidth:700,borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{borderBottom:"1px solid "+C.bdr}}>{["AGENT","TYPE","STATUS","MODEL","RUNS","ERR","TOKENS","COST","LAT"].map(h => <th key={h} style={agentTH}>{h}</th>)}</tr></thead>
          <tbody>{ags.map((a, idx) => (
            <tr 
              key={a.id} 
              onClick={() => setSel(a)}
              style={{
                borderBottom:"1px solid rgba(255,255,255,.02)",
                cursor:"pointer",
                background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)",
                transition:"background 150ms ease"
              }}
              onMouseEnter={e => {e.currentTarget.style.background = "rgba(59,130,246,.04)";}}
              onMouseLeave={e => {e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)";}}
            >
              <td style={{...agentTD, fontWeight:500}}><div style={{fontWeight:600,color:C.t1}}>{a.name}</div><div style={{fontSize:9,color:C.t3,marginTop:2}}>{a.id}</div></td>
              <td style={agentTD}><SrcBadge s={a.type || 'MAIN'} /></td>
              <td style={agentTD}><Pill s={a.status} glow={a.status==="active"} /></td>
              <td style={{...agentTD,color:C.cy,fontSize:11}}>{a.model}</td>
              <td style={{...agentTD,textAlign:"right",color:C.t1,fontVariantNumeric:"tabular-nums"}}>{a.runs24h || 0}</td>
              <td style={{...agentTD,textAlign:"right",color:a.err24h>0?C.er:C.t3,fontVariantNumeric:"tabular-nums"}}>{a.err24h || 0}</td>
              <td style={{...agentTD,color:C.t2,fontSize:11}}>{fm(a.tokensIn24h || 0)}-{fm(a.tokensOut24h || 0)}</td>
              <td style={{...agentTD,textAlign:"right",color:C.ok,fontVariantNumeric:"tabular-nums"}}>${(a.costDay || 0).toFixed(2)}</td>
              <td style={{...agentTD,textAlign:"right",color:C.t2,fontVariantNumeric:"tabular-nums"}}>{(a.latencyAvg || 0).toFixed(2)}s</td>
            </tr>
          ))}</tbody>
        </table>
      </div></Card>

      <Drawer open={!!sel} onClose={() => setSel(null)} title={"Agent " + (sel ? sel.name : "")}>
        {sel && (
          <DGrid items={[
            {l:"Status",v:<Pill s={sel.status} glow={sel.status==="active"}/>},
            {l:"Type",v:<SrcBadge s={sel.type || 'MAIN'}/>},
            {l:"Model",v:<span style={{color:C.cy}}>{sel.model}</span>},
            {l:"Runs 24h",v:sel.runs24h || 0},
            {l:"Errors 24h",v:<span style={{color:sel.err24h>0?C.er:C.t3}}>{sel.err24h || 0}</span>},
            {l:"Tokens In",v:fm(sel.tokensIn24h || 0)},
            {l:"Tokens Out",v:fm(sel.tokensOut24h || 0)},
            {l:"Cost Day",v:<span style={{color:C.ok}}>${(sel.costDay || 0).toFixed(2)}</span>},
            {l:"Latency Avg",v:(sel.latencyAvg || 0).toFixed(2)+"s"}
          ]} />
        )}
      </Drawer>
    </div>
  );
}

/* TAB: SKILLS */

function SkillsTab() {
  const [loading, setLoading] = useState(true);
  const [cf, setCf] = useState("ALL");
  const [skills, setSkills] = useState([]);
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await apiCall('/skills');
        setSkills(s || []);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(12);
  }, [cf, search]);

  if (loading) return <div style={{color:C.t2,padding:20}}>Loading...</div>;

  const cats = [...new Set(skills.map(s => s.category || 'General'))];
  
  // Filter by category AND search
  let sk = skills.filter(s => {
    const matchesCategory = cf === "ALL" || s.category === cf;
    const matchesSearch = search === "" || s.name.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  const totalCount = skills.length;
  const filteredCount = sk.length;
  const displayedSkills = sk.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCount;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:C.t1,marginBottom:4,letterSpacing:"-0.3px"}}>Skills</h1>
          <span style={{fontSize:12,color:C.t2}}>{filteredCount === totalCount ? `${totalCount} skills` : `${filteredCount} of ${totalCount} skills`}</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <input 
              type="text" 
              placeholder="Search skills..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background:"rgba(255,255,255,0.03)",
                border:"1px solid "+C.bdr,
                borderRadius:"6px",
                padding:"8px 12px 8px 32px",
                color:C.t1,
                fontSize:12,
                fontFamily:FN,
                width:180,
                outline:"none",
                transition:"border-color 150ms"
              }}
            />
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.t3,fontSize:12}}>⌕</span>
          </div>
        </div>
      </div>
      
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        <Chip label="ALL" active={cf==="ALL"} onClick={() => setCf("ALL")} />
        {cats.map(c => <Chip key={c} label={c} active={cf===c} onClick={() => setCf(c)} />)}
        {search && (
          <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>
            Searching: "<span style={{color:C.accB}}>{search}</span>"
          </span>
        )}
      </div>
      
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:18}}>
        {displayedSkills.map(s => (
          <Card key={s.id} hover onClick={() => setSel(s)} p="18px" style={{opacity:s.enabled?1:0.5,border:"1px solid "+(s.enabled?C.bdr:"rgba(50,70,120,0.1)")}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:15,fontWeight:600,color:C.t1,letterSpacing:"-0.2px",lineHeight:1.3}}>{s.name}</div>
                <div style={{fontSize:10,color:C.t3,marginTop:4}}>
                  <span style={{color:C.accB}}>v{s.version || '1.0.0'}</span>
                  <span style={{margin:"0 6px",color:C.t4}}>·</span>
                  <span>{s.category || 'General'}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                <Pill s={s.status} />
              </div>
            </div>
            <div style={{fontSize:12,color:C.t2,marginBottom:14,lineHeight:1.5,minHeight:36}}>{s.description}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
              <div>
                <div style={{fontSize:9,color:C.t4,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Use 24h</div>
                <div style={{fontSize:16,fontWeight:600,color:C.t1}}>{s.usage24h || 0}</div>
              </div>
              <div>
                <div style={{fontSize:9,color:C.t4,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Latency</div>
                <div style={{fontSize:16,fontWeight:600,color:C.t1}}>{df(s.latencyAvg)}</div>
              </div>
              <div>
                <div style={{fontSize:9,color:C.t4,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Err%</div>
                <div style={{fontSize:16,fontWeight:600,color:s.errorRate>1?C.wn:C.ok}}>{(s.errorRate || 0).toFixed(1)}%</div>
              </div>
            </div>
            <div style={{marginTop:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <ToggleBadge enabled={s.enabled} />
              <span style={{fontSize:10,color:C.t3}}>Click for details →</span>
            </div>
          </Card>
        ))}
      </div>
      
      {hasMore && (
        <div style={{display:"flex",justifyContent:"center",marginTop:24}}>
          <button 
            onClick={() => setVisibleCount(v => v + 12)}
            style={{
              background:"rgba(59,130,246,0.1)",
              border:"1px solid rgba(59,130,246,0.3)",
              borderRadius:"8px",
              padding:"12px 32px",
              color:C.accB,
              fontSize:12,
              fontWeight:500,
              fontFamily:FN,
              cursor:"pointer",
              transition:"all 150ms"
            }}
          >
            Show more ({filteredCount - visibleCount} remaining)
          </button>
        </div>
      )}
      
      {filteredCount === 0 && (
        <div style={{textAlign:"center",padding:"60px 20px",color:C.t3}}>
          <div style={{fontSize:14,marginBottom:8}}>No skills found</div>
          <div style={{fontSize:12}}>Try adjusting your search or filter</div>
        </div>
      )}
    </div>
  );
}

/* TAB: HEALTH */

function HealthTab() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, a] = await Promise.all([apiCall('/services'), apiCall('/agents')]);
        setServices(s || []);
        setAgents(a || []);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const totalLatency = services.reduce((sum, s) => sum + (s.latencyMs || 0), 0);
  const avgCpu = services.length ? services.reduce((sum, s) => sum + (s.cpuPct || 0), 0) / services.length : 0;
  const avgMem = services.length ? services.reduce((sum, s) => sum + (s.memPct || 0), 0) / services.length : 0;
  const activeAgents = agents.filter(a => a.status === 'active').length;

  if (loading) return <div style={{color:C.t2,padding:20}}>Loading...</div>;

  return (
    <div>
      <h1 style={{fontSize:20,fontWeight:600,color:C.t1,marginBottom:4,letterSpacing:"-0.3px"}}>Health</h1>
      <span style={{fontSize:12,color:C.t3}}>System status and diagnostics</span>

      {/* Gateway Status Banner */}
      <div style={{marginTop:16,marginBottom:20}}>
        <Card p="14px 18px" hover style={{borderLeft:"3px solid "+C.ok}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:C.ok,boxShadow:"0 0 12px "+C.ok,animation:"pulse 2s infinite",flexShrink:0}} />
              <div>
                <div style={{fontSize:14,fontWeight:600,color:C.t1}}>Gateway Online</div>
                <div style={{fontSize:10,color:C.t3}}>agent-dashboard-backend-production.up.railway.app</div>
              </div>
            </div>
            <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
              <div><div style={{fontSize:9,color:C.t3,textTransform:"uppercase",marginBottom:2}}>Uptime</div><div style={{fontSize:13,fontWeight:600,color:C.t1}}>14d 7h</div></div>
              <div><div style={{fontSize:9,color:C.t3,textTransform:"uppercase",marginBottom:2}}>Agents</div><div style={{fontSize:13,fontWeight:600,color:C.t1}}>{activeAgents}</div></div>
              <div><div style={{fontSize:9,color:C.t3,textTransform:"uppercase",marginBottom:2}}>Latency</div><div style={{fontSize:13,fontWeight:600,color:C.t1}}>{Math.round(totalLatency)}ms</div></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:20}}>
        {/* Left Column: Services */}
        <div>
          <SLbl n={services.length}>Services</SLbl>
          {services.map((s,i) => (
            <Card key={i} p="14px 18px" hover style={{marginBottom:10,borderLeft:"3px solid "+(s.status==="healthy"?C.ok:C.wn)}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:s.status==="healthy"?C.ok:C.wn,flexShrink:0,marginTop:4}} />
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                    <div style={{fontSize:9,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.host}:{s.port}</div>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:12,fontWeight:500,color:s.status==="healthy"?C.ok:C.wn}}>{s.status}</div>
                  <div style={{fontSize:10,color:C.t3}}>{s.latencyMs || 0}ms</div>
                </div>
              </div>
              {(s.cpuPct > 0 || s.memPct > 0) && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
                  <div><div style={{fontSize:8,color:C.t3,textTransform:"uppercase",marginBottom:4}}>CPU</div><MBar v={s.cpuPct || 0} /></div>
                  <div><div style={{fontSize:8,color:C.t3,textTransform:"uppercase",marginBottom:4}}>MEM</div><MBar v={s.memPct || 0} /></div>
                </div>
              )}
            </Card>
          ))}
          {services.length === 0 && <Card p="20px" style={{textAlign:"center"}}><div style={{color:C.t3,fontSize:11}}>No services</div></Card>}
        </div>

        {/* Right Column: System Metrics & Diagnostics */}
        <div>
          <SLbl>System Metrics</SLbl>
          <Card p="18px" hover style={{marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div><div style={{fontSize:9,color:C.t3,textTransform:"uppercase",marginBottom:6}}>CPU</div><MBar v={avgCpu} /><div style={{fontSize:11,color:C.t1,marginTop:6}}>{avgCpu.toFixed(1)}%</div></div>
              <div><div style={{fontSize:9,color:C.t3,textTransform:"uppercase",marginBottom:6}}>Memory</div><MBar v={avgMem} /><div style={{fontSize:11,color:C.t1,marginTop:6}}>{avgMem.toFixed(1)}%</div></div>
            </div>
          </Card>

          <SLbl>OpenClaw Diagnostics</SLbl>
          <Card p="16px" hover style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:C.ok}} /><span style={{fontSize:12,color:C.t1}}>API Connectivity</span></div>
              <span style={{fontSize:10,color:C.t3}}>-50ms / 120ms</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:C.ok}} /><span style={{fontSize:12,color:C.t1}}>PostgreSQL</span></div>
              <span style={{fontSize:10,color:C.t3}}>healthy</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:C.ok}} /><span style={{fontSize:12,color:C.t1}}>Gateway</span></div>
              <span style={{fontSize:10,color:C.t3}}>online</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:C.ok}} /><span style={{fontSize:12,color:C.t1}}>Sessions</span></div>
              <span style={{fontSize:10,color:C.t3}}>{agents.length} total</span>
            </div>
          </Card>

          {/* Warning Banner */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"rgba(245,158,11,0.1)",borderRadius:8,border:"1px solid rgba(245,158,11,0.2)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:C.wn}} /><span style={{fontSize:11,color:C.wn}}>Disk Space</span></div>
            <span style={{fontSize:10,color:C.t3}}>78% used</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* TAB: LOGS */

function LogsTab() {
  const [lf, setLf] = useState("ALL");
  const [autoS, setAutoS] = useState(true);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  // Calculate height based on viewport for responsive scroll
  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate available height: viewport - (header 46 + nav 60 + title 60 + KPIs 140 + filters 50) ≈ viewport - 356
  const HEADER_SPACE = 356;
  const LOG_ROW_HEIGHT = 40;
  const maxLogRows = Math.max(Math.floor((viewportHeight - HEADER_SPACE) / LOG_ROW_HEIGHT), 15);

  useEffect(() => {
    async function loadData() {
      try {
        const l = await apiCall('/logs');
        setLogs(l || []);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{color:C.t2,padding:20}}>Loading...</div>;

  const filtered = logs.filter(l => lf==="ALL" || l.level===lf);
  const lc = {DEBUG:0,INFO:0,WARN:0,ERROR:0,FATAL:0};
  logs.forEach(l => { if (lc[l.level] !== undefined) lc[l.level]++; });
  const lvlC = {DEBUG:{bg:"rgba(148,163,184,0.12)",c:"#94a3b8"},INFO:{bg:"rgba(59,130,246,0.12)",c:"#60a5fa"},WARN:{bg:"rgba(245,158,11,0.12)",c:"#fbbf24"},ERROR:{bg:"rgba(239,68,68,0.12)",c:"#f87171"},FATAL:{bg:"rgba(239,68,68,0.2)",c:"#fca5a5"}};

  return (
    <div style={{display:"flex",flexDirection:"column",minHeight:0,flex:1}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600,color:C.t1,marginBottom:4,letterSpacing:"-0.3px"}}>Logs</h1>
          <span style={{fontSize:12,color:C.t3}}>Activity stream and system events</span>
        </div>
        <button onClick={() => setAutoS(!autoS)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:6,fontSize:10,fontFamily:FN,background:autoS?C.accD:"rgba(255,255,255,.04)",color:autoS?C.accB:C.t3,border:"1px solid "+(autoS?"rgba(59,130,246,.4)":C.bdr),cursor:"pointer",fontWeight:500}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:autoS?C.acc:C.t4}} /> Auto-scroll {autoS?"ON":"OFF"}
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:12,marginTop:20}}>
        <Card p="14px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Total</div><div style={{fontSize:26,fontWeight:700,color:C.t1}}>{logs.length}</div><div style={{fontSize:9,color:C.t3,marginTop:4}}>{lf==="ALL"?"All levels":lf}</div></Card>
        <Card p="14px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Debug</div><div style={{fontSize:26,fontWeight:700,color:C.t3}}>{lc.DEBUG}</div></Card>
        <Card p="14px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Info</div><div style={{fontSize:26,fontWeight:700,color:C.accB}}>{lc.INFO}</div></Card>
        <Card p="14px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Warn</div><div style={{fontSize:26,fontWeight:700,color:C.wn}}>{lc.WARN}</div></Card>
        <Card p="14px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Error</div><div style={{fontSize:26,fontWeight:700,color:C.er}}>{lc.ERROR}</div></Card>
      </div>

      <div style={{display:"flex",gap:6,marginTop:16,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:10,color:C.t3,textTransform:"uppercase",marginRight:4}}>Filter:</span>
        <Chip label="ALL" active={lf==="ALL"} onClick={() => setLf("ALL")} />
        {["DEBUG","INFO","WARN","ERROR"].map(l => <Chip key={l} label={l} active={lf===l} onClick={() => setLf(l)} />)}
        <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>{filtered.length} entries</span>
      </div>

      <Card p="0" style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:Math.min(maxLogRows * LOG_ROW_HEIGHT + 50, 500)}}>
        <div style={{display:"grid",gridTemplateColumns:"minmax(100px,1fr) minmax(50px,0.5fr) minmax(70px,0.8fr) minmax(200px,2fr)",padding:"10px 16px",borderBottom:"1px solid "+C.bdr,background:C.bgS,position:"sticky",top:0,zIndex:1}}>
          {[{l:"Time",w:"minmax(100px,1fr)"},{l:"Level",w:"minmax(50px,0.5fr)"},{l:"Source",w:"minmax(70px,0.8fr)"},{l:"Message",w:"minmax(200px,2fr)"}].map(h => (
            <span key={h.l} style={{fontSize:10,color:C.t3,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.5px"}}>{h.l}</span>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",overflowX:"hidden"}}>
          {filtered.slice(0, maxLogRows).map(l => (
            <div key={l.id} style={{
              display:"grid",
              gridTemplateColumns:"minmax(100px,1fr) minmax(50px,0.5fr) minmax(70px,0.8fr) minmax(200px,2fr)",
              padding:"10px 16px",
              borderBottom:"1px solid rgba(255,255,255,.03)",
              background:l.level==="ERROR"?"rgba(239,68,68,.05)":l.level==="WARN"?"rgba(245,158,11,.02)":l.level==="FATAL"?"rgba(239,68,68,.08)":"transparent",
              alignItems:"center"
            }}>
              <span style={{fontSize:11,color:C.t2,fontVariantNumeric:"tabular-nums",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {new Date(l.timestamp).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}
              </span>
              <span style={{
                padding:"3px 8px",
                borderRadius:4,
                fontSize:9,
                fontWeight:600,
                background:lvlC[l.level]?.bg || "rgba(148,163,184,0.1)",
                color:lvlC[l.level]?.c || C.t3,
                textAlign:"center",
                justifySelf:"start"
              }}>
                {l.level}
              </span>
              <span style={{fontSize:11,color:C.cy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.source}</span>
              <span style={{fontSize:11,color:l.level==="ERROR"?"#f87171":l.level==="WARN"?C.wn:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.message}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{padding:40,textAlign:"center",color:C.t3,fontSize:13}}>
              <div style={{fontSize:24,marginBottom:8,opacity:0.5}}>📋</div>
              No logs to display
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* MAIN APP */

export default function MDXDashboard() {
  const [tab, setTab] = useState("overview");
  const [time, setTime] = useState(Date.now());
  const [auto, setAuto] = useState(true);
  const [col, setCol] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const nav = [
    {k:"overview",l:"Overview",i:"⊞"},
    {k:"tokens",l:"Token Usage",i:"◎"},
    {k:"agents",l:"Agents",i:"◈"},
    {k:"skills",l:"Skills",i:"⚡"},
    {k:"health",l:"Health",i:"♥"},
    {k:"logs",l:"Logs",i:"☰"},
  ];

  return (
    <div style={{fontFamily:FN,background:"radial-gradient(ellipse at 15% -5%,rgba(15,23,62,1) 0%,"+C.bg+" 55%)",color:C.t1,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
        input::placeholder { color: rgba(148,163,184,.45); }
        select option { background: #0d1326; }
      `}</style>
      <header style={{height:46,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",borderBottom:"1px solid "+C.bdr,background:"rgba(8,12,24,.85)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:15,fontWeight:700,color:C.acc,letterSpacing:2}}>MDX</span>
          <span style={{width:1,height:18,background:C.bdr}} />
          <span style={{fontSize:11,color:C.t3}}>Agent Operations</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:C.ok,boxShadow:"0 0 8px "+C.ok,animation:"pulse 2s infinite"}} />
            <span style={{fontSize:10,color:C.ok,fontWeight:500}}>Live</span>
          </div>
          <span style={{fontSize:10,color:C.t3,fontVariantNumeric:"tabular-nums"}}>{new Date(time).toLocaleTimeString("en-US",{hour12:false})}</span>
          <button style={{background:"rgba(255,255,255,.03)",border:"1px solid "+C.bdr,borderRadius:6,padding:"3px 8px",color:C.t2,cursor:"pointer",fontSize:11,fontFamily:FN}}>↻</button>
          <button onClick={() => setAuto(!auto)} style={{background:auto?C.accD:"rgba(255,255,255,.03)",border:"1px solid "+(auto?"rgba(59,130,246,.4)":C.bdr),borderRadius:6,padding:"3px 10px",color:auto?C.acc:C.t3,cursor:"pointer",fontSize:9,fontWeight:500,fontFamily:FN}}>AUTO</button>
        </div>
      </header>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <nav style={{width:col?50:175,minWidth:col?50:175,flexShrink:0,borderRight:"1px solid "+C.bdr,background:"rgba(8,12,24,.5)",padding:"10px 0",display:"flex",flexDirection:"column",transition:"width 200ms",overflow:"hidden"}}>
          <button onClick={() => setCol(!col)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",padding:"4px 14px",fontSize:11,textAlign:"left",marginBottom:6,fontFamily:FN}}>{col?"→":"←"}</button>
          {nav.map(n => (
            <button key={n.k} onClick={() => setTab(n.k)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:tab===n.k?"rgba(59,130,246,.08)":"transparent",border:"none",borderLeft:tab===n.k?"2px solid "+C.acc:"2px solid transparent",color:tab===n.k?C.accB:C.t2,cursor:"pointer",fontSize:12,fontWeight:tab===n.k?600:400,width:"100%",textAlign:"left",fontFamily:FN,transition:"all 150ms"}}>
              <span style={{fontSize:13,width:16,textAlign:"center",flexShrink:0}}>{n.i}</span>
              {!col && <span>{n.l}</span>}
            </button>
          ))}
          <div style={{flex:1}} />
          <div style={{padding:"10px 14px",borderTop:"1px solid "+C.bdr,display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:C.ok}} />
            {!col && <span style={{fontSize:9,color:C.t3}}>System Online</span>}
          </div>
        </nav>
        <main style={{flex:1,overflow:"auto",overflowX:"hidden",padding:"18px 22px",minWidth:0}}>
          {tab === "overview" && <OverviewTab />}
          {tab === "tokens" && <TokenUsageTab />}
          {tab === "agents" && <AgentsTab />}
          {tab === "skills" && <SkillsTab />}
          {tab === "health" && <HealthTab />}
          {tab === "logs" && <LogsTab />}
        </main>
      </div>
    </div>
  );
}
// Force redeploy Sun Feb 15 19:12:00 UTC 2026
// Tabs fix Sun Feb 15 19:19:40 UTC 2026
// 1771183624
// Build timestamp: 1771696464
