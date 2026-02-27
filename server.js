// MDX Bridge — OpenClaw sidecar for MDX Control dashboard
// Reads directly from OpenClaw files + gateway CLI. Zero database.
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { execSync, exec } from 'child_process';
import { watch } from 'chokidar';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/feed' });

app.use(cors());
app.use(express.json());

// ── CONFIG ──────────────────────────────────────────────────
const HOME = process.env.HOME || '/home/clawd';
const OC = path.join(HOME, '.openclaw');
const MDX = path.join(OC, 'mdx');
const PORT = process.env.PORT || 3001;

// Ensure MDX data dirs
[MDX].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
['tasks.json', 'opportunities.json'].forEach(f => {
  const p = path.join(MDX, f);
  if (!fs.existsSync(p)) fs.writeFileSync(p, '[]');
});

// ── HELPERS ─────────────────────────────────────────────────
function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch { return null; }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getConfig() {
  return readJson(path.join(OC, 'openclaw.json')) || {};
}

function getAgentList() {
  const cfg = getConfig();
  return (cfg.agents?.list || []).map(a => ({
    id: a.id,
    name: a.identity?.name || a.name || a.id,
    emoji: a.identity?.emoji || '🤖',
    model: typeof a.model === 'string' ? a.model : a.model?.primary || 'unknown',
    workspace: a.workspace,
  }));
}

function getAgentSessions(agentId) {
  const p = path.join(OC, 'agents', agentId, 'sessions', 'sessions.json');
  return readJson(p) || {};
}

function getLatestSession(agentId) {
  const sessions = getAgentSessions(agentId);
  let latest = null;
  let latestTime = 0;
  for (const [key, val] of Object.entries(sessions)) {
    const t = val.updatedAt || 0;
    if (t > latestTime) { latestTime = t; latest = { key, ...val }; }
  }
  return latest;
}

function deriveStatus(updatedAt) {
  if (!updatedAt) return 'offline';
  const age = Date.now() - updatedAt;
  if (age < 120_000) return 'working';
  if (age < 1_800_000) return 'idle';
  return 'offline';
}

function readLastLines(filePath, n = 10) {
  try {
    const raw = execSync(`tail -n ${n} "${filePath}"`, { encoding: 'utf-8', timeout: 3000 });
    return raw.split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

function clawExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 15000 }).trim();
  } catch (e) {
    return null;
  }
}

function parseClawJson(raw) {
  if (!raw) return null;
  const start = raw.search(/[\[{]/);
  if (start === -1) return null;
  try { return JSON.parse(raw.slice(start)); } catch { return null; }
}

// ── CACHE (5s TTL) ──────────────────────────────────────────
const cache = {};
function cached(key, ttlMs, fn) {
  const now = Date.now();
  if (cache[key] && now - cache[key].ts < ttlMs) return cache[key].data;
  const data = fn();
  cache[key] = { data, ts: now };
  return data;
}

// ── AGENT COLORS ────────────────────────────────────────────
const COLORS = {
  main:'#3B82F6', coder:'#10B981', researcher:'#8B5CF6', writer:'#F59E0B',
  support:'#EC4899', heartbeat:'#EF4444', reasoning:'#6366F1', clawma:'#14B8A6',
  monitor:'#F97316', raider:'#EF4444', default:'#6B7280'
};

// ══════════════════════════════════════════════════════════════
// ── API ROUTES ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'mdx-bridge', ts: Date.now() });
});

// ── OVERVIEW ────────────────────────────────────────────────
app.get('/api/overview', (req, res) => {
  const agents = cached('agents', 5000, buildAgents);
  const tasks = readJson(path.join(MDX, 'tasks.json')) || [];
  const activeAgents = agents.filter(a => a.status === 'working' || a.status === 'thinking').length;
  const runningTasks = tasks.filter(t => t.status === 'running').length;
  const pendingApproval = tasks.filter(t => t.requiresApproval && t.status !== 'done').length;

  // Cost estimate from sessions (rough: token count based)
  let totalTokens = 0;
  for (const a of agents) totalTokens += a.tokensToday || 0;

  res.json({
    stats: {
      activeAgents,
      runningTasks,
      pendingApproval,
      costToday: 0, // TODO: real cost calc
      tokensToday: totalTokens,
    },
    agents: agents.slice(0, 6),
    recentTasks: tasks.slice(0, 5),
  });
});

// ── AGENTS ──────────────────────────────────────────────────
function buildAgents() {
  const list = getAgentList();
  return list.map(agent => {
    const latest = getLatestSession(agent.id);
    const sessions = getAgentSessions(agent.id);

    // Sum tokens today from all sessions
    let tokensToday = 0;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    for (const [, s] of Object.entries(sessions)) {
      if (s.updatedAt && s.updatedAt > todayStart.getTime()) {
        tokensToday += s.totalTokens || s.inputTokens || 0;
      }
    }

    // Get current task from last JSONL line
    let currentTask = '';
    if (latest?.sessionFile && fs.existsSync(latest.sessionFile)) {
      const lines = readLastLines(latest.sessionFile, 3);
      for (const l of lines.reverse()) {
        if (l.role === 'assistant' && l.content) {
          const text = Array.isArray(l.content)
            ? l.content.find(c => c.type === 'text')?.text || ''
            : String(l.content);
          currentTask = text.slice(0, 120);
          break;
        }
      }
    }

    return {
      id: agent.id,
      name: agent.name,
      emoji: agent.emoji,
      model: agent.model,
      status: deriveStatus(latest?.updatedAt),
      currentTask,
      tokensToday,
      sessionCount: Object.keys(sessions).length,
      lastActive: latest?.updatedAt || null,
      color: COLORS[agent.id] || COLORS.default,
      workspace: agent.workspace,
    };
  });
}

app.get('/api/agents', (req, res) => {
  res.json(cached('agents', 5000, buildAgents));
});

app.get('/api/agents/:id', (req, res) => {
  const agents = cached('agents', 5000, buildAgents);
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

app.get('/api/agents/:id/session', (req, res) => {
  const agentId = req.params.id;
  const latest = getLatestSession(agentId);
  if (!latest?.sessionFile || !fs.existsSync(latest.sessionFile)) {
    return res.json({ lines: [], sessionKey: null });
  }
  const lines = readLastLines(latest.sessionFile, 50);
  res.json({ lines, sessionKey: latest.key, sessionId: latest.sessionId });
});

app.post('/api/agents/:id/message', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  const agentId = req.params.id;
  const cfg = getConfig();
  const token = cfg.gateway?.auth?.token || '';
  try {
    const result = clawExec(
      `curl -s -X POST http://127.0.0.1:18789/v1/chat/completions ` +
      `-H "Authorization: Bearer ${token}" ` +
      `-H "Content-Type: application/json" ` +
      `-H "x-openclaw-agent-id: ${agentId}" ` +
      `-d '${JSON.stringify({ model: `openclaw:${agentId}`, messages: [{ role: 'user', content: message }], stream: false })}'`
    );
    res.json({ ok: true, result: parseClawJson(result) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── TASKS (Missions) ────────────────────────────────────────
function getTasks() { return readJson(path.join(MDX, 'tasks.json')) || []; }
function saveTasks(tasks) { writeJson(path.join(MDX, 'tasks.json'), tasks); }

app.get('/api/tasks', (req, res) => {
  const tasks = getTasks();
  const status = req.query.status;
  const filtered = status ? tasks.filter(t => t.status === status) : tasks;
  res.json(filtered);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, agentId, priority = 'medium', requiresApproval = false } = req.body;
  if (!title || !agentId) return res.status(400).json({ error: 'title and agentId required' });

  const task = {
    id: uuidv4().slice(0, 8),
    title, description: description || '', agentId,
    status: 'queued', priority,
    sessionKey: null, requiresApproval,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: null, completedAt: null,
    tokensUsed: 0, costUsd: 0,
    steps: [],
  };

  const tasks = getTasks();
  tasks.unshift(task);
  saveTasks(tasks);
  res.json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  Object.assign(tasks[idx], req.body, { updatedAt: new Date().toISOString() });
  saveTasks(tasks);
  res.json(tasks[idx]);
});

app.delete('/api/tasks/:id', (req, res) => {
  let tasks = getTasks();
  tasks = tasks.filter(t => t.id !== req.params.id);
  saveTasks(tasks);
  res.json({ ok: true });
});

// ── LIVE FEED ───────────────────────────────────────────────
app.get('/api/feed', (req, res) => {
  const agents = getAgentList();
  const events = [];
  for (const agent of agents) {
    const latest = getLatestSession(agent.id);
    if (!latest?.sessionFile || !fs.existsSync(latest.sessionFile)) continue;
    const lines = readLastLines(latest.sessionFile, 10);
    for (const line of lines) {
      const ev = jsonlToFeedEvent(line, agent);
      if (ev) events.push(ev);
    }
  }
  events.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  res.json(events.slice(0, parseInt(req.query.limit) || 50));
});

function jsonlToFeedEvent(entry, agent) {
  if (!entry) return null;
  const ts = entry.timestamp ? new Date(entry.timestamp).getTime() : Date.now();
  const msg = entry.message || entry;
  const role = msg.role || entry.role;
  const content = Array.isArray(msg.content) ? msg.content : 
    (typeof msg.content === 'string' ? [{ type: 'text', text: msg.content }] : []);

  if (role === 'assistant') {
    const toolCall = content.find(c => c.type === 'toolCall' || c.type === 'tool_use');
    if (toolCall) {
      return {
        id: `${agent.id}-${ts}-tool`,
        agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji,
        type: 'tool_use', tool: toolCall.name || 'unknown',
        message: `${toolCall.name || 'tool'}${toolCall.input?.file_path ? ' → ' + toolCall.input.file_path : ''}`,
        timestamp: ts,
      };
    }
    const text = content.find(c => c.type === 'text');
    if (text?.text) {
      return {
        id: `${agent.id}-${ts}-msg`,
        agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji,
        type: 'assistant', tool: null,
        message: text.text.slice(0, 150),
        timestamp: ts,
      };
    }
  }
  if (role === 'toolResult' || entry.type === 'tool_result') {
    const text = content.find(c => c.type === 'text');
    return {
      id: `${agent.id}-${ts}-result`,
      agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji,
      type: 'tool_result', tool: null,
      message: (text?.text || '').slice(0, 100),
      timestamp: ts,
    };
  }
  if (role === 'user') {
    const text = content.find(c => c.type === 'text');
    if (text?.text) {
      return {
        id: `${agent.id}-${ts}-user`,
        agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji,
        type: 'user', tool: null,
        message: text.text.slice(0, 150),
        timestamp: ts,
      };
    }
  }
  return null;
}

// ── CRON / SCHEDULER ────────────────────────────────────────
function getCronJobs() {
  const data = readJson(path.join(OC, 'cron', 'jobs.json'));
  return data?.jobs || [];
}

app.get('/api/cron', (req, res) => {
  res.json(getCronJobs());
});

app.post('/api/cron', (req, res) => {
  const { name, schedule, agentId, message } = req.body;
  if (!name || !schedule || !message) return res.status(400).json({ error: 'name, schedule, message required' });
  const result = clawExec(
    `openclaw cron add --name "${name}" --schedule "${schedule}" ${agentId ? `--agent ${agentId}` : ''} --isolated --message "${message.replace(/"/g, '\\"')}" --json 2>/dev/null`
  );
  res.json({ ok: true, result: parseClawJson(result) });
});

app.patch('/api/cron/:jobId', (req, res) => {
  const { enabled } = req.body;
  const cmd = enabled ? 'enable' : 'disable';
  clawExec(`openclaw cron ${cmd} ${req.params.jobId} 2>/dev/null`);
  res.json({ ok: true });
});

app.delete('/api/cron/:jobId', (req, res) => {
  clawExec(`openclaw cron rm ${req.params.jobId} 2>/dev/null`);
  res.json({ ok: true });
});

app.post('/api/cron/:jobId/run', (req, res) => {
  clawExec(`openclaw cron run ${req.params.jobId} 2>/dev/null`);
  res.json({ ok: true });
});

// ── CONNECTIONS ─────────────────────────────────────────────
app.get('/api/connections', (req, res) => {
  const cfg = getConfig();
  const connections = [];

  // AI Providers from agents
  const providerSet = new Set();
  for (const a of cfg.agents?.list || []) {
    const model = typeof a.model === 'string' ? a.model : a.model?.primary || '';
    const provider = model.split('/')[0] || 'unknown';
    providerSet.add(provider);
  }
  for (const p of providerSet) {
    connections.push({
      id: p, name: p, icon: '🧠', category: 'ai',
      status: 'connected', detail: `Provider: ${p}`,
    });
  }

  // Channels
  const channels = cfg.channels || {};
  for (const [ch, chCfg] of Object.entries(channels)) {
    if (typeof chCfg !== 'object') continue;
    connections.push({
      id: ch, name: ch.charAt(0).toUpperCase() + ch.slice(1),
      icon: ch === 'telegram' ? '📱' : ch === 'slack' ? '💬' : ch === 'discord' ? '🎮' : '🔌',
      category: 'channel',
      status: chCfg.enabled !== false ? 'connected' : 'disconnected',
      detail: `Channel: ${ch}`,
    });
  }

  // Cron
  connections.push({
    id: 'cron', name: 'Scheduler', icon: '⏰', category: 'automation',
    status: getCronJobs().length > 0 ? 'connected' : 'disconnected',
    detail: `${getCronJobs().length} jobs`,
  });

  res.json(connections);
});

// ── ARTIFACTS ───────────────────────────────────────────────
app.get('/api/artifacts', (req, res) => {
  const agents = getAgentList();
  const artifacts = [];
  const exts = {
    code: ['.ts','.tsx','.js','.jsx','.py','.sh','.sql','.rs','.go'],
    docs: ['.md','.txt','.pdf','.docx','.rst'],
    media: ['.png','.jpg','.gif','.mp4','.mp3','.svg','.webp'],
    config: ['.json','.yaml','.toml','.env','.jsonl'],
  };

  for (const agent of agents) {
    if (!agent.workspace || !fs.existsSync(agent.workspace)) continue;
    try {
      const files = fs.readdirSync(agent.workspace).slice(0, 50);
      for (const file of files) {
        const fullPath = path.join(agent.workspace, file);
        try {
          const stat = fs.statSync(fullPath);
          if (!stat.isFile()) continue;
          const ext = path.extname(file).toLowerCase();
          let type = 'other';
          for (const [cat, extensions] of Object.entries(exts)) {
            if (extensions.includes(ext)) { type = cat; break; }
          }
          artifacts.push({
            id: `${agent.id}-${file}`,
            agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji,
            name: file, path: file, ext, type,
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          });
        } catch {}
      }
    } catch {}
  }
  artifacts.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  res.json(artifacts);
});

// ── CONFIG ──────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  const cfg = getConfig();
  // Redact sensitive fields
  const safe = { ...cfg };
  if (safe.gateway?.auth) safe.gateway.auth = { token: '***' };
  res.json(safe);
});

app.patch('/api/config', (req, res) => {
  // Only allow specific safe patches
  const { path: cfgPath, value } = req.body;
  if (!cfgPath) return res.status(400).json({ error: 'path required' });
  const result = clawExec(`openclaw config set ${cfgPath} '${JSON.stringify(value)}' 2>/dev/null`);
  res.json({ ok: true, result });
});

// ── BRAINX ──────────────────────────────────────────────────
app.get('/api/brainx/health', (req, res) => {
  const result = clawExec('brainx health 2>/dev/null');
  res.json({ status: result ? 'connected' : 'error', raw: result });
});

app.get('/api/brainx/stats', (req, res) => {
  const result = clawExec('brainx stats 2>/dev/null');
  res.json(parseClawJson(result) || { raw: result });
});

app.get('/api/brainx/memories', (req, res) => {
  const { query, limit = 10 } = req.query;
  if (!query) return res.json([]);
  const result = clawExec(`brainx search --query "${query.replace(/"/g, '\\"')}" --limit ${limit} 2>/dev/null`);
  res.json(parseClawJson(result) || []);
});

app.post('/api/brainx/search', (req, res) => {
  const { query, tier, minImportance, limit = 10 } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });
  let cmd = `brainx search --query "${query.replace(/"/g, '\\"')}" --limit ${limit}`;
  if (tier) cmd += ` --tier ${tier}`;
  if (minImportance) cmd += ` --minImportance ${minImportance}`;
  const result = clawExec(`${cmd} 2>/dev/null`);
  res.json(parseClawJson(result) || []);
});

app.post('/api/brainx/inject', (req, res) => {
  const { tier = 'hot+warm', limit = 5, minImportance = 5 } = req.body;
  const result = clawExec(`brainx inject --tier ${tier} --limit ${limit} --minImportance ${minImportance} 2>/dev/null`);
  res.json({ memories: result || '' });
});

// ── SESSIONS (all agents combined) ──────────────────────────
app.get('/api/sessions', (req, res) => {
  const agents = getAgentList();
  const allSessions = [];
  for (const agent of agents) {
    const sessions = getAgentSessions(agent.id);
    for (const [key, val] of Object.entries(sessions)) {
      allSessions.push({
        key,
        agentId: agent.id,
        agentName: agent.name,
        agentEmoji: agent.emoji,
        sessionId: val.sessionId,
        status: deriveStatus(val.updatedAt),
        updatedAt: val.updatedAt,
        totalTokens: val.totalTokens || 0,
        channel: val.lastChannel || 'unknown',
      });
    }
  }
  allSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  res.json(allSessions.slice(0, 100));
});

// ── OPPORTUNITIES ───────────────────────────────────────────
app.get('/api/opportunities', (req, res) => {
  res.json(readJson(path.join(MDX, 'opportunities.json')) || []);
});

// ══════════════════════════════════════════════════════════════
// ── WEBSOCKET LIVE FEED ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});

function broadcast(event) {
  const data = JSON.stringify(event);
  for (const ws of wsClients) {
    try { ws.send(data); } catch {}
  }
}

// Watch active session files
function startFeedWatcher() {
  const agents = getAgentList();
  const watchPaths = [];
  for (const agent of agents) {
    const sessDir = path.join(OC, 'agents', agent.id, 'sessions');
    if (fs.existsSync(sessDir)) watchPaths.push(sessDir);
  }

  if (watchPaths.length === 0) return;

  const watcher = watch(watchPaths, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200 },
  });

  const lineCounts = {};

  watcher.on('change', (filePath) => {
    if (!filePath.endsWith('.jsonl')) return;

    // Determine agent from path
    const parts = filePath.split('/');
    const agentsIdx = parts.indexOf('agents');
    if (agentsIdx === -1) return;
    const agentId = parts[agentsIdx + 1];
    const agent = getAgentList().find(a => a.id === agentId) || { id: agentId, name: agentId, emoji: '🤖' };

    // Read new lines
    const prev = lineCounts[filePath] || 0;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      lineCounts[filePath] = lines.length;

      const newLines = lines.slice(prev);
      for (const line of newLines) {
        try {
          const entry = JSON.parse(line);
          const ev = jsonlToFeedEvent(entry, agent);
          if (ev) broadcast(ev);
        } catch {}
      }
    } catch {}
  });

  console.log(`📡 Feed watcher: monitoring ${watchPaths.length} agent session dirs`);
}

// ── STATIC FILES ────────────────────────────────────────────
app.use(express.static('public'));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(process.cwd(), 'public', 'index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  }
  res.status(404).json({ error: 'Not found' });
});

// ── START ───────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MDX Bridge running on port ${PORT}`);
  console.log(`📂 OpenClaw home: ${OC}`);
  console.log(`📁 MDX data: ${MDX}`);
  startFeedWatcher();
});
