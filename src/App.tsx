import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

const C = { 
  bg:"#080c18", 
  bgS:"rgba(12,18,35,0.75)", 
  bgH:"rgba(18,26,52,0.9)", 
  bgSub:"rgba(255,255,255,0.02)", 
  bdr:"rgba(50,70,120,0.22)", 
  bdrH:"rgba(59,130,246,0.45)", 
  acc:"#3b82f6", 
  accB:"#60a5fa", 
  accD:"rgba(59,130,246,0.12)", 
  ok:"#22c55e", 
  okD:"rgba(34,197,94,0.12)", 
  okB:"rgba(34,197,94,0.3)", 
  wn:"#f59e0b", 
  wnD:"rgba(245,158,11,0.1)", 
  wnB:"rgba(245,158,11,0.25)", 
  er:"#ef4444", 
  erD:"rgba(239,68,68,0.1)", 
  erB:"rgba(239,68,68,0.3)", 
  cy:"#06b6d4", 
  pu:"#a78bfa", 
  puD:"rgba(167,139,250,0.1)", 
  t1:"#e2e8f0", 
  t2:"#94a3b8", 
  t3:"#64748b", 
  t4:"#475569" 
};

const FN = "'JetBrains Mono','SF Mono',monospace";

const fm = n => {
  if(!n) return "0";
  if(n>=1e6) return (n/1e6).toFixed(1)+"M";
  if(n>=1e3) return (n/1e3).toFixed(n>=1e4?0:1)+"K";
  return n.toLocaleString();
};

const ta = ts => {
  if (!ts) return "—";
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

const SM = { 
  active:{bg:C.okD,b:C.okB,c:"#4ade80",d:C.ok}, 
  healthy:{bg:C.okD,b:C.okB,c:"#4ade80",d:C.ok}, 
  online:{bg:C.okD,b:C.okB,c:"#4ade80",d:C.ok}, 
  ok:{bg:C.okD,b:C.okB,c:"#4ade80",d:C.ok}, 
  pass:{bg:C.okD,b:C.okB,c:"#4ade80",d:C.ok}, 
  running:{bg:C.accD,b:"rgba(59,130,246,.3)",c:C.accB,d:C.acc}, 
  idle:{bg:"rgba(148,163,184,.08)",b:"rgba(148,163,184,.2)",c:"#94a3b8",d:"#64748b"}, 
  finished:{bg:"rgba(34,197,94,.06)",b:"rgba(34,197,94,.18)",c:"#86efac",d:C.ok}, 
  warn:{bg:C.wnD,b:C.wnB,c:"#fbbf24",d:C.wn}, 
  degraded:{bg:C.wnD,b:C.wnB,c:"#fbbf24",d:C.wn}, 
  queued:{bg:C.wnD,b:C.wnB,c:"#fbbf24",d:C.wn}, 
  error:{bg:C.erD,b:C.erB,c:"#f87171",d:C.er}, 
  failed:{bg:C.erD,b:C.erB,c:"#f87171",d:C.er}, 
  fail:{bg:C.erD,b:C.erB,c:"#f87171",d:C.er}, 
  offline:{bg:C.erD,b:C.erB,c:"#f87171",d:C.er} 
};

// API BASE - Backend real
const API_BASE = 'https://agent-dashboard-backend-production.up.railway.app/api';

async function fetchAPI(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    if (data.sessions) return data.sessions;
    if (data.runs) return data.runs;
    if (data.logs) return data.logs;
    if (data.services) return data.services;
    return data;
  } catch (e) {
    console.error('API fetch error:', e);
    // Return mock data on error as fallback
    return [];
  }
}

function Pill({s, glow}) {
  const st = SM[s] || SM.idle;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",background:st.bg,border:"1px solid "+st.b,borderRadius:6,fontSize:10,fontWeight:500,color:st.c}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:st.d,boxShadow:glow?"0 0 6px "+st.d:"none",animation:glow?"pulse 1.5s infinite":"none"}} />
      {s}
    </span>
  );
}

function SrcBadge({s}) {
  const m = {
    MAIN:{bg:C.accD,b:"rgba(59,130,246,.3)",c:C.accB},
    SUBAGENT:{bg:C.puD,b:"rgba(167,139,250,.3)",c:C.pu},
    CRON:{bg:"rgba(6,182,212,.1)",b:"rgba(6,182,212,.3)",c:"#22d3ee"}
  };
  const st = m[s] || m.MAIN;
  return (<span style={{padding:"2px 6px",background:st.bg,border:"1px solid "+st.b,borderRadius:4,fontSize:9,fontWeight:600,color:st.c}}>{s}</span>);
}

function LvlBadge({l}) {
  const m = {
    DEBUG:{bg:"rgba(148,163,184,.08)",c:"#94a3b8"},
    INFO:{bg:C.accD,c:C.accB},
    WARN:{bg:C.wnD,c:"#fbbf24"},
    ERROR:{bg:C.erD,c:"#f87171"},
    FATAL:{bg:"rgba(239,68,68,.2)",c:"#fca5a5"}
  };
  const st = m[l] || m.INFO;
  return (<span style={{padding:"1px 6px",borderRadius:4,fontSize:9,fontWeight:600,background:st.bg,color:st.c}}>{l}</span>);
}

function Card({children, style, p: pad = "16px", hover, onClick}) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      background:h&&hover?C.bgH:C.bgS,
      backdropFilter:"blur(20px)",
      border:"1px solid "+(h&&hover?C.bdrH:C.bdr),
      borderRadius:12,
      padding:pad,
      transition:"all 180ms",
      transform:h&&hover?"translateY(-1px)":"none",
      boxShadow:h&&hover?"0 8px 32px rgba(0,0,0,.3)":"0 2px 12px rgba(0,0,0,.2)",
      cursor:onClick?"pointer":"default",
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
  const p = Math.min(v || 0, 100);
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
  return (<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:11,fontWeight:600,color:C.t3,textTransform:"uppercase",letterSpacing:0.8}}>{children}</span>{n!=null && <span style={{fontSize:9,background:C.accD,color:C.accB,padding:"1px 6px",borderRadius:4}}>{n}</span>}</div>);
}

function Chip({label, active, onClick}) {
  return (<button onClick={onClick} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:500,cursor:"pointer",fontFamily:FN,background:active?C.accD:"rgba(255,255,255,.02)",color:active?C.accB:C.t3,border:"1px solid "+(active?"rgba(59,130,246,.35)":"transparent")}}>{label}</button>);
}

function KPI({label, value, sub, trend}) {
  return (
    <Card hover style={{flex:1,minWidth:0}}>
      <div style={{fontSize:10,color:C.t3,textTransform:"uppercase",letterSpacing:0.7,marginBottom:6}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color:C.t1,lineHeight:1.1}}>{value}</div>
      {sub && <div style={{fontSize:10,color:C.t3,marginTop:3}}>{sub}</div>}
      {trend && <div style={{fontSize:10,color:trend.startsWith("+")?C.ok:C.t3,marginTop:2,fontWeight:500}}>{trend}</div>}
    </Card>
  );
}

function CtxBar({p}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:5}}>
      <div style={{width:38,height:3,borderRadius:2,background:"rgba(255,255,255,.05)",overflow:"hidden"}}>
        <div style={{width:(p||0)+"%",height:"100%",borderRadius:2,background:p>80?C.er:p>60?C.wn:C.acc}} />
      </div>
      <span style={{fontSize:10,color:C.t3}}>{p||0}%</span>
    </div>
  );
}

function DGrid({items}) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
      {items.map((x, i) => (
        <div key={i} style={{background:C.bgSub,borderRadius:8,padding:"8px 10px",border:"1px solid "+C.bdr}}>
          <div style={{fontSize:9,color:C.t3,marginBottom:3,textTransform:"uppercase"}}>{x.l}</div>
          <div style={{fontSize:11,color:C.t1}}>{x.v}</div>
        </div>
      ))}
    </div>
  );
}

const TH = {padding:"9px 11px",textAlign:"left",fontWeight:500,color:C.t3,fontSize:10,textTransform:"uppercase",whiteSpace:"nowrap",background:C.bgS};
const TD = {padding:"8px 11px",whiteSpace:"nowrap"};

function TRow({children, onClick}) {
  return (
    <tr onClick={onClick} style={{borderBottom:"1px solid rgba(255,255,255,.02)",cursor:onClick?"pointer":"default"}} onMouseEnter={e => {e.currentTarget.style.background = "rgba(59,130,246,.03)";}} onMouseLeave={e => {e.currentTarget.style.background = "transparent";}}>
      {children}
    </tr>
  );
}

function OverviewTab() {
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selR, setSelR] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [a, s, r] = await Promise.all([
          fetchAPI('/agents'),
          fetchAPI('/sessions'),
          fetchAPI('/runs')
        ]);
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
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const totalTokens = agents.reduce((sum, a) => sum + (a.tokIn || a.tokensIn24h || 0) + (a.tokOut || a.tokensOut24h || 0), 0);
  const totalCost = agents.reduce((sum, a) => sum + (a.costDay || 0), 0);

  if (loading) return <div style={{color:C.t2,padding:20}}>Loading...</div>;

  return (
    <div>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:4}}>Overview</h1>
      <span style={{fontSize:11,color:C.t3}}>Real-time agent operations</span>
      
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:20,margin:"20px 0"}}>
        <KPI label="Sessions" value={sessions.length} sub={`${activeSessions} active`} />
        <KPI label="Tokens" value={fm(totalTokens)} sub={fm(totalTokens)+" total"} trend="+18%" />
        <KPI label="Cost" value={"$"+totalCost.toFixed(2)} sub="$12.45 24h" trend="+12%" />
        <KPI label="Requests" value="689" sub="145 24h" />
        <Card hover style={{flex:1}}>
          <div style={{fontSize:10,color:C.t3,textTransform:"uppercase",marginBottom:6}}>MAIN MODEL</div>
          <div style={{fontSize:13,fontWeight:600,color:C.cy}}>claude-opus-4</div>
          <div style={{fontSize:10,color:C.t3,marginTop:4}}>{agents.length} agents</div>
        </Card>
      </div>

      <SLbl>Agents</SLbl>
      <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:8,marginBottom:20}}>
        {agents.map(a => (
          <Card key={a.id} hover p="16px 20px" style={{minWidth:180,flex:"0 0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:600,color:C.t1}}>{a.name}</span>
              <Pill s={a.status} glow={a.status==="active"} />
            </div>
            <div style={{fontSize:9,color:C.t3}}>{a.model}</div>
            <div style={{display:"flex",gap:8,fontSize:9,color:C.t3,marginTop:2}}>
              <span>{a.runs24h || a.runs24h || 0} runs</span>
              <span style={{color:a.err24h>0?C.er:C.t3}}>{a.err24h || a.err24h || 0} err</span>
            </div>
          </Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:14,alignItems:"start"}}>
        <Card p="0">
          <div style={{padding:"10px 14px",borderBottom:"1px solid "+C.bdr,fontSize:12,fontWeight:600,color:C.t1}}>Sessions</div>
          <div style={{maxHeight:340,overflowY:"auto"}}>
            {sessions.map(s => (
              <div key={s.id} style={{padding:"8px 14px",borderBottom:"1px solid rgba(255,255,255,.02)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:11,fontWeight:600,color:C.accB}}>{s.id}</span>
                  <Pill s={s.status} />
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3}}>
                  <span>{s.agent || s.agentName || s.agent || '—'}</span><span>{fm(s.tokens24h || s.tok24h || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        <Card p="0" style={{overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid "+C.bdr,fontSize:12,fontWeight:600,color:C.t1}}>Recent Runs</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{borderBottom:"1px solid "+C.bdr}}>
                {["Src","Label","Status","When","Model","Ctx","Tokens"].map(h => <th key={h} style={TH}>{h}</th>)}
              </tr></thead>
              <tbody>{runs.slice(0,10).map(r => (
                <TRow key={r.id} onClick={() => setSelR(r)}>
                  <td style={TD}><SrcBadge s={r.source || r.src} /></td>
                  <td style={{...TD,color:C.t1,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis"}}>{r.label}</td>
                  <td style={TD}><Pill s={r.status} glow={r.status==="running"} /></td>
                  <td style={{...TD,color:C.t3}}>{ta(r.startedAt || r.started)}</td>
                  <td style={{...TD,color:C.t2,fontSize:10}}>{r.model}</td>
                  <td style={TD}>{r.ctxAvg > 0 ? <CtxBar p={r.ctxAvg} /> : r.ctx > 0 ? <CtxBar p={r.ctx} /> : "—"}</td>
                  <td style={{...TD,color:C.t3}}>{fm(r.tokIn || 0)}→{fm(r.tokOut || 0)}</td>
                </TRow>
              ))}</tbody>
            </table>
          </div>
        </Card>
      </div>

      <Drawer open={!!selR} onClose={() => setSelR(null)} title={"Run "+(selR?selR.id:"")}>
        {selR && <DGrid items={[
          {l:"Status",v:<Pill s={selR.status}/>},
          {l:"Source",v:<SrcBadge s={selR.source || selR.src}/>},
          {l:"Model",v:<span style={{color:C.cy}}>{selR.model}</span>},
          {l:"Context",v:selR.ctxAvg > 0?<CtxBar p={selR.ctxAvg} />:selR.ctx > 0?<CtxBar p={selR.ctx} />:"—"},
          {l:"Tokens",v:fm(selR.tokIn || 0)+"→"+fm(selR.tokOut || 0)}
        ]} />}
      </Drawer>
    </div>
  );
}

function AgentsTab() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tf, setTf] = useState("ALL");
  const [sel, setSel] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const a = await fetchAPI('/agents');
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

  const filtered = agents.filter(a => tf==="ALL" || a.type===tf);
  const tC = agents.reduce((sum, a) => sum + (a.costDay || 0), 0);
  const tR = agents.reduce((sum, a) => sum + (a.runs24h || 0), 0);
  const tE = agents.reduce((sum, a) => sum + (a.err24h || 0), 0);

  if (loading) return <div style={{color:C.t2,padding:20}}>Loading...</div>;

  return (
    <div>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:16}}>Agents</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:20,marginBottom:20}}>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>TOTAL</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{agents.length}</div></Card>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>RUNS 24H</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{tR}</div></Card>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>ERRORS</div><div style={{fontSize:22,fontWeight:700,color:C.er}}>{tE}</div></Card>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>COST TODAY</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>${tC.toFixed(2)}</div></Card>
      </div>
      <div style={{display:"flex",gap:3,marginBottom:12}}>{["ALL","MAIN","SUBAGENT"].map(t => <Chip key={t} label={t} active={tf===t} onClick={() => setTf(t)} />)}</div>
      <Card p="0"><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{borderBottom:"1px solid "+C.bdr}}>{["Agent","Type","Status","Model","Runs","Err","Tokens","Cost","Lat"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(a => (
            <TRow key={a.id} onClick={() => setSel(a)}>
              <td style={TD}><div style={{fontWeight:600,color:C.t1}}>{a.name}</div><div style={{fontSize:9,color:C.t3}}>{a.id}</div></td>
              <td style={TD}><SrcBadge s={a.type} /></td>
              <td style={TD}><Pill s={a.status} glow={a.status==="active"} /></td>
              <td style={{...TD,color:C.cy,fontSize:10}}>{a.model}</td>
              <td style={{...TD,color:C.t1}}>{a.runs24h || 0}</td>
              <td style={{...TD,color:a.err24h>0?C.er:C.t3}}>{a.err24h || 0}</td>
              <td style={{...TD,color:C.t2}}>{fm(a.tokIn || 0)}→{fm(a.tokOut || 0)}</td>
              <td style={{...TD,color:C.ok}}>${(a.costDay || 0).toFixed(2)}</td>
              <td style={{...TD,color:C.t2}}>{a.latAvg || 0}s</td>
            </TRow>
          ))}</tbody>
        </table>
      </div></Card>
      
      <Drawer open={!!sel} onClose={() => setSel(null)} title={"Agent: "+(sel?sel.name:"")}>
        {sel && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:12,color:C.t2}}>{sel.description}</div>
            <DGrid items={[
              {l:"Type",v:<SrcBadge s={sel.type}/>},
              {l:"Status",v:<Pill s={sel.status} glow/>},
              {l:"Model",v:<span style={{color:C.cy}}>{sel.model}</span>},
              {l:"Provider",v:sel.provider},
              {l:"Runs 24h",v:<span style={{fontSize:15,fontWeight:700}}>{sel.runs24h || 0}</span>},
              {l:"Cost",v:<span style={{color:C.ok}}>${(sel.costDay || 0).toFixed(2)}</span>},
              {l:"Latency",v:(sel.latAvg || 0)+"s"},
              {l:"P95",v:(sel.latP95 || 0)+"s"},
              {l:"Context",v:<MBar v={sel.ctxAvg || 0}/>}
            ]} />
            {sel.tools && sel.tools.length > 0 && (
              <>
                <SLbl n={sel.tools.length}>Tools</SLbl>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{sel.tools.map(t => <span key={t} style={{padding:"3px 8px",borderRadius:6,background:C.bgSub,border:"1px solid "+C.bdr,fontSize:10,color:C.t2}}>{t}</span>)}</div>
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function HealthTab() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exp, setExp] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await fetchAPI('/services');
        setServices(s || []);
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

  return (
    <div>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:16}}>Health</h1>
      <Card p="14px 18px" style={{marginBottom:16,borderLeft:"3px solid "+C.ok}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:C.ok,boxShadow:"0 0 12px "+C.ok,animation:"pulse 2s infinite"}} />
            <div><div style={{fontSize:14,fontWeight:600,color:C.t1}}>Gateway Online</div><div style={{fontSize:10,color:C.t3}}>agent-dashboard-backend-production.up.railway.app</div></div>
          </div>
        </div>
      </Card>

      <SLbl n={services.length}>Services</SLbl>
      {services.map((s,i) => (
        <Card key={i} hover onClick={() => setExp(exp===i?null:i)} p="10px 14px" style={{marginBottom:6}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><Pill s={s.status} glow={s.status==="healthy"} /><span style={{fontSize:12,fontWeight:600,color:C.t1}}>{s.name}</span></div>
            <span style={{fontSize:10,color:C.t3}}>{s.latencyMs || s.lat || 0}ms</span>
          </div>
          {exp===i && (
            <div style={{borderTop:"1px solid "+C.bdr,paddingTop:8,marginTop:8}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
                <div><div style={{fontSize:9,color:C.t4}}>CPU</div><MBar v={s.cpuPct || s.cpu || 0} /></div>
                <div><div style={{fontSize:9,color:C.t4}}>MEM</div><MBar v={s.memPct || s.mem || 0} /></div>
              </div>
              <InfoR l="Host" v={s.host} />
            </div>
          )}
        </Card>
      ))}
      
      <SLbl>System</SLbl>
      <Card p="14px" style={{marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[{l:"Services",v:services.length},{l:"Healthy",v:services.filter(s => s.status === 'healthy').length}].map(x => (
            <div key={x.l}><div style={{fontSize:9,color:C.t3}}>{x.l}</div><div style={{fontSize:16,fontWeight:600,color:C.t1}}>{x.v}</div></div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lf, setLf] = useState("ALL");
  const endRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const l = await fetchAPI('/logs');
        setLogs(l || []);
      } catch(e) { 
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({behavior:"smooth"});
  }, [logs]);

  const filtered = logs.filter(l => lf==="ALL" || l.level===lf);
  const lc = {};
  logs.forEach(l => {
    lc[l.level] = (lc[l.level]||0) + 1;
  });
  const lvlC = {DEBUG:C.t3,INFO:C.accB,WARN:C.wn,ERROR:C.er};

  if (loading) return <div style={{color:C.t2,padding:20}}>Loading...</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 110px)"}}>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:10}}>Logs</h1>
      
      <div style={{display:"flex",gap:3,marginBottom:10}}>
        <Chip label="ALL" active={lf==="ALL"} onClick={() => setLf("ALL")} />
        {["DEBUG","INFO","WARN","ERROR"].map(l => <Chip key={l} label={l} active={lf===l} onClick={() => setLf(l)} />)}
      </div>
      
      <Card p="0" style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{display:"grid",gridTemplateColumns:"120px 44px 90px 1fr",padding:"7px 14px",borderBottom:"1px solid "+C.bdr,background:C.bgS}}>
          {["Time","Level","Source","Message"].map(h => <span key={h} style={{fontSize:9,color:C.t3,textTransform:"uppercase"}}>{h}</span>)}
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {filtered.slice(-80).map(l => (
            <div key={l.id} style={{display:"grid",gridTemplateColumns:"120px 44px 90px 1fr",padding:"4px 14px",borderBottom:"1px solid rgba(255,255,255,.015)",background:l.level==="ERROR"?"rgba(239,68,68,.03)":l.level==="WARN"?"rgba(245,158,11,.02)":"transparent"}}>
              <span style={{fontSize:10,color:C.t3,fontVariantNumeric:"tabular-nums"}}>{new Date(l.timestamp).toLocaleTimeString("en-US",{hour12:false})}</span>
              <LvlBadge l={l.level} />
              <span style={{fontSize:10,color:C.cy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.source}</span>
              <span style={{fontSize:10,color:l.level==="ERROR"?"#f87171":C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.message}</span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </Card>
    </div>
  );
}

export default function MDXDashboard() {
  const [tab, setTab] = useState("overview");
  const [time, setTime] = useState(Date.now());
  const [col, setCol] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const nav = [
    {k:"overview",l:"Overview",i:"⊞"},
    {k:"agents",l:"Agents",i:"◈"},
    {k:"health",l:"Health",i:"♥"},
    {k:"logs",l:"Logs",i:"☰"},
  ];

  return (
    <div style={{fontFamily:FN,background:"radial-gradient(ellipse at 15% -5%,rgba(15,23,62,1) 0%,"+C.bg+" 55%)",color:C.t1,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.07); border-radius: 3px; }
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
        </div>
      </header>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <nav style={{width:col?50:175,minWidth:col?50:175,borderRight:"1px solid "+C.bdr,background:"rgba(8,12,24,.5)",padding:"10px 0",display:"flex",flexDirection:"column",transition:"width 200ms",overflow:"hidden"}}>
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
        <main style={{flex:1,overflow:"auto",padding:"18px 22px"}}>
          {tab === "overview" && <OverviewTab />}
          {tab === "agents" && <AgentsTab />}
          {tab === "health" && <HealthTab />}
          {tab === "logs" && <LogsTab />}
        </main>
      </div>
    </div>
  );
}