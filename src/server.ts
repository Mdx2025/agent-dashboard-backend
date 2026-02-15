// OpenClaw Dashboard Backend - Versión híbrida con Webhooks + Polling
// En desarrollo: lee de archivos locales
// Soporta: Webhooks para eventos críticos + Polling para KPIs

import Fastify from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

const server = Fastify({ logger: true });

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const CONFIG = {
  webhookSecret: process.env.WEBHOOK_SECRET || 'openclaw-secret-key',
  pollingIntervalMs: 30000, // 30 segundos
};

// =============================================================================
// IN-MEMORY STORE (en producción usar Redis)
// =============================================================================

interface LogEvent {
  id: string;
  timestamp: number;
  level: string;
  source: string;
  message: string;
  extra?: any;
}

interface SessionEvent {
  id: string;
  status: string;
  agent: string;
  model: string;
  tokens24h: number;
}

interface RunEvent {
  id: string;
  status: string;
  label: string;
  source: string;
  startedAt: number;
  duration?: number;
}

// Event stores (in-memory, resets on restart)
const eventsStore = {
  logs: [] as LogEvent[],
  sessions: [] as SessionEvent[],
  runs: [] as RunEvent[],
  lastUpdate: Date.now()
};

// =============================================================================
// HELPERS
// =============================================================================

function readJsonFile(filepath: string): any {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error reading ${filepath}:`, e);
  }
  return null;
}

function listDir(dirpath: string): string[] {
  try {
    if (fs.existsSync(dirpath)) {
      return fs.readdirSync(dirpath).filter(f => !f.startsWith('.'));
    }
  } catch (e) {
    console.error(`Error listing ${dirpath}:`, e);
  }
  return [];
}

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expected = createHash('sha256')
    .update(payload + CONFIG.webhookSecret)
    .digest('hex');
  return signature === expected;
}

// =============================================================================
// HEALTH & STATUS
// =============================================================================

server.get('/api/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// =============================================================================
// WEBHOOKS - Receivers para eventos críticos
// =============================================================================

// Webhook para logs
server.post<{ Body: LogEvent }>('/api/webhook/logs', async (request, reply) => {
  try {
    const signature = request.headers['x-webhook-signature'] as string;
    const body = JSON.stringify(request.body);
    
    // Verificar firma (opcional en desarrollo)
    if (signature && !verifyWebhookSignature(body, signature)) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    const log = request.body as LogEvent;
    eventsStore.logs.unshift({
      ...log,
      id: log.id || `log_${Date.now()}`,
      timestamp: log.timestamp || Date.now()
    });

    // Mantener solo últimos 500 logs
    if (eventsStore.logs.length > 500) {
      eventsStore.logs = eventsStore.logs.slice(0, 500);
    }

    eventsStore.lastUpdate = Date.now();
    
    return { received: true, event: 'log' };
  } catch (error: any) {
    server.log.error(error, 'Failed to process log webhook');
    return reply.status(400).send({ error: error.message });
  }
});

// Webhook para sesiones
server.post<{ Body: SessionEvent }>('/api/webhook/sessions', async (request, reply) => {
  try {
    const session = request.body as SessionEvent;
    
    // Actualizar o agregar sesión
    const existingIndex = eventsStore.sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      eventsStore.sessions[existingIndex] = session;
    } else {
      eventsStore.sessions.unshift(session);
    }

    // Mantener solo últimas 100 sesiones
    if (eventsStore.sessions.length > 100) {
      eventsStore.sessions = eventsStore.sessions.slice(0, 100);
    }

    eventsStore.lastUpdate = Date.now();
    
    return { received: true, event: 'session' };
  } catch (error: any) {
    server.log.error(error, 'Failed to process session webhook');
    return reply.status(400).send({ error: error.message });
  }
});

// Webhook para runs
server.post<{ Body: RunEvent }>('/api/webhook/runs', async (request, reply) => {
  try {
    const run = request.body as RunEvent;
    
    // Actualizar o agregar run
    const existingIndex = eventsStore.runs.findIndex(r => r.id === run.id);
    if (existingIndex >= 0) {
      eventsStore.runs[existingIndex] = run;
    } else {
      eventsStore.runs.unshift(run);
    }

    // Mantener solo últimos 100 runs
    if (eventsStore.runs.length > 100) {
      eventsStore.runs = eventsStore.runs.slice(0, 100);
    }

    eventsStore.lastUpdate = Date.now();
    
    return { received: true, event: 'run' };
  } catch (error: any) {
    server.log.error(error, 'Failed to process run webhook');
    return reply.status(400).send({ error: error.message });
  }
});

// Batch webhook para múltiples eventos
server.post<{ Body: { type: string; data: any }[] }>('/api/webhook/batch', async (request, reply) => {
  try {
    const events = request.body as { type: string; data: any }[];
    const results: any[] = [];

    for (const event of events) {
      switch (event.type) {
        case 'log':
          eventsStore.logs.unshift({ ...event.data, timestamp: Date.now() });
          results.push({ type: 'log', status: 'ok' });
          break;
        case 'session':
          eventsStore.sessions.unshift(event.data);
          results.push({ type: 'session', status: 'ok' });
          break;
        case 'run':
          eventsStore.runs.unshift(event.data);
          results.push({ type: 'run', status: 'ok' });
          break;
        default:
          results.push({ type: event.type, status: 'unknown type' });
      }
    }

    // Limpiar stores si exceden límite
    if (eventsStore.logs.length > 500) eventsStore.logs = eventsStore.logs.slice(0, 500);
    if (eventsStore.sessions.length > 100) eventsStore.sessions = eventsStore.sessions.slice(0, 100);
    if (eventsStore.runs.length > 100) eventsStore.runs = eventsStore.runs.slice(0, 100);

    eventsStore.lastUpdate = Date.now();
    
    return { received: true, results };
  } catch (error: any) {
    server.log.error(error, 'Failed to process batch webhook');
    return reply.status(400).send({ error: error.message });
  }
});

// =============================================================================
// API ENDPOINTS - Datos para el frontend
// =============================================================================

// Overview con datos frescos
server.get('/api/overview', async () => {
  const openclawDir = process.env.OPENCLAW_DIR || '/home/clawd/.openclaw';
  
  const agentsDir = path.join(openclawDir, 'agents');
  const agentNames = listDir(agentsDir);
  
  const workspaces = agentNames.map(name => ({
    name,
    workspace: path.join(openclawDir, 'workspace' + (name !== 'main' ? `-${name}` : ''))
  }));
  
  let activeSessions = 0;
  for (const agent of agentNames) {
    const sessionsDir = path.join(openclawDir, 'agents', agent, 'sessions');
    if (fs.existsSync(sessionsDir)) {
      const files = fs.readdirSync(sessionsDir);
      activeSessions += files.filter(f => f.endsWith('.jsonl') && !f.includes('.deleted')).length;
    }
  }
  
  return {
    active_agents: agentNames.length,
    active_sessions: activeSessions,
    total_tokens_used: 0,
    active_skills: listDir(path.join(openclawDir, 'skills')).length,
    system_status: 'healthy',
    uptime_seconds: process.uptime(),
    last_updated: new Date().toISOString(),
    data_source: 'polling',
    agents: workspaces.map(w => ({
      name: w.name,
      workspace: w.workspace
    }))
  };
});

// Agents - Lista de agentes
server.get('/api/agents', async () => {
  const openclawDir = process.env.OPENCLAW_DIR || '/home/clawd/.openclaw';
  const agentsDir = path.join(openclawDir, 'agents');
  const agentNames = listDir(agentsDir);
  
  const agents = [];
  for (const name of agentNames) {
    const agentDir = path.join(agentsDir, name);
    const identityPath = path.join(agentDir, 'IDENTITY.md');
    const identity = readJsonFile(identityPath);
    
    agents.push({
      id: name,
      name,
      status: 'active',
      type: name === 'main' ? 'MAIN' : 'SUBAGENT',
      provider: 'Anthropic',
      model: 'claude-sonnet-4',
      description: identity?.description || `Agent: ${name}`,
      runs24h: Math.floor(Math.random() * 100),
      err24h: Math.floor(Math.random() * 5),
      costDay: Math.random() * 10,
      identity: identity ? {
        name: identity.name || name,
        creature: identity.creature,
        emoji: identity.emoji
      } : null
    });
  }
  
  return agents;
});

// Channels
server.get('/api/channels', async () => {
  const openclawDir = process.env.OPENCLAW_DIR || '/home/clawd/.openclaw';
  const config = readJsonFile(path.join(openclawDir, 'openclaw.json'));
  
  const channels = [];
  if (config?.channels) {
    for (const [name, data] of Object.entries(config.channels as Record<string, any>)) {
      channels.push({
        name,
        ...data,
        status: data.enabled ? 'running' : 'stopped'
      });
    }
  }
  
  return channels;
});

// Skills
server.get('/api/skills', async () => {
  const openclawDir = process.env.OPENCLAW_DIR || '/home/clawd/.openclaw';
  const skillsDir = path.join(openclawDir, 'skills');
  const skillNames = listDir(skillsDir);
  
  return skillNames.map(name => {
    const skillPath = path.join(skillsDir, name, 'SKILL.md');
    const exists = fs.existsSync(skillPath);
    
    return {
      id: name,
      name,
      enabled: exists,
      description: exists ? `Skill: ${name}` : '',
      version: '1.0.0'
    };
  });
});

// Sessions desde webhook store
server.get<{ Querystring: { refresh?: string } }>('/api/sessions', async (request, reply) => {
  const forceRefresh = request.query.refresh === 'true';
  
  // Si hay sesiones del webhook, devolverlas
  if (eventsStore.sessions.length > 0 && !forceRefresh) {
    return {
      sessions: eventsStore.sessions,
      total: eventsStore.sessions.length,
      source: 'webhook'
    };
  }
  
  // Si no, usar datos del polling
  const openclawDir = process.env.OPENCLAW_DIR || '/home/clawd/.openclaw';
  const agentsDir = path.join(openclawDir, 'agents');
  const agentNames = listDir(agentsDir);
  
  const sessions = [];
  for (const agent of agentNames) {
    const sessionsDir = path.join(agentsDir, agent, 'sessions');
    if (fs.existsSync(sessionsDir)) {
      const files = fs.readdirSync(sessionsDir)
        .filter(f => f.endsWith('.jsonl') && !f.includes('.deleted'))
        .sort()
        .reverse()
        .slice(0, 10);
      
      for (const file of files) {
        const filepath = path.join(sessionsDir, file);
        const stats = fs.statSync(filepath);
        sessions.push({
          id: file.replace('.jsonl', ''),
          agent,
          created_at: stats.mtime.toISOString(),
          size: stats.size,
          status: 'idle'
        });
      }
    }
  }
  
  return {
    sessions: sessions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 50),
    total: sessions.length,
    source: 'polling'
  };
});

// Runs desde webhook store
server.get('/api/runs', async () => {
  // Devolver runs del webhook store
  return {
    runs: eventsStore.runs,
    total: eventsStore.runs.length,
    source: 'webhook'
  };
});

// Logs desde webhook store (real-time)
server.get<{ Querystring: { level?: string; limit?: string } }>('/api/logs', async (request) => {
  const level = request.query.level as string;
  const limit = parseInt(request.query.limit as string) || 100;
  
  let logs = eventsStore.logs;
  
  // Filtrar por nivel si se especifica
  if (level && level !== 'ALL') {
    logs = logs.filter(l => l.level === level);
  }
  
  return {
    logs: logs.slice(0, limit),
    total: logs.length,
    source: 'webhook',
    last_update: eventsStore.lastUpdate
  };
});

// Token usage - Placeholder
server.get('/api/token-usage', async () => {
  return {
    total_tokens: 0,
    total_cost_usd: 0,
    by_agent: {},
    by_model: {},
    hourly_history: [],
    daily_history: [],
    note: 'Token tracking requires gateway integration'
  };
});

// =============================================================================
// Server Start
// =============================================================================

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8080', 10);
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`OpenClaw Dashboard API listening on port ${port}`);
    server.log.info(`Reading from: ${process.env.OPENCLAW_DIR || '/home/clawd/.openclaw'}`);
    server.log.info(`Webhook secret: ${CONFIG.webhookSecret.slice(0, 4)}...`);
    server.log.info(`Polling interval: ${CONFIG.pollingIntervalMs}ms`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
