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
const fm = n => { if(n>=1e6) return (n/1e6).toFixed(1)+"M"; if(n>=1e3) return (n/1e3).toFixed(n>=1e4?0:1)+"K"; return n.toLocaleString(); };
const ta = ts => { const s=Math.floor((Date.now()-ts)/1000); if(s<60) return s+"s ago"; if(s<3600) return Math.floor(s/60)+"m ago"; return Math.floor(s/3600)+"h ago"; };
const df = ms => { if(!ms) return "—"; if(ms<1000) return ms+"ms"; return (ms/1000).toFixed(1)+"s"; };

const SM = {
  active:{bg:C.okD,b:C.okB,c:"#4ade80",d:C.ok}, healthy:{bg:C.okD,b:C.okB,c:"#4ade80",d:C.ok},
  online:{bg:C.okD,b:C.okB,c:"#4ade80",d:C.ok}, ok:{bg:C.okD,b:C.okB,c:"#4ade80",d:C.ok},
  pass:{bg:C.okD,b:C.okB,c:"#4ade80",d:C.ok},
  running:{bg:C.accD,b:"rgba(59,130,246,.3)",c:C.accB,d:C.acc},
  idle:{bg:"rgba(148,163,184,.08)",b:"rgba(148,163,184,.2)",c:"#94a3b8",d:"#64748b"},
  finished:{bg:"rgba(34,197,94,.06)",b:"rgba(34,197,94,.18)",c:"#86efac",d:C.ok},
  warn:{bg:C.wnD,b:C.wnB,c:"#fbbf24",d:C.wn}, degraded:{bg:C.wnD,b:C.wnB,c:"#fbbf24",d:C.wn},
  queued:{bg:C.wnD,b:C.wnB,c:"#fbbf24",d:C.wn},
  error:{bg:C.erD,b:C.erB,c:"#f87171",d:C.er}, failed:{bg:C.erD,b:C.erB,c:"#f87171",d:C.er},
  fail:{bg:C.erD,b:C.erB,c:"#f87171",d:C.er}, offline:{bg:C.erD,b:C.erB,c:"#f87171",d:C.er}
};

const AGENTS = [
  {id:"agt_main",name:"Orchestrator",type:"MAIN",status:"active",model:"anthropic/claude-opus-4",provider:"Anthropic",desc:"Primary orchestration agent",runs24h:142,err24h:1,tokIn:456000,tokOut:189000,costDay:8.42,latAvg:1.2,latP95:3.4,ctxAvg:68,tools:["file_read","file_write","web_search","shell_exec","code_interpreter"],errors:[{ts:Date.now()-3600000,msg:"Context overflow 98%",sev:"warn"}]},
  {id:"agt_research",name:"ResearchBot",type:"SUBAGENT",status:"active",model:"anthropic/claude-sonnet-4",provider:"Anthropic",desc:"Deep research agent",runs24h:67,err24h:0,tokIn:234000,tokOut:98000,costDay:3.12,latAvg:0.9,latP95:2.1,ctxAvg:45,tools:["web_search","pdf_reader"],errors:[]},
  {id:"agt_code",name:"CodeWriter",type:"SUBAGENT",status:"active",model:"google/gemini-2.5-pro",provider:"Google",desc:"Code generation",runs24h:45,err24h:2,tokIn:178000,tokOut:124000,costDay:4.56,latAvg:0.8,latP95:1.8,ctxAvg:62,tools:["file_read","shell_exec","git_ops"],errors:[{ts:Date.now()-7200000,msg:"Shell permission denied",sev:"error"}]},
  {id:"agt_data",name:"DataAnalyst",type:"SUBAGENT",status:"idle",model:"openai/gpt-4o",provider:"OpenAI",desc:"Data analysis",runs24h:28,err24h:0,tokIn:89000,tokOut:67000,costDay:2.34,latAvg:0.7,latP95:1.5,ctxAvg:38,tools:["code_interpreter","sql_query"],errors:[]},
  {id:"agt_health",name:"HealthMonitor",type:"SUBAGENT",status:"active",model:"anthropic/claude-haiku-4",provider:"Anthropic",desc:"Health monitoring",runs24h:96,err24h:0,tokIn:18000,tokOut:8500,costDay:0.24,latAvg:0.3,latP95:0.6,ctxAvg:12,tools:["health_check","alert_send"],errors:[]},
  {id:"agt_guard",name:"SafetyGuard",type:"SUBAGENT",status:"active",model:"anthropic/claude-haiku-4",provider:"Anthropic",desc:"Safety filter",runs24h:210,err24h:0,tokIn:42000,tokOut:8400,costDay:0.38,latAvg:0.15,latP95:0.3,ctxAvg:8,tools:["pii_scan"],errors:[]},
  {id:"agt_cron",name:"CronScheduler",type:"SUBAGENT",status:"active",model:"anthropic/claude-haiku-4",provider:"Anthropic",desc:"Scheduled tasks",runs24h:48,err24h:0,tokIn:9600,tokOut:4800,costDay:0.12,latAvg:0.2,latP95:0.4,ctxAvg:6,tools:["cron_exec"],errors:[]},
];

const SESSIONS = [
  {id:"sess_a1b2c3",status:"active",tok24h:89420,model:"claude-opus-4",agent:"Orchestrator"},
  {id:"sess_d4e5f6",status:"active",tok24h:67100,model:"claude-sonnet-4",agent:"ResearchBot"},
  {id:"sess_g7h8i9",status:"active",tok24h:34200,model:"gemini-2.5-pro",agent:"CodeWriter"},
  {id:"sess_j0k1l2",status:"active",tok24h:22050,model:"gpt-4o",agent:"DataAnalyst"},
  {id:"sess_p6q7r8",status:"idle",tok24h:8900,model:"claude-haiku-4",agent:"HealthMonitor"},
];

const RUNS = [
  {id:"run_001",src:"MAIN",label:"Deploy analysis",status:"running",started:Date.now()-45000,dur:null,model:"claude-opus-4",ctx:67,tIn:12400,tOut:3200},
  {id:"run_002",src:"SUBAGENT",label:"Research: rate limits",status:"running",started:Date.now()-30000,dur:null,model:"claude-sonnet-4",ctx:42,tIn:8900,tOut:1800},
  {id:"run_003",src:"CRON",label:"Health check",status:"finished",started:Date.now()-120000,dur:4200,model:"claude-haiku-4",ctx:12,tIn:2100,tOut:890},
  {id:"run_004",src:"MAIN",label:"Refactor auth",status:"finished",started:Date.now()-300000,dur:18400,model:"claude-opus-4",ctx:78,tIn:34500,tOut:12800},
  {id:"run_005",src:"SUBAGENT",label:"Code: middleware",status:"finished",started:Date.now()-420000,dur:8900,model:"gemini-2.5-pro",ctx:55,tIn:18200,tOut:7600},
  {id:"run_006",src:"MAIN",label:"DB optimization",status:"failed",started:Date.now()-600000,dur:2100,model:"claude-opus-4",ctx:89,tIn:42000,tOut:200},
];

const TOKEN_ROWS = [
  {id:"tu01",ts:Date.now()-60000,provider:"Anthropic",model:"claude-opus-4",mc:C.accB,agent:"Orchestrator",tIn:3097,tOut:380,cost:0.0231,speed:26.4,finish:"--"},
  {id:"tu02",ts:Date.now()-62000,provider:"Moonshot",model:"Kimi K2.5",mc:C.ok,agent:"ResearchBot",tIn:3701,tOut:495,cost:0.0237,speed:40.2,finish:"--"},
  {id:"tu03",ts:Date.now()-180000,provider:"Moonshot",model:"Kimi K2.5",mc:C.ok,agent:"Orchestrator",tIn:41651,tOut:788,cost:0.0438,speed:31.1,finish:"stop"},
  {id:"tu04",ts:Date.now()-185000,provider:"Moonshot",model:"Kimi K2.5",mc:C.ok,agent:"CodeWriter",tIn:40916,tOut:640,cost:0.043,speed:27.3,finish:"tool_calls"},
  {id:"tu05",ts:Date.now()-186000,provider:"Moonshot",model:"Kimi K2.5",mc:C.ok,agent:"Orchestrator",tIn:39278,tOut:103,cost:0.0405,speed:15.8,finish:"tool_calls"},
  {id:"tu06",ts:Date.now()-240000,provider:"Anthropic",model:"claude-opus-4",mc:C.accB,agent:"Orchestrator",tIn:28400,tOut:1240,cost:0.189,speed:18.2,finish:"stop"},
  {id:"tu07",ts:Date.now()-300000,provider:"Anthropic",model:"claude-sonnet-4",mc:C.cy,agent:"ResearchBot",tIn:22100,tOut:3400,cost:0.087,speed:34.5,finish:"stop"},
  {id:"tu08",ts:Date.now()-360000,provider:"Google",model:"gemini-2.5-pro",mc:"#fbbf24",agent:"CodeWriter",tIn:45200,tOut:8900,cost:0.054,speed:42.1,finish:"stop"},
  {id:"tu09",ts:Date.now()-420000,provider:"OpenAI",model:"gpt-4o",mc:C.pu,agent:"DataAnalyst",tIn:18900,tOut:2300,cost:0.063,speed:28.7,finish:"tool_calls"},
  {id:"tu10",ts:Date.now()-480000,provider:"Anthropic",model:"claude-haiku-4",mc:"#86efac",agent:"SafetyGuard",tIn:1200,tOut:180,cost:0.0012,speed:89.4,finish:"stop"},
  {id:"tu11",ts:Date.now()-540000,provider:"Anthropic",model:"claude-opus-4",mc:C.accB,agent:"Orchestrator",tIn:52300,tOut:4200,cost:0.34,speed:15.1,finish:"stop"},
  {id:"tu12",ts:Date.now()-600000,provider:"Moonshot",model:"Kimi K2.5",mc:C.ok,agent:"ResearchBot",tIn:34800,tOut:920,cost:0.037,speed:22.6,finish:"tool_calls"},
  {id:"tu13",ts:Date.now()-660000,provider:"Google",model:"gemini-2.5-pro",mc:"#fbbf24",agent:"CodeWriter",tIn:38700,tOut:12400,cost:0.051,speed:38.9,finish:"stop"},
  {id:"tu14",ts:Date.now()-720000,provider:"Anthropic",model:"claude-opus-4",mc:C.accB,agent:"Orchestrator",tIn:61200,tOut:2100,cost:0.38,speed:12.4,finish:"error"},
  {id:"tu15",ts:Date.now()-780000,provider:"OpenAI",model:"gpt-4o",mc:C.pu,agent:"DataAnalyst",tIn:24500,tOut:3800,cost:0.084,speed:25.3,finish:"stop"},
];

const MODEL_USAGE = [
  {model:"claude-opus-4",provider:"Anthropic",cost:12.45,pct:42},
  {model:"claude-sonnet-4",provider:"Anthropic",cost:8.32,pct:24},
  {model:"gemini-2.5-pro",provider:"Google",cost:6.78,pct:18},
  {model:"gpt-4o",provider:"OpenAI",cost:3.42,pct:10},
  {model:"claude-haiku-4",provider:"Anthropic",cost:0.68,pct:6},
];

const SKILLS = [
  {id:"sk1",name:"Web Search",ver:"2.4.1",cat:"Research",on:true,status:"ok",desc:"Real-time web search",use24h:234,latAvg:420,errRate:0.2,config:{providers:["google","bing"]}},
  {id:"sk2",name:"File Operations",ver:"3.1.0",cat:"System",on:true,status:"ok",desc:"Sandboxed FS access",use24h:189,latAvg:45,errRate:0.1,config:{sandbox:"/workspace"}},
  {id:"sk3",name:"Shell Executor",ver:"1.8.2",cat:"System",on:true,status:"warn",desc:"Container shell",use24h:78,latAvg:890,errRate:1.8,config:{timeout:30000}},
  {id:"sk4",name:"Code Interpreter",ver:"2.2.0",cat:"Analysis",on:true,status:"ok",desc:"Python/JS/SQL",use24h:56,latAvg:1200,errRate:0.8,config:{langs:["py","js"]}},
  {id:"sk5",name:"Git Operations",ver:"1.5.1",cat:"DevOps",on:true,status:"ok",desc:"Git clone/push",use24h:34,latAvg:650,errRate:0.3,config:{sign:true}},
  {id:"sk6",name:"Vector Memory",ver:"2.0.0",cat:"Memory",on:true,status:"ok",desc:"Semantic RAG store",use24h:145,latAvg:35,errRate:0.0,config:{engine:"qdrant"}},
  {id:"sk7",name:"PII Scanner",ver:"1.0.2",cat:"Security",on:true,status:"ok",desc:"PII redaction",use24h:420,latAvg:25,errRate:0.0,config:{action:"redact"}},
  {id:"sk8",name:"Legacy Scraper",ver:"0.9.0",cat:"Deprecated",on:false,status:"error",desc:"Deprecated",use24h:0,latAvg:0,errRate:100,config:{deprecated:true}},
];

const HEALTH = {
  gw:{host:"gw-us-east-1.openclaw.dev",ver:"1.4.2",up:"14d 7h",conn:42,rps:18.4},
  svcs:[
    {name:"API Server",status:"healthy",host:"api-01",lat:12,cpu:23,mem:45},
    {name:"Worker Pool",status:"healthy",host:"worker-pool",lat:8,cpu:67,mem:72},
    {name:"Scheduler",status:"healthy",host:"cron-01",lat:5,cpu:8,mem:12},
    {name:"Vector DB",status:"healthy",host:"qdrant",lat:3,cpu:34,mem:58},
    {name:"Redis",status:"healthy",host:"redis",lat:1,cpu:5,mem:28},
    {name:"PostgreSQL",status:"healthy",host:"pg",lat:4,cpu:18,mem:52},
    {name:"CDN",status:"degraded",host:"cdn",lat:145,cpu:0,mem:0},
  ],
  checks:[
    {name:"API Connectivity",s:"pass",d:"< 50ms",ms:120},
    {name:"Anthropic API",s:"pass",d:"All models ok",ms:890},
    {name:"Google API",s:"pass",d:"gemini ok",ms:650},
    {name:"OpenAI API",s:"pass",d:"gpt-4o ok",ms:720},
    {name:"Moonshot API",s:"pass",d:"Kimi K2.5 ok",ms:580},
    {name:"Vector DB",s:"pass",d:"3 collections",ms:35},
    {name:"Redis",s:"pass",d:"94.2% hit rate",ms:12},
    {name:"Disk Space",s:"warn",d:"78% used",ms:15},
    {name:"SSL Certs",s:"pass",d:"67 days left",ms:200},
    {name:"CDN Latency",s:"warn",d:"P95 145ms",ms:450},
    {name:"Log Pipeline",s:"pass",d:"340 evt/s",ms:80},
  ],
  sys:{cpu:34,mem:40,disk:78,netIn:12.4,netOut:8.7}
};

function genLogs(n) {
  const m = [["INFO","gateway","Incoming POST /api/chat"],["INFO","orchestrator","Routing to MainAgent"],["DEBUG","orchestrator","Context: 12400 tok"],["INFO","safety-guard","Input scan: clean"],["WARN","code-writer","Shell timeout 28s/30s"],["ERROR","code-writer","Shell exec failed"],["INFO","health-monitor","Running checks"],["DEBUG","vector-db","Search: 8 results"],["INFO","redis","Cache hit 94.2%"],["INFO","api","Response 200"],["WARN","health-monitor","Disk at 78%"]];
  return Array.from({length:n},(_,i) => {
    const [l,s,msg] = m[i % m.length];
    return {id:"log_"+i,ts:Date.now()-(n-i)*2500,level:l,source:s,message:msg,extra:l==="ERROR"?{stack:"Error at Worker:142"}:null};
  });
}
const ALL_LOGS = genLogs(80);

/* ═══ UI PRIMITIVES ═══ */
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

/* ═══ TAB: OVERVIEW ═══ */
function OverviewTab() {
  const [selR, setSelR] = useState(null);
  return (
    <div>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:4}}>Overview</h1>
      <span style={{fontSize:11,color:C.t3}}>Real-time agent operations</span>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,margin:"16px 0"}}>
        <KPI label="Sessions" value={5} sub="5 active" />
        <KPI label="Tokens" value={fm(2847210)} sub={fm(412850)+" 24h"} trend="+18%" />
        <KPI label="Cost" value="$61.65" sub="$12.45 24h" trend="+12%" />
        <KPI label="Requests" value="689" sub="145 24h" />
        <Card hover style={{flex:1}}>
          <div style={{fontSize:10,color:C.t3,textTransform:"uppercase",marginBottom:6}}>MAIN MODEL</div>
          <div style={{fontSize:13,fontWeight:600,color:C.cy}}>anthropic/claude-opus-4</div>
          <div style={{fontSize:10,color:C.t3,marginTop:4}}>7 agents</div>
        </Card>
      </div>
      <SLbl>Agents</SLbl>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:16}}>
        {AGENTS.map(a => (
          <Card key={a.id} hover p="10px 14px" style={{minWidth:160,flex:"0 0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:600,color:C.t1}}>{a.name}</span>
              <Pill s={a.status} glow={a.status==="active"} />
            </div>
            <div style={{fontSize:9,color:C.t3}}>{a.model}</div>
            <div style={{display:"flex",gap:8,fontSize:9,color:C.t3,marginTop:2}}>
              <span>{a.runs24h} runs</span>
              <span style={{color:a.err24h>0?C.er:C.t3}}>{a.err24h} err</span>
            </div>
          </Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:14,alignItems:"start"}}>
        <Card p="0">
          <div style={{padding:"10px 14px",borderBottom:"1px solid "+C.bdr,fontSize:12,fontWeight:600,color:C.t1}}>Sessions</div>
          <div style={{maxHeight:340,overflowY:"auto"}}>
            {SESSIONS.map(s => (
              <div key={s.id} style={{padding:"8px 14px",borderBottom:"1px solid rgba(255,255,255,.02)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:11,fontWeight:600,color:C.accB}}>{s.id}</span>
                  <Pill s={s.status} />
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3}}>
                  <span>{s.agent}</span><span>{fm(s.tok24h)}</span>
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
              <tbody>{RUNS.map(r => (
                <TRow key={r.id} onClick={() => setSelR(r)}>
                  <td style={TD}><SrcBadge s={r.src} /></td>
                  <td style={{...TD,color:C.t1,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis"}}>{r.label}</td>
                  <td style={TD}><Pill s={r.status} glow={r.status==="running"} /></td>
                  <td style={{...TD,color:C.t3}}>{ta(r.started)}</td>
                  <td style={{...TD,color:C.t2,fontSize:10}}>{r.model}</td>
                  <td style={TD}>{r.ctx>0 ? <CtxBar p={r.ctx} /> : "—"}</td>
                  <td style={{...TD,color:C.t3}}>{fm(r.tIn)}→{fm(r.tOut)}</td>
                </TRow>
              ))}</tbody>
            </table>
          </div>
        </Card>
      </div>
      <div style={{marginTop:16}}>
        <SLbl>Model Usage · 24h</SLbl>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {MODEL_USAGE.map(u => (
            <Card key={u.model} hover p="10px 14px">
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:600,color:C.t1}}>{u.model}</span>
                <span style={{fontSize:10,color:C.t3}}>{u.pct}%</span>
              </div>
              <div style={{width:"100%",height:3,borderRadius:2,background:"rgba(255,255,255,.04)",marginBottom:6,overflow:"hidden"}}>
                <div style={{width:u.pct+"%",height:"100%",borderRadius:2,background:"linear-gradient(90deg,"+C.acc+","+C.cy+")"}} />
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3}}>
                <span>{u.provider}</span><span style={{color:C.ok}}>${u.cost.toFixed(2)}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <Drawer open={!!selR} onClose={() => setSelR(null)} title={"Run "+(selR?selR.id:"")}>
        {selR && <DGrid items={[{l:"Status",v:<Pill s={selR.status}/>},{l:"Source",v:<SrcBadge s={selR.src}/>},{l:"Model",v:<span style={{color:C.cy}}>{selR.model}</span>},{l:"Duration",v:df(selR.dur)},{l:"Context",v:selR.ctx>0?<CtxBar p={selR.ctx}/>:"—"},{l:"Tokens",v:fm(selR.tIn)+"→"+fm(selR.tOut)}]} />}
      </Drawer>
    </div>
  );
}

/* ═══ TAB: TOKEN USAGE ═══ */
function TokenUsageTab() {
  const [pf, setPf] = useState("ALL");
  const [sel, setSel] = useState(null);
  const provs = [...new Set(TOKEN_ROWS.map(r => r.provider))];
  const fl = TOKEN_ROWS.filter(r => pf==="ALL" || r.provider===pf);
  const tCost = fl.reduce((s,r) => s+r.cost, 0);
  const tIn = fl.reduce((s,r) => s+r.tIn, 0);
  const tOut = fl.reduce((s,r) => s+r.tOut, 0);
  const avgSpd = fl.length ? fl.reduce((s,r) => s+r.speed, 0)/fl.length : 0;
  const finC = {stop:C.t2,tool_calls:C.cy,error:C.er,"--":C.t4};

  return (
    <div>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:4}}>Token Usage</h1>
      <span style={{fontSize:11,color:C.t3}}>Per-request token tracking</span>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,margin:"16px 0"}}>
        <Card p="12px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>TOTAL COST</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>${tCost.toFixed(4)}</div></Card>
        <Card p="12px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>TOKENS IN</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{fm(tIn)}</div></Card>
        <Card p="12px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>TOKENS OUT</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{fm(tOut)}</div></Card>
        <Card p="12px 16px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>AVG SPEED</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{avgSpd.toFixed(1)} tps</div></Card>
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
                <td style={{...TD,color:C.t2,fontVariantNumeric:"tabular-nums"}}>{new Date(r.ts).toLocaleDateString("en-US",{month:"short",day:"numeric"})+", "+new Date(r.ts).toLocaleTimeString("en-US",{hour12:true,hour:"2-digit",minute:"2-digit"})}</td>
                <td style={{...TD,padding:"8px 4px"}}><PIcon p={r.provider} /></td>
                <td style={TD}><span style={{color:r.mc,fontWeight:600}}>{r.model}</span></td>
                <td style={{...TD,color:C.t2}}>{r.agent}</td>
                <td style={{...TD,fontVariantNumeric:"tabular-nums"}}><span style={{color:C.t1}}>{r.tIn.toLocaleString()}</span><span style={{color:C.t4,margin:"0 4px"}}>→</span><span style={{color:C.t2}}>{r.tOut.toLocaleString()}</span></td>
                <td style={{...TD,color:C.ok,fontWeight:500}}>$ {r.cost.toFixed(4)}</td>
                <td style={{...TD,color:C.t2}}>{r.speed} tps</td>
                <td style={TD}><span style={{color:finC[r.finish]||C.t3}}>{r.finish}</span></td>
              </TRow>
            ))}</tbody>
          </table>
        </div>
      </Card>
      <Drawer open={!!sel} onClose={() => setSel(null)} title="Request Detail">
        {sel && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <DGrid items={[{l:"Provider",v:<span style={{display:"flex",gap:6,alignItems:"center"}}><PIcon p={sel.provider}/>{sel.provider}</span>},{l:"Model",v:<span style={{color:sel.mc,fontWeight:600}}>{sel.model}</span>},{l:"Agent",v:sel.agent},{l:"Tokens In",v:<span style={{fontSize:15,fontWeight:700}}>{sel.tIn.toLocaleString()}</span>},{l:"Tokens Out",v:<span style={{fontSize:15,fontWeight:700}}>{sel.tOut.toLocaleString()}</span>},{l:"Cost",v:<span style={{color:C.ok,fontWeight:600}}>${sel.cost.toFixed(4)}</span>},{l:"Speed",v:sel.speed+" tps"},{l:"Finish",v:sel.finish},{l:"Time",v:new Date(sel.ts).toLocaleString()}]} />
            <SLbl>Cost Breakdown</SLbl>
            <InfoR l="Input" v={"$"+(sel.tIn*0.000015).toFixed(6)} c={C.ok} />
            <InfoR l="Output" v={"$"+(sel.tOut*0.000075).toFixed(6)} c={C.ok} />
            <InfoR l="Total" v={"$"+sel.cost.toFixed(4)} c={C.ok} />
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ═══ TAB: AGENTS ═══ */
function AgentsTab() {
  const [tf, setTf] = useState("ALL");
  const [sel, setSel] = useState(null);
  const ags = AGENTS.filter(a => tf==="ALL" || a.type===tf);
  const tC = AGENTS.reduce((s,a) => s+a.costDay, 0);
  const tR = AGENTS.reduce((s,a) => s+a.runs24h, 0);
  return (
    <div>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:16}}>Agents</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>TOTAL</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{AGENTS.length}</div></Card>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>RUNS 24H</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>{tR}</div></Card>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>ERRORS</div><div style={{fontSize:22,fontWeight:700,color:C.er}}>3</div></Card>
        <Card p="12px"><div style={{fontSize:10,color:C.t3,marginBottom:4}}>COST TODAY</div><div style={{fontSize:22,fontWeight:700,color:C.t1}}>${tC.toFixed(2)}</div></Card>
      </div>
      <div style={{display:"flex",gap:3,marginBottom:12}}>{["ALL","MAIN","SUBAGENT"].map(t => <Chip key={t} label={t} active={tf===t} onClick={() => setTf(t)} />)}</div>
      <Card p="0"><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{borderBottom:"1px solid "+C.bdr}}>{["Agent","Type","Status","Model","Runs","Err","Tokens","Cost","Lat"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>{ags.map(a => (
            <TRow key={a.id} onClick={() => setSel(a)}>
              <td style={TD}><div style={{fontWeight:600,color:C.t1}}>{a.name}</div><div style={{fontSize:9,color:C.t3}}>{a.id}</div></td>
              <td style={TD}><SrcBadge s={a.type} /></td>
              <td style={TD}><Pill s={a.status} glow={a.status==="active"} /></td>
              <td style={{...TD,color:C.cy,fontSize:10}}>{a.model}</td>
              <td style={{...TD,color:C.t1}}>{a.runs24h}</td>
              <td style={{...TD,color:a.err24h>0?C.er:C.t3}}>{a.err24h}</td>
              <td style={{...TD,color:C.t2}}>{fm(a.tokIn)}→{fm(a.tokOut)}</td>
              <td style={{...TD,color:C.ok}}>${a.costDay.toFixed(2)}</td>
              <td style={{...TD,color:C.t2}}>{a.latAvg}s</td>
            </TRow>
          ))}</tbody>
        </table>
      </div></Card>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={"Agent: "+(sel?sel.name:"")}>
        {sel && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:12,color:C.t2}}>{sel.desc}</div>
            <DGrid items={[{l:"Type",v:<SrcBadge s={sel.type}/>},{l:"Status",v:<Pill s={sel.status} glow/>},{l:"Model",v:<span style={{color:C.cy}}>{sel.model}</span>},{l:"Provider",v:sel.provider},{l:"Runs 24h",v:<span style={{fontSize:15,fontWeight:700}}>{sel.runs24h}</span>},{l:"Cost",v:<span style={{color:C.ok}}>${sel.costDay.toFixed(2)}</span>},{l:"Latency",v:sel.latAvg+"s"},{l:"P95",v:sel.latP95+"s"},{l:"Context",v:<MBar v={sel.ctxAvg}/>}]} />
            <SLbl n={sel.tools.length}>Tools</SLbl>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{sel.tools.map(t => <span key={t} style={{padding:"3px 8px",borderRadius:6,background:C.bgSub,border:"1px solid "+C.bdr,fontSize:10,color:C.t2}}>{t}</span>)}</div>
            {sel.errors.length>0 && <div><SLbl n={sel.errors.length}>Errors</SLbl>{sel.errors.map((e,i) => <div key={i} style={{padding:8,borderRadius:6,background:e.sev==="error"?C.erD:C.wnD,border:"1px solid "+(e.sev==="error"?C.erB:C.wnB),fontSize:11,color:e.sev==="error"?"#f87171":"#fbbf24",marginBottom:4}}>{ta(e.ts)} — {e.msg}</div>)}</div>}
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ═══ TAB: SKILLS ═══ */
function SkillsTab() {
  const [cf, setCf] = useState("ALL");
  const [sel, setSel] = useState(null);
  const cats = [...new Set(SKILLS.map(s => s.cat))];
  const sk = SKILLS.filter(s => cf==="ALL" || s.cat===cf);
  return (
    <div>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:16}}>Skills</h1>
      <div style={{display:"flex",gap:3,marginBottom:12,flexWrap:"wrap"}}>
        <Chip label="ALL" active={cf==="ALL"} onClick={() => setCf("ALL")} />
        {cats.map(c => <Chip key={c} label={c} active={cf===c} onClick={() => setCf(c)} />)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
        {sk.map(s => (
          <Card key={s.id} hover onClick={() => setSel(s)} p="12px 16px" style={{opacity:s.on?1:0.45}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div><div style={{fontSize:13,fontWeight:600,color:C.t1}}>{s.name}</div><div style={{fontSize:10,color:C.t3}}>v{s.ver} · {s.cat}</div></div>
              <div style={{display:"flex",gap:4}}><Pill s={s.status} /><span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:s.on?C.okD:C.erD,color:s.on?"#4ade80":"#f87171"}}>{s.on?"ON":"OFF"}</span></div>
            </div>
            <div style={{fontSize:10,color:C.t3,marginBottom:8}}>{s.desc}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
              <div><div style={{fontSize:9,color:C.t4}}>USE 24H</div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{s.use24h}</div></div>
              <div><div style={{fontSize:9,color:C.t4}}>LATENCY</div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{df(s.latAvg)}</div></div>
              <div><div style={{fontSize:9,color:C.t4}}>ERR%</div><div style={{fontSize:12,fontWeight:600,color:s.errRate>1?C.wn:C.ok}}>{s.errRate}%</div></div>
            </div>
          </Card>
        ))}
      </div>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={"Skill: "+(sel?sel.name:"")}>
        {sel && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <DGrid items={[{l:"Version",v:"v"+sel.ver},{l:"Category",v:sel.cat},{l:"Status",v:<Pill s={sel.status}/>},{l:"Usage",v:String(sel.use24h)},{l:"Latency",v:df(sel.latAvg)},{l:"Error%",v:sel.errRate+"%"}]} />
            <SLbl>Config</SLbl>
            <pre style={{fontSize:10,color:C.t3,background:"rgba(0,0,0,.2)",padding:12,borderRadius:8,border:"1px solid "+C.bdr,overflow:"auto"}}>{JSON.stringify(sel.config,null,2)}</pre>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ═══ TAB: HEALTH ═══ */
function HealthTab() {
  const h = HEALTH;
  const [exp, setExp] = useState(null);
  return (
    <div>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:16}}>Health</h1>
      <Card p="14px 18px" style={{marginBottom:16,borderLeft:"3px solid "+C.ok}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:C.ok,boxShadow:"0 0 12px "+C.ok,animation:"pulse 2s infinite"}} />
            <div><div style={{fontSize:14,fontWeight:600,color:C.t1}}>Gateway Online</div><div style={{fontSize:10,color:C.t3}}>{h.gw.host} · v{h.gw.ver}</div></div>
          </div>
          <div style={{display:"flex",gap:18}}>
            {[{l:"UPTIME",v:h.gw.up},{l:"CONN",v:h.gw.conn},{l:"REQ/S",v:h.gw.rps}].map(x => <div key={x.l} style={{textAlign:"center"}}><div style={{fontSize:9,color:C.t3}}>{x.l}</div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{x.v}</div></div>)}
          </div>
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div>
          <SLbl n={h.svcs.length}>Services</SLbl>
          {h.svcs.map((s,i) => (
            <Card key={i} hover onClick={() => setExp(exp===i?null:i)} p="10px 14px" style={{marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><Pill s={s.status} glow={s.status==="healthy"} /><span style={{fontSize:12,fontWeight:600,color:C.t1}}>{s.name}</span></div>
                <span style={{fontSize:10,color:C.t3}}>{s.lat}ms</span>
              </div>
              {exp===i && (
                <div style={{borderTop:"1px solid "+C.bdr,paddingTop:8,marginTop:8}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
                    <div><div style={{fontSize:9,color:C.t4}}>CPU</div><MBar v={s.cpu} /></div>
                    <div><div style={{fontSize:9,color:C.t4}}>MEM</div><MBar v={s.mem} /></div>
                  </div>
                  <InfoR l="Host" v={s.host} />
                </div>
              )}
            </Card>
          ))}
        </div>
        <div>
          <SLbl>System Metrics</SLbl>
          <Card p="14px" style={{marginBottom:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[{l:"CPU",v:h.sys.cpu+"%"},{l:"MEM",v:h.sys.mem+"%"},{l:"DISK",v:h.sys.disk+"%"},{l:"NET",v:"↓"+h.sys.netIn+" ↑"+h.sys.netOut}].map(x => (
                <div key={x.l}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,color:C.t3}}>{x.l}</span><span style={{fontSize:10,color:C.t2}}>{x.v}</span></div>{x.l!=="NET" && <MBar v={parseInt(x.v)} />}</div>
              ))}
            </div>
          </Card>
          <SLbl n={h.checks.length}>openclaw doctor</SLbl>
          <Card p="0">
            <div style={{padding:"8px 14px",borderBottom:"1px solid "+C.bdr,display:"flex",gap:10}}>
              <span style={{fontSize:10,color:C.ok}}>{h.checks.filter(c => c.s==="pass").length} pass</span>
              <span style={{fontSize:10,color:C.wn}}>{h.checks.filter(c => c.s==="warn").length} warn</span>
            </div>
            <div style={{maxHeight:300,overflowY:"auto"}}>
              {h.checks.map((c,i) => (
                <div key={i} style={{padding:"7px 14px",borderBottom:"1px solid rgba(255,255,255,.02)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><Pill s={c.s} /><span style={{fontSize:11,color:C.t1}}>{c.name}</span></div>
                  <div style={{display:"flex",gap:8}}><span style={{fontSize:10,color:C.t3}}>{c.d}</span><span style={{fontSize:9,color:C.t4}}>{c.ms}ms</span></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ═══ TAB: LOGS ═══ */
function LogsTab() {
  const [lf, setLf] = useState("ALL");
  const [autoS, setAutoS] = useState(true);
  const [logs, setLogs] = useState(ALL_LOGS);
  const endRef = useRef(null);
  const lvlC = {DEBUG:C.t3,INFO:C.accB,WARN:C.wn,ERROR:C.er,FATAL:"#fca5a5"};

  useEffect(() => {
    const iv = setInterval(() => {
      const m = [["INFO","gateway","Request — sess_"+Math.random().toString(36).slice(2,8)],["DEBUG","orchestrator","Context: "+Math.floor(Math.random()*50000)],["INFO","api","Response 200"],["WARN","health-monitor","Disk "+(78+Math.random()*3).toFixed(1)+"%"]];
      const [l,s,msg] = m[Math.floor(Math.random()*m.length)];
      setLogs(prev => [...prev.slice(-149),{id:"ll_"+Date.now(),ts:Date.now(),level:l,source:s,message:msg,extra:null}]);
    }, 2800);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (autoS && endRef.current) endRef.current.scrollIntoView({behavior:"smooth"});
  }, [logs, autoS]);

  const fl = logs.filter(l => lf==="ALL" || l.level===lf);
  const lc = {};
  logs.forEach(l => { lc[l.level] = (lc[l.level]||0) + 1; });

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 110px)"}}>
      <h1 style={{fontSize:17,fontWeight:600,color:C.t1,marginBottom:10}}>Logs</h1>
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        {["DEBUG","INFO","WARN","ERROR","FATAL"].map(l => (
          <Card key={l} p="6px 12px" style={{flex:1,borderBottom:"2px solid "+((lc[l]||0)>0?lvlC[l]:"transparent")}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><LvlBadge l={l} /><span style={{fontSize:14,fontWeight:700,color:(lc[l]||0)>0?lvlC[l]:C.t4}}>{lc[l]||0}</span></div>
          </Card>
        ))}
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
          {fl.slice(-80).map(l => (
            <div key={l.id} style={{display:"grid",gridTemplateColumns:"120px 44px 90px 1fr",padding:"4px 14px",borderBottom:"1px solid rgba(255,255,255,.015)",background:l.level==="ERROR"?"rgba(239,68,68,.03)":l.level==="WARN"?"rgba(245,158,11,.02)":"transparent"}}>
              <span style={{fontSize:10,color:C.t3,fontVariantNumeric:"tabular-nums"}}>{new Date(l.ts).toLocaleTimeString("en-US",{hour12:false})}</span>
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

/* ═══ MAIN APP ═══ */
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
