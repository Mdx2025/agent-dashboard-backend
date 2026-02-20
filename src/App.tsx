console.log("v2");
import { useState, useEffect, useRef } from "react";

const C = {
  bg:"#080c18", bgS:"rgba(12,18,35,0.75)", bgH:"rgba(18,26,52,0.9)", bgSub:"rgba(255,255,255,0.02)",
  bdr:"rgba(50,70,120,0.22)", bdrH:"rgba(59,130,246,0.45)",
  acc:"#3b82f6", accB:"#60a5fa", accD:"rgba(59,130,246,0.12)",
  ok:"#22c55e", okD:"rgba(34,197,94,0.12)", okB:"rgba(34,197,94,0.3)",
  wn:"#f59e0b", wnD:"rgba(245,158,11,0.1)", wnB:"rgba(245,158,11,0.25)",
  er:"#ef4444", erD:"rgba(239,68,68,0.1)", erB:"rgba(239,68,68,0.3)",
  cy:"#06b6d4", pu:"#a78bfa", puD:"rgba(167,139,250,0.1)",
  t1:"#e2e8f0", t2:"#94a3b8", t3:"#64748b", t4:"#475569"
};

const FN = "'JetBrains Mono','SF Mono',monospace";

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

/* UI PRIMITIVES */

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
  const m = {MAIN:{bg:C.accD,b:"rgba(59,130,246,.3)",c:C.accB},SUBAGENT:{bg:C.puD,b:"rgba(167,139,250,.3)",c:C.pu},CRON:{bg:"rgba(6,182,212,.1)",b:"rgba(6,182,212,.3)",c:"#22d3ee"}};
  const st = m[s] || m.MAIN;
  return (<span style={{padding:"2px 6px",background:st.bg,border:"1px solid "+st.b,borderRadius:4,fontSize:9,fontWeight:600,color:st.c}}>{s}</span>);
}

function LvlBadge({l}) {
  const m = {DEBUG:{bg:"rgba(148,163,184,.08)",c:"#94a3b8"},INFO:{bg:C.accD,c:C.accB},WARN:{bg:C.wnD,c:"#fbbf24"},ERROR:{bg:C.erD,c:"#f87171"},FATAL:{bg:"rgba(239,68,68,.2)",c:"#fca5a5"}};
  const st = m[l] || m.INFO;
  return (<span style={{padding:"1px 6px",borderRadius:4,fontSize:9,fontWeight:600,background:st.bg,color:st.c}}>{l}</span>);
}

function PIcon({p}) {
  const cl = {Anthropic:"#d4a574",Moonshot:"#22c55e",Google:"#fbbf24",OpenAI:"#a78bfa"};
  return (<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:20,height:20,borderRadius:5,background:(cl[p]||C.acc)+"18",color:cl[p]||C.acc,fontSize:10,fontWeight:700}}>{p[0]}</span>);
}

function Card({children, style, p: pad = "16px", hover, onClick}) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{background:h&&hover?C.bgH:C.bgS,backdropFilter:"blur(20px)",border:"1px solid "+(h&&hover?C.bdrH:C.bdr),borderRadius:12,padding:pad,transition:"all 180ms",transform:h&&hover?"translateY(-1px)":"none",boxShadow:h&&hover?"0 8px 32px rgba(0,0,0,.3)":"0 2px 12px rgba(0,0,0,.2)",cursor:onClick?"pointer":"default",...style}}>
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
        <div style={{width:p+"%",height:"100%",borderRadius:2,background:p>80?C.er:p>60?C.wn:C.acc}} />
      </div>
      <span style={{fontSize:10,color:C.t3}}>{p}%</span>
    </div>
  );
}

function DGrid({items}) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
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
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:4}}>Overview</h1>
      <span style={{fontSize:11,color:C.t3}}>Real-time agent operations</span>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,margin:"16px 0"}}>
        <KPI label="Sessions" value={sessions.length} sub={`${activeSessions} active`} />
        <KPI label="Tokens In" value={fm(totalTokensIn)} sub="24h" />
        <KPI label="Tokens Out" value={fm(totalTokensOut)} sub="24h" />
        <KPI label="Cost" value={"$" + totalCost.toFixed(2)} sub="24h" />
        <Card hover style={{flex:1}}>
          <div style={{fontSize:10,color:C.t3,textTransform:"uppercase",marginBottom:6}}>MAIN MODEL</div>
          <div style={{fontSize:13,fontWeight:600,color:C.cy}}>{agents[0]?.model || 'N/A'}</div>
          <div style={{fontSize:10,color:C.t3,marginTop:4}}>{agents.length} agents</div>
        </Card>
      </div>

      <SLbl>Agents</SLbl>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:16}}>
        {agents.map(a => (
          <Card key={a.id} hover p="10px 14px" style={{minWidth:160,flex:"0 0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
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

      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:14,alignItems:"start"}}>
        <Card p="0">
          <div style={{padding:"10px 14px",borderBottom:"1px solid "+C.bdr,fontSize:12,fontWeight:600,color:C.t1}}>Sessions</div>
          <div style={{maxHeight:340,overflowY:"auto"}}>
            {sessions.map(s => (
              <div key={s.id} style={{padding:"8px 14px",borderBottom:"1px solid rgba(255,255,255,.02)"}}>
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
        <Card p="0" style={{overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid "+C.bdr,fontSize:12,fontWeight:600,color:C.t1}}>Recent Runs</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{borderBottom:"1px solid "+C.bdr}}>
                {["Src","Label","Status","When","Model","Ctx","Tokens"].map(h => <th key={h} style={TH}>{h}</th>)}
              </tr></thead>
              <tbody>{runs.map(r => (
                <TRow key={r.id} onClick={() => setSelR(r)}>
                  <td style={TD}><SrcBadge s={r.source || 'MAIN'} /></td>
                  <td style={{...TD,color:C.t1,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis"}}>{r.label}</td>
                  <td style={TD}><Pill s={r.status} glow={r.status==="running"} /></td>
                  <td style={{...TD,color:C.t3}}>{ta(r.startedAt)}</td>
                  <td style={{...TD,color:C.t2,fontSize:10}}>{r.model}</td>
                  <td style={TD}>{r.contextPct ? <CtxBar p={r.contextPct} /> : "—"}</td>
                  <td style={{...TD,color:C.t3}}>{fm(r.tokensIn || 0)}-{fm(r.tokensOut || 0)}</td>
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
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:4}}>Token Usage</h1>
      <span style={{fontSize:11,color:C.t3}}>Per-request token tracking</span>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,margin:"16px 0"}}>
        <Card p="12px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>TOTAL COST</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>${tCost.toFixed(4)}</div></Card>
        <Card p="12px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>TOKENS IN</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{fm(tIn)}</div></Card>
        <Card p="12px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>TOKENS OUT</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{fm(tOut)}</div></Card>
        <Card p="12px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>AVG SPEED</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{fl.length ? (tOut / (tIn + 1)).toFixed(1) : "0"} tps</div></Card>
      </div>

      <div style={{display:"flex",gap:3,marginBottom:12}}>
        <Chip label="ALL" active={pf==="ALL"} onClick={() => setPf("ALL")} />
        {provs.map(p => <Chip key={p} label={p} active={pf===p} onClick={() => setPf(p)} />)}
        <span style={{fontSize:10,color:C.t3,marginLeft:"auto",alignSelf:"center"}}>{fl.length} requests</span>
      </div>

      <Card p="0" style={{overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{borderBottom:"1px solid "+C.bdr}}>
              {["Timestamp","","Model","Agent","Tokens","Cost","Speed","Finish"].map((h,i) => <th key={i} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>{fl.map(r => (
              <TRow key={r.id} onClick={() => setSel(r)}>
                <td style={{...TD,color:C.t2,fontVariantNumeric:"tabular-nums"}}>{new Date(r.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric"})+", "+new Date(r.timestamp).toLocaleTimeString("en-US",{hour12:true,hour:"2-digit",minute:"2-digit"})}</td>
                <td style={{...TD,padding:"8px 4px"}}><PIcon p={r.provider} /></td>
                <td style={TD}><span style={{color:C.accB,fontWeight:600}}>{r.model}</span></td>
                <td style={{...TD,color:C.t2}}>{r.agent}</td>
                <td style={{...TD,fontVariantNumeric:"tabular-nums"}}><span style={{color:C.t1}}>{(r.tokensIn || 0).toLocaleString()}</span><span style={{color:C.t4,margin:"0 4px"}}>-</span><span style={{color:C.t2}}>{(r.tokensOut || 0).toLocaleString()}</span></td>
                <td style={{...TD,color:C.ok,fontWeight:500}}>$ {(r.cost || 0).toFixed(4)}</td>
                <td style={{...TD,color:C.t2}}>{r.speed} tps</td>
                <td style={TD}><span style={{color:C.t3}}>{r.finishReason || "—"}</span></td>
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

  useEffect(() => {
    async function loadData() {
      try {
        const a = await apiCall('/agents');
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

  if (loading) return <div style={{color:C.t2,padding:20}}>Loading...</div>;

  const ags = agents.filter(a => tf==="ALL" || a.type===tf);
  const tC = agents.reduce((s,a) => s + (a.costDay || 0), 0);
  const tR = agents.reduce((s,a) => s + (a.runs24h || 0), 0);

  return (
    <div>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:16}}>Agents</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>TOTAL</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{agents.length}</div></Card>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>RUNS 24H</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{tR}</div></Card>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>ERRORS</div><div style={{fontSize:22,fontWeight:700,color:C.er}}>{agents.reduce((s,a) => s + (a.err24h || 0), 0)}</div></Card>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>COST TODAY</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>${tC.toFixed(2)}</div></Card>
      </div>
      <div style={{display:"flex",gap:3,marginBottom:12}}>{["ALL","MAIN","SUBAGENT"].map(t => <Chip key={t} label={t} active={tf===t} onClick={() => setTf(t)} />)}</div>
      <Card p="0"><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{borderBottom:"1px solid "+C.bdr}}>{["Agent","Type","Status","Model","Runs","Err","Tokens","Cost","Lat"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>{ags.map(a => (
            <TRow key={a.id} onClick={() => setSel(a)}>
              <td style={TD}><div style={{fontWeight:600,color:C.t1}}>{a.name}</div><div style={{fontSize:9,color:C.t3}}>{a.id}</div></td>
              <td style={TD}><SrcBadge s={a.type || 'MAIN'} /></td>
              <td style={TD}><Pill s={a.status} glow={a.status==="active"} /></td>
              <td style={{...TD,color:C.cy,fontSize:10}}>{a.model}</td>
              <td style={{...TD,color:C.t1}}>{a.runs24h || 0}</td>
              <td style={{...TD,color:a.err24h>0?C.er:C.t3}}>{a.err24h || 0}</td>
              <td style={{...TD,color:C.t2}}>{fm(a.tokensIn24h || 0)}-{fm(a.tokensOut24h || 0)}</td>
              <td style={{...TD,color:C.ok}}>${(a.costDay || 0).toFixed(2)}</td>
              <td style={{...TD,color:C.t2}}>{(a.latencyAvg || 0).toFixed(2)}s</td>
            </TRow>
          ))}</tbody>
        </table>
      </div></Card>
    </div>
  );
}

/* TAB: SKILLS */

function SkillsTab() {
  const [loading, setLoading] = useState(true);
  const [cf, setCf] = useState("ALL");
  const [skills, setSkills] = useState([]);
  const [sel, setSel] = useState(null);

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

  if (loading) return <div style={{color:C.t2,padding:20}}>Loading...</div>;

  const cats = [...new Set(skills.map(s => s.category || 'General'))];
  const sk = skills.filter(s => cf==="ALL" || s.category===cf);

  return (
    <div>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:16}}>Skills</h1>
      <div style={{display:"flex",gap:3,marginBottom:12,flexWrap:"wrap"}}>
        <Chip label="ALL" active={cf==="ALL"} onClick={() => setCf("ALL")} />
        {cats.map(c => <Chip key={c} label={c} active={cf===c} onClick={() => setCf(c)} />)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
        {sk.map(s => (
          <Card key={s.id} hover onClick={() => setSel(s)} p="12px 16px" style={{opacity:s.enabled?1:0.45}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div><div style={{fontSize:13,fontWeight:600,color:C.t1}}>{s.name}</div><div style={{fontSize:10,color:C.t3}}>v{s.version || '1.0.0'} · {s.category || 'General'}</div></div>
              <div style={{display:"flex",gap:4}}><Pill s={s.status} /><span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:s.enabled?C.okD:C.erD,color:s.enabled?"#4ade80":"#f87171"}}>{s.enabled?"ON":"OFF"}</span></div>
            </div>
            <div style={{fontSize:10,color:C.t3,marginBottom:8}}>{s.description}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
              <div><div style={{fontSize:9,color:C.t4}}>USE 24H</div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{s.usage24h || 0}</div></div>
              <div><div style={{fontSize:9,color:C.t4}}>LATENCY</div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{df(s.latencyAvg)}</div></div>
              <div><div style={{fontSize:9,color:C.t4}}>ERR%</div><div style={{fontSize:12,fontWeight:600,color:s.errorRate>1?C.wn:C.ok}}>{(s.errorRate || 0).toFixed(1)}%</div></div>
            </div>
          </Card>
        ))}
      </div>
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
    <div style={{padding:20}}>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:4}}>Health</h1>
      <span style={{fontSize:11,color:C.t3}}>System status and diagnostics</span>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,marginBottom:20,padding:"12px 16px",background:"rgba(15,23,42,0.5)",borderRadius:8,borderLeft:"3px solid "+C.ok}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:C.ok,boxShadow:"0 0 12px "+C.ok,animation:"pulse 2s infinite"}} />
          <div>
            <div style={{fontSize:14,fontWeight:600,color:C.t1}}>Gateway Online</div>
            <div style={{fontSize:10,color:C.t3}}>agent-dashboard-backend-production.up.railway.app</div>
          </div>
        </div>
        <div style={{display:"flex",gap:20}}>
          <div><div style={{fontSize:9,color:C.t3,textTransform:"uppercase"}}>Uptime</div><div style={{fontSize:13,fontWeight:600,color:C.t1}}>14d 7h</div></div>
          <div><div style={{fontSize:9,color:C.t3,textTransform:"uppercase"}}>Agents</div><div style={{fontSize:13,fontWeight:600,color:C.t1}}>{activeAgents}</div></div>
          <div><div style={{fontSize:9,color:C.t3,textTransform:"uppercase"}}>Latency</div><div style={{fontSize:13,fontWeight:600,color:C.t1}}>{Math.round(totalLatency)}ms</div></div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div>
          <SLbl n={services.length}>Services</SLbl>
          {services.map((s,i) => (
            <Card key={i} p="12px 16px" style={{marginBottom:8,borderLeft:"3px solid "+(s.status==="healthy"?C.ok:C.wn)}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:s.status==="healthy"?C.ok:C.wn}} />
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.t1}}>{s.name}</div>
                    <div style={{fontSize:9,color:C.t3}}>{s.host}:{s.port}</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:12,fontWeight:500,color:s.status==="healthy"?C.ok:C.wn}}>{s.status}</div>
                  <div style={{fontSize:10,color:C.t3}}>{s.latencyMs || 0}ms</div>
                </div>
              </div>
              {(s.cpuPct > 0 || s.memPct > 0) && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:10}}>
                  <div><div style={{fontSize:8,color:C.t3,textTransform:"uppercase"}}>CPU</div><MBar v={s.cpuPct || 0} /></div>
                  <div><div style={{fontSize:8,color:C.t3,textTransform:"uppercase"}}>MEM</div><MBar v={s.memPct || 0} /></div>
                </div>
              )}
            </Card>
          ))}
          {services.length === 0 && <div style={{color:C.t3,padding:20,textAlign:"center"}}>No services</div>}
        </div>

        <div>
          <SLbl>System Metrics</SLbl>
          <Card p="16px" style={{marginBottom:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><div style={{fontSize:9,color:C.t3,textTransform:"uppercase",marginBottom:4}}>CPU</div><MBar v={avgCpu} /><div style={{fontSize:11,color:C.t1,marginTop:4}}>{avgCpu.toFixed(1)}%</div></div>
              <div><div style={{fontSize:9,color:C.t3,textTransform:"uppercase",marginBottom:4}}>Memory</div><MBar v={avgMem} /><div style={{fontSize:11,color:C.t1,marginTop:4}}>{avgMem.toFixed(1)}%</div></div>
            </div>
          </Card>

          <SLbl>OpenClaw Diagnostics</SLbl>
          <Card p="14px" style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:C.ok}} /><span style={{fontSize:12,color:C.t1}}>API Connectivity</span></div>
              <span style={{fontSize:10,color:C.t3}}>-50ms / 120ms</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:C.ok}} /><span style={{fontSize:12,color:C.t1}}>PostgreSQL</span></div>
              <span style={{fontSize:10,color:C.t3}}>healthy</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:C.ok}} /><span style={{fontSize:12,color:C.t1}}>Gateway</span></div>
              <span style={{fontSize:10,color:C.t3}}>online</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:C.ok}} /><span style={{fontSize:12,color:C.t1}}>Sessions</span></div>
              <span style={{fontSize:10,color:C.t3}}>{agents.length} total</span>
            </div>
          </Card>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"rgba(245,158,11,0.1)",borderRadius:6,marginTop:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:C.wn}} /><span style={{fontSize:11,color:C.wn}}>Disk Space</span></div>
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
  const lvlC = {DEBUG:C.t3,INFO:C.accB,WARN:C.wn,ERROR:C.er,FATAL:"#fca5a5"};

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 110px)"}}>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:10}}>Logs</h1>
      <span style={{fontSize:11,color:C.t3}}>Activity stream and system events</span>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginTop:20}}>
        <Card p="12px 14px"><div style={{fontSize:10,color:C.t3,marginBottom:6}}>TOTAL</div><div style={{fontSize:28,fontWeight:700,color:C.t1}}>{logs.length}</div><div style={{fontSize:10,color:C.t3,marginTop:2}}>{lf==="ALL"?"all":"filtered"}</div></Card>
        <Card p="12px 14px"><div style={{fontSize:10,color:C.t3,marginBottom:6}}>INFO</div><div style={{fontSize:28,fontWeight:700,color:C.accB}}>{lc.INFO}</div></Card>
        <Card p="12px 14px"><div style={{fontSize:10,color:C.t3,marginBottom:6}}>WARN</div><div style={{fontSize:28,fontWeight:700,color:C.wn}}>{lc.WARN}</div></Card>
        <Card p="12px 14px"><div style={{fontSize:10,color:C.t3,marginBottom:6}}>ERROR</div><div style={{fontSize:28,fontWeight:700,color:C.er}}>{lc.ERROR}</div></Card>
      </div>

      <div style={{display:"flex",gap:3,marginBottom:10}}>
        <Chip label="ALL" active={lf==="ALL"} onClick={() => setLf("ALL")} />
        {["DEBUG","INFO","WARN","ERROR"].map(l => <Chip key={l} label={l} active={lf===l} onClick={() => setLf(l)} />)}
        <button onClick={() => setAutoS(!autoS)} style={{marginLeft:"auto",padding:"4px 10px",borderRadius:6,fontSize:10,fontFamily:FN,background:autoS?C.accD:"rgba(255,255,255,.02)",color:autoS?C.accB:C.t3,border:"1px solid "+(autoS?"rgba(59,130,246,.35)":C.bdr),cursor:"pointer"}}>⤓ Auto</button>
      </div>

      <Card p="0" style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{display:"grid",gridTemplateColumns:"120px 44px 90px 1fr",padding:"7px 14px",borderBottom:"1px solid "+C.bdr,background:C.bgS}}>
          {["Time","Level","Source","Message"].map(h => <span key={h} style={{fontSize:9,color:C.t3,textTransform:"uppercase"}}>{h}</span>)}
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {filtered.slice(0,100).map(l => (
            <div key={l.id} style={{display:"grid",gridTemplateColumns:"120px 44px 90px 1fr",padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,.03)",background:l.level==="ERROR"?"rgba(239,68,68,.05)":l.level==="WARN"?"rgba(245,158,11,.02)":"transparent"}}>
              <span style={{fontSize:11,color:C.t2,fontVariantNumeric:"tabular-nums"}}>{new Date(l.timestamp).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}</span>
              <span style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:600,background:l.level==="INFO"?"rgba(59,130,246,.12)":l.level==="WARN"?"rgba(245,158,11,.1)":l.level==="ERROR"?"rgba(239,68,68,.1)":"rgba(148,163,184,.08)",color:lvlC[l]||C.t3}}>{l.level}</span>
              <span style={{fontSize:11,color:C.cy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.source}</span>
              <span style={{fontSize:11,color:l.level==="ERROR"?"#f87171":C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.message}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{padding:40,textAlign:"center",color:C.t3}}>No logs to display</div>
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
          <button style={{background:"rgba(255,255,255,.03)",border:"1px solid "+C.bdr,borderRadius:6,padding:"3px 8px",color:C.t2,cursor:"pointer",fontSize:11,fontFamily:FN}}>↻</button>
          <button onClick={() => setAuto(!auto)} style={{background:auto?C.accD:"rgba(255,255,255,.03)",border:"1px solid "+(auto?"rgba(59,130,246,.4)":C.bdr),borderRadius:6,padding:"3px 10px",color:auto?C.acc:C.t3,cursor:"pointer",fontSize:9,fontWeight:500,fontFamily:FN}}>AUTO</button>
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
