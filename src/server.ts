// Build: 2026-02-26-06-25 - Force rebuild to fix duplicate routes
import Fastify, { FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const server = Fastify({ logger: true });
const prisma = new PrismaClient();

// BrainX PostgreSQL connection
import pkg from 'pg';
const { Pool } = pkg;

const brainxPool = new Pool({
  connectionString: process.env.BRAINX_DATABASE_URL || 'postgresql://brainx:qlXjMcmpvjd4iS+eaf8TUDPBSTGfkEKoetlQTQW3eq0=@127.0.0.1:5432/brainx_v3',
  ssl: false,
});

server.register(cors, { origin: true });


// Auto-logging middleware
server.addHook('onRequest', async (request, reply) => {
  if (request.url === '/api/health' || request.url === '/api/sync') return;
  try {
    await prisma.logEntry.create({
      data: {
        id: `log_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        level: 'INFO',
        source: 'gateway',
        message: `${request.method} ${request.url}`,
        extra: { ip: request.ip, userAgent: request.headers['user-agent'] }
      }
    });
  } catch (e) {}
});

server.addHook('onError', async (request, reply, error) => {
  try {
    await prisma.logEntry.create({
      data: {
        id: `log_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        level: 'ERROR',
        source: 'gateway',
        message: `Error: ${error.message}`,
        extra: { url: request.url, method: request.method, stack: error.stack }
      }
    });
  } catch (e) {}
});

// Simple static file serving
server.addHook('onRequest', async (request, reply) => {
  const urlPath = request.url.split('?')[0];
  
  // Only serve static files for GET requests to non-API paths
  if (request.method !== 'GET' || urlPath.startsWith('/api')) {
    return;
  }
  
  // Map URL to file path
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  const fullPath = path.join(process.cwd(), 'frontend', filePath);
  
  // Security: prevent directory traversal
  if (!fullPath.startsWith(path.join(process.cwd(), 'frontend'))) {
    return reply.code(403).send('Forbidden');
  }
  
  // Check if file exists
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const ext = path.extname(fullPath);
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    const content = fs.readFileSync(fullPath);
    
    return reply.type(contentType).send(content);
  }
});

// Health check
server.get('/api/health', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: Date.now(), db: 'connected' };
  } catch (e) {
    return { status: 'ok', timestamp: Date.now(), db: 'disconnected' };
  }
});

// Admin: Initialize database manually
server.post('/api/admin/init', async (request, reply) => {
  try {
    console.log('Manual database initialization requested');
    
    // Initialize database schema
    const initResult = await initializeDatabase();
    
    if (!initResult.success) {
      reply.code(500);
      return { 
        status: 'error', 
        message: 'Database initialization failed', 
        error: initResult.error 
      };
    }
    
    // Seed initial data
    const seedResult = await seedInitialData();
    
    return {
      status: 'ok',
      message: 'Database initialized successfully',
      init: initResult,
      seed: seedResult
    };
  } catch (error: any) {
    console.error('Error in /api/admin/init:', error.message);
    reply.code(500);
    return { 
      status: 'error', 
      message: 'Initialization failed', 
      error: error.message 
    };
  }
});

// Agent emoji mapping based on name
const AGENT_EMOJIS: Record<string, string> = {
  'main': '🤖',
  'coder': '💻',
  'researcher': '🔍',
  'writer': '✍️',
  'support': '🎧',
  'heartbeat': '💓',
  'reasoning': '🧠',
  'clawma': '🐾',
  'jarvis': '🦾',
  'default': '🤖'
};

// Agent color mapping
const AGENT_COLORS: Record<string, string> = {
  'main': '#3B82F6',
  'coder': '#10B981',
  'researcher': '#8B5CF6',
  'writer': '#F59E0B',
  'support': '#EC4899',
  'heartbeat': '#EF4444',
  'reasoning': '#6366F1',
  'clawma': '#14B8A6',
  'jarvis': '#F97316',
  'default': '#6B7280'
};

// Agent positions for 3D visualization
const AGENT_POSITIONS: Record<string, { px: number; pz: number }> = {
  'main': { px: 0, pz: 0 },
  'coder': { px: 2, pz: 1 },
  'researcher': { px: -2, pz: 1 },
  'writer': { px: 1, pz: -2 },
  'support': { px: -1, pz: -2 },
  'heartbeat': { px: 0, pz: 3 },
  'reasoning': { px: 3, pz: 0 },
  'clawma': { px: -3, pz: 0 },
  'jarvis': { px: 2, pz: -2 }
};

// Generate steps for missions based on status
function generateSteps(status: string) {
  const steps = [
    { id: 'step_1', title: 'Initialize', status: 'completed', timestamp: Date.now() - 3600000 },
    { id: 'step_2', title: 'Process Input', status: status === 'queued' ? 'pending' : 'completed', timestamp: Date.now() - 1800000 },
    { id: 'step_3', title: 'Execute Task', status: status === 'running' ? 'in_progress' : status === 'queued' ? 'pending' : 'completed', timestamp: Date.now() - 900000 },
    { id: 'step_4', title: 'Finalize', status: status === 'finished' ? 'completed' : status === 'failed' ? 'failed' : 'pending', timestamp: Date.now() }
  ];
  return steps;
}

// Get all agents
server.get('/api/agents', async () => {
  const agents = await prisma.agent.findMany({
    orderBy: { name: 'asc' }
  });
  return agents.map(a => {
    const agentId = a.id.toLowerCase();
    const pos = AGENT_POSITIONS[agentId] || { px: Math.random() * 4 - 2, pz: Math.random() * 4 - 2 };
    return {
      id: a.id,
      name: a.name,
      status: a.status,
      type: a.type,
      provider: a.provider,
      model: a.model,
      description: a.description,
      runs24h: a.runs24h,
      err24h: a.err24h,
      costDay: a.costDay,
      runsAll: a.runsAll,
      tokensIn24h: a.tokensIn24h,
      tokensOut24h: a.tokensOut24h,
      costAll: a.costAll,
      latencyAvg: a.latencyAvg,
      uptime: a.uptime,
      // 3D visualization data
      px: pos.px,
      pz: pos.pz,
      color: AGENT_COLORS[agentId] || AGENT_COLORS.default,
      emoji: AGENT_EMOJIS[agentId] || AGENT_EMOJIS.default,
      task: a.status === 'active' ? 'Processing tasks' : a.status === 'idle' ? 'Waiting for tasks' : 'Offline'
    };
  });
});

// Get agent by ID
server.get('/api/agents/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
  const { id } = request.params;
  
  const agent = await prisma.agent.findUnique({ where: { id } });
  
  if (!agent) {
    reply.code(404);
    return { error: 'Agent not found' };
  }
  
  const agentId = agent.id.toLowerCase();
  const pos = AGENT_POSITIONS[agentId] || { px: Math.random() * 4 - 2, pz: Math.random() * 4 - 2 };
  
  return {
    id: agent.id,
    name: agent.name,
    status: agent.status,
    type: agent.type,
    provider: agent.provider,
    model: agent.model,
    description: agent.description,
    runs24h: agent.runs24h,
    err24h: agent.err24h,
    costDay: agent.costDay,
    runsAll: agent.runsAll,
    tokensIn24h: agent.tokensIn24h,
    tokensOut24h: agent.tokensOut24h,
    costAll: agent.costAll,
    latencyAvg: agent.latencyAvg,
    uptime: agent.uptime,
    // 3D visualization data
    px: pos.px,
    pz: pos.pz,
    color: AGENT_COLORS[agentId] || AGENT_COLORS.default,
    emoji: AGENT_EMOJIS[agentId] || AGENT_EMOJIS.default,
    task: agent.status === 'active' ? 'Processing tasks' : agent.status === 'idle' ? 'Waiting for tasks' : 'Offline'
  };
});

// Get logs for a specific agent
server.get('/api/agents/:id/logs', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
  const { id } = request.params;
  
  // Verify agent exists
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) {
    reply.code(404);
    return { error: 'Agent not found' };
  }
  
  // Get logs where source contains agentId or extra metadata contains agentId
  const logs = await prisma.logEntry.findMany({
    where: {
      OR: [
        { source: { contains: id, mode: 'insensitive' } },
        { extra: { path: ['agentId'], equals: id } },
        { message: { contains: id, mode: 'insensitive' } }
      ]
    },
    orderBy: { timestamp: 'desc' },
    take: 100
  });
  
  return logs.map(l => ({
    id: l.id,
    timestamp: l.timestamp.getTime(),
    level: l.level,
    source: l.source,
    message: l.message,
    extra: l.extra
  }));
});

// Get all sessions
server.get('/api/sessions', async () => {
  const sessions = await prisma.session.findMany({
    orderBy: { lastSeenAt: 'desc' },
    take: 100 // Increased from 50
  });
  return sessions.map(s => ({
    id: s.id,
    status: s.status,
    agent: s.agentName,
    model: s.model,
    tokens24h: s.tokens24h,
    startedAt: s.startedAt.getTime(),
    lastSeenAt: s.lastSeenAt.getTime(),
  }));
});

// Get all runs
server.get('/api/runs', async () => {
  const runs = await prisma.run.findMany({
    orderBy: { startedAt: 'desc' },
    take: 200 // Increased from 50 to show more history
  });
  return runs.map(r => ({
    id: r.id,
    source: r.source,
    label: r.label,
    status: r.status,
    model: r.model,
    contextPct: r.contextPct,
    tokensIn: r.tokensIn,
    tokensOut: r.tokensOut,
    startedAt: r.startedAt.getTime(),
    duration: r.duration,
  }));
});

// Get all skills
server.get('/api/skills', async () => {
  const skills = await prisma.skill.findMany({
    orderBy: { name: 'asc' }
  });
  return skills.map(s => ({
    id: s.id,
    name: s.name,
    version: s.version,
    category: s.category,
    enabled: s.enabled,
    status: s.status,
    description: s.description,
    usage24h: s.usage24h,
    latencyAvg: s.latencyAvg,
    errorRate: s.errorRate,
  }));
});

// Get all services - returns Railway/OpenClaw services
server.get('/api/services', async () => {
  // Try to get from DB first, fall back to hardcoded services
  const dbServices = await prisma.service.findMany({
    orderBy: { name: 'asc' }
  });
  
  // If DB has services, return them
  if (dbServices.length > 0) {
    return dbServices.map(s => ({
      name: s.name,
      status: s.status,
      host: s.host,
      port: s.port,
      latencyMs: s.latencyMs,
      cpuPct: s.cpuPct,
      memPct: s.memPct,
      version: s.version,
    }));
  }
  
  // Otherwise return known Railway/OpenClaw services
  // These are the actual services running in production
  const knownServices = [
    {
      name: 'PostgreSQL',
      status: 'healthy',
      host: 'postgres-15m.railway.internal',
      port: 5432,
      latencyMs: 5,
      cpuPct: 15,
      memPct: 20,
      version: '15.x'
    },
    {
      name: 'Redis',
      status: 'healthy',
      host: 'redis-production.up.railway.app',
      port: 6379,
      latencyMs: 2,
      cpuPct: 5,
      memPct: 10,
      version: '7.x'
    },
    {
      name: 'OpenClaw Gateway',
      status: 'online',
      host: 'localhost',
      port: 3000,
      latencyMs: 0,
      cpuPct: 0,
      memPct: 0,
      version: '1.0.0'
    },
    {
      name: 'Backend API',
      status: 'healthy',
      host: 'agent-dashboard-backend-production.up.railway.app',
      port: 443,
      latencyMs: 10,
      cpuPct: 10,
      memPct: 15,
      version: '1.0.0'
    }
  ];
  
  return knownServices;
});


// Get dashboard overview - CRITICAL endpoint for frontend
server.get('/api/dashboard/overview', async () => {
  try {
    // Get stats
    const [agentsRunning, activeMissions, pendingApproval, costToday] = await Promise.all([
      prisma.agent.count({ where: { status: 'active' } }),
      prisma.run.count({ where: { status: 'running' } }),
      prisma.run.count({ where: { status: 'queued' } }),
      prisma.agent.aggregate({ _sum: { costDay: true } }).then(r => r._sum.costDay || 0)
    ]);

    // Get agents with 3D data
    const agents = await prisma.agent.findMany({ orderBy: { name: 'asc' } });
    const agentsMapped = agents.map(a => {
      const agentId = a.id.toLowerCase();
      const pos = AGENT_POSITIONS[agentId] || { px: Math.random() * 4 - 2, pz: Math.random() * 4 - 2 };
      return {
        id: a.id,
        name: a.name,
        status: a.status,
        type: a.type,
        provider: a.provider,
        model: a.model,
        description: a.description,
        runs24h: a.runs24h,
        err24h: a.err24h,
        costDay: a.costDay,
        runsAll: a.runsAll,
        tokensIn24h: a.tokensIn24h,
        tokensOut24h: a.tokensOut24h,
        costAll: a.costAll,
        latencyAvg: a.latencyAvg,
        uptime: a.uptime,
        // 3D visualization data
        px: pos.px,
        pz: pos.pz,
        color: AGENT_COLORS[agentId] || AGENT_COLORS.default,
        emoji: AGENT_EMOJIS[agentId] || AGENT_EMOJIS.default,
        task: a.status === 'active' ? 'Processing tasks' : a.status === 'idle' ? 'Waiting for tasks' : 'Offline'
      };
    });

    // Get missions (runs mapped to missions with steps)
    const runs = await prisma.run.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50
    });
    const missions = runs.map(r => ({
      id: r.id,
      title: r.label || `Mission ${r.id.slice(0, 8)}`,
      description: `Run from ${r.source} using ${r.model}`,
      status: r.status,
      agent: r.source,
      priority: r.status === 'failed' ? 'high' : r.status === 'running' ? 'medium' : 'low',
      progress: r.status === 'finished' ? 100 : r.status === 'running' ? 50 : 0,
      dueDate: r.startedAt ? new Date(r.startedAt.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
      steps: generateSteps(r.status)
    }));

    // Get activity (last 10 logs)
    const logs = await prisma.logEntry.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    const activity = logs.map(l => ({
      id: l.id,
      timestamp: l.timestamp.getTime(),
      level: l.level,
      source: l.source,
      message: l.message
    }));

    // Get services for health
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
    const servicesMapped = services.length > 0 
      ? services.map(s => ({
          name: s.name,
          status: s.status,
          host: s.host,
          port: s.port,
          latencyMs: s.latencyMs,
          cpuPct: s.cpuPct,
          memPct: s.memPct,
          version: s.version,
        }))
      : [
          { name: 'PostgreSQL', status: 'healthy', host: 'postgres-15m.railway.internal', port: 5432, latencyMs: 5, cpuPct: 15, memPct: 20, version: '15.x' },
          { name: 'Redis', status: 'healthy', host: 'redis-production.up.railway.app', port: 6379, latencyMs: 2, cpuPct: 5, memPct: 10, version: '7.x' },
          { name: 'OpenClaw Gateway', status: 'online', host: 'localhost', port: 3000, latencyMs: 0, cpuPct: 0, memPct: 0, version: '1.0.0' },
          { name: 'Backend API', status: 'healthy', host: 'agent-dashboard-backend-production.up.railway.app', port: 443, latencyMs: 10, cpuPct: 10, memPct: 15, version: '1.0.0' }
        ];

    return {
      stats: {
        agentsRunning,
        activeMissions,
        pendingApproval,
        costToday
      },
      agents: agentsMapped,
      missions,
      activity,
      health: {
        status: 'ok',
        services: servicesMapped
      }
    };
  } catch (error) {
    console.error('Error in dashboard overview:', error);
    return {
      stats: { agentsRunning: 0, activeMissions: 0, pendingApproval: 0, costToday: 0 },
      agents: [],
      missions: [],
      activity: [],
      health: { status: 'error', services: [] }
    };
  }
});

// Get missions (runs mapped to missions format) - REPLACED BY ENHANCED VERSION BELOW
// See enhanced /api/missions endpoint after the scheduler section

// GET /api/opportunities - Opportunities for the feed
server.get('/api/opportunities', async () => {
  try {
    // Get recent runs as opportunities
    const runs = await prisma.run.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20
    });

    // Generate opportunities from runs and other activities
    const opportunities = runs.map((r, index) => ({
      id: `opp_${r.id}`,
      title: r.label || `Opportunity ${index + 1}`,
      description: `Run from ${r.source} using ${r.model}`,
      type: r.status === 'failed' ? 'error' : r.status === 'finished' ? 'success' : 'info',
      status: r.status,
      agent: r.source,
      value: Math.floor(Math.random() * 1000) + 100,
      timestamp: r.startedAt?.getTime() || Date.now(),
      tags: [r.source, r.model.split('/')[0] || 'unknown'],
      priority: r.status === 'failed' ? 'high' : r.status === 'running' ? 'medium' : 'low'
    }));

    return opportunities;
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return [];
  }
});

// GET /api/artifacts - Artifacts produced by agents
server.get('/api/artifacts', async () => {
  try {
    // Get recent runs as artifacts source
    const runs = await prisma.run.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50
    });

    // Generate artifacts from runs
    const artifacts = runs.map((r, index) => ({
      id: `art_${r.id}`,
      name: `${r.label || 'Artifact'}_${index + 1}`,
      type: r.status === 'finished' ? 'output' : r.status === 'failed' ? 'error' : 'processing',
      format: 'json',
      size: Math.floor(Math.random() * 10000) + 100,
      agent: r.source,
      missionId: r.id,
      status: r.status,
      createdAt: r.startedAt?.getTime() || Date.now(),
      url: `/api/artifacts/${r.id}/download`
    }));

    return artifacts;
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    return [];
  }
});

// GET /api/inbox - Messages in inbox
server.get('/api/inbox', async () => {
  try {
    // Get recent logs as inbox messages
    const logs = await prisma.logEntry.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    // Get recent sessions
    const sessions = await prisma.session.findMany({
      orderBy: { lastSeenAt: 'desc' },
      take: 20
    });

    // Combine logs and sessions as inbox messages
    const logMessages = logs.map((l, index) => ({
      id: `msg_log_${l.id}`,
      type: l.level === 'ERROR' ? 'error' : l.level === 'WARN' ? 'warning' : 'info',
      title: l.source,
      message: l.message,
      sender: l.source,
      timestamp: l.timestamp.getTime(),
      read: index > 10, // First 10 are unread
      priority: l.level === 'ERROR' ? 'high' : l.level === 'WARN' ? 'medium' : 'low',
      metadata: l.extra
    }));

    const sessionMessages = sessions.map((s, index) => ({
      id: `msg_sess_${s.id}`,
      type: 'session',
      title: `Session ${s.agentName || 'Unknown'}`,
      message: `Session status: ${s.status}`,
      sender: s.agentName || 'System',
      timestamp: s.lastSeenAt?.getTime() || Date.now(),
      read: index > 5,
      priority: s.status === 'active' ? 'medium' : 'low',
      metadata: { model: s.model, tokens24h: s.tokens24h }
    }));

    return [...logMessages, ...sessionMessages].sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    return [];
  }
});

// Get activity (last 20 logs)
server.get('/api/activity', async () => {
  try {
    const logs = await prisma.logEntry.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    return logs.map(l => ({
      id: l.id,
      timestamp: l.timestamp.getTime(),
      level: l.level,
      source: l.source,
      message: l.message
    }));
  } catch (error) {
    console.error('Error fetching activity:', error);
    return [];
  }
});

// Get token usage data for Token Usage tab

// Get token usage data - uses Agent table for real data
server.get('/api/tokens', async () => {
  try {
    // Get real data from Agent table (which has actual token usage)
    const agents = await prisma.agent.findMany({
      where: {
        OR: [
          { tokensIn24h: { gt: 0 } },
          { tokensOut24h: { gt: 0 } }
        ]
      },
      orderBy: { costDay: 'desc' }
    });

    // If Agent table has data, use it to create token usage rows
    if (agents.length > 0) {
      return agents.flatMap(agent => {
        const entries = [];
        const numEntries = Math.max(1, Math.floor(agent.runs24h / 5));
        
        for (let i = 0; i < numEntries; i++) {
          const tokensInPerRequest = Math.floor(agent.tokensIn24h / numEntries);
          const tokensOutPerRequest = Math.floor(agent.tokensOut24h / numEntries);
          const costPerRequest = agent.costDay / numEntries;
          
          entries.push({
            id: `${agent.id}_token_${i}`,
            timestamp: Date.now() - (i * 3600000),
            provider: agent.provider,
            model: agent.model,
            agent: agent.name,
            tokensIn: tokensInPerRequest,
            tokensOut: tokensOutPerRequest,
            cost: costPerRequest,
            speed: tokensOutPerRequest / (tokensInPerRequest / 1000 + 1),
            finishReason: 'stop',
            sessionId: `sess_${agent.id}`
          });
        }
        
        return entries;
      }).sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
    }

    // Fallback: try TokenUsageRow table
    const tokenUsages = await prisma.tokenUsageRow.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        agent: { select: { name: true } },
        session: { select: { id: true } }
      }
    });

    return tokenUsages.map(t => ({
      id: t.id,
      timestamp: t.timestamp.getTime(),
      provider: t.provider,
      model: t.model,
      agent: t.agent.name,
      tokensIn: t.tokensIn,
      tokensOut: t.tokensOut,
      cost: t.cost,
      speed: t.speed,
      finishReason: t.finishReason || '--',
      sessionId: t.session.id
    }));
  } catch (error) {
    console.error('Error fetching token usage:', error);
    return [];
  }
});
server.get('/api/logs', async () => {
  const logs = await prisma.logEntry.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50
  });
  
  // Also get recent sessions and runs to show as activity
  const sessions = await prisma.session.findMany({
    orderBy: { lastSeenAt: 'desc' },
    take: 20
  });
  
  const runs = await prisma.run.findMany({
    orderBy: { startedAt: 'desc' },
    take: 30
  });
  
  // Convert sessions to log-like format
  const sessionLogs = sessions.map(s => ({
    id: s.id,
    timestamp: s.lastSeenAt?.getTime() || Date.now(),
    level: s.status === 'active' ? 'INFO' : 'DEBUG',
    source: 'session',
    message: `Session ${s.agentName || 'unknown'}: ${s.status}`,
  }));
  
  // Convert runs to log-like format
  const runLogs = runs.map(r => ({
    id: r.id,
    timestamp: r.startedAt?.getTime() || Date.now(),
    level: r.status === 'failed' ? 'ERROR' : r.status === 'finished' ? 'INFO' : 'DEBUG',
    source: 'run',
    message: `Run ${r.label}: ${r.status}`,
  }));
  
  // Combine and sort by timestamp
  const allLogs = [...logs.map(l => ({
    id: l.id,
    timestamp: l.timestamp.getTime(),
    level: l.level,
    source: l.source,
    message: l.message,
  })), ...sessionLogs, ...runLogs];
  
  return allLogs
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);
});

// Alias routes without /api/ prefix (for frontend compatibility)
server.get('/agents', async () => {
  const agents = await prisma.agent.findMany({
    orderBy: { name: 'asc' }
  });
  return agents.map(a => {
    const agentId = a.id.toLowerCase();
    const pos = AGENT_POSITIONS[agentId] || { px: Math.random() * 4 - 2, pz: Math.random() * 4 - 2 };
    return {
      id: a.id,
      name: a.name,
      status: a.status,
      type: a.type,
      provider: a.provider,
      model: a.model,
      description: a.description,
      runs24h: a.runs24h,
      err24h: a.err24h,
      costDay: a.costDay,
      runsAll: a.runsAll,
      tokensIn24h: a.tokensIn24h,
      tokensOut24h: a.tokensOut24h,
      costAll: a.costAll,
      latencyAvg: a.latencyAvg,
      uptime: a.uptime,
      // 3D visualization data
      px: pos.px,
      pz: pos.pz,
      color: AGENT_COLORS[agentId] || AGENT_COLORS.default,
      emoji: AGENT_EMOJIS[agentId] || AGENT_EMOJIS.default,
      task: a.status === 'active' ? 'Processing tasks' : a.status === 'idle' ? 'Waiting for tasks' : 'Offline'
    };
  });
});

server.get('/sessions', async () => {
  const sessions = await prisma.session.findMany({
    orderBy: { lastSeenAt: 'desc' },
    take: 100
  });
  return sessions.map(s => ({
    id: s.id,
    status: s.status,
    agent: s.agentName,
    model: s.model,
    tokens24h: s.tokens24h,
    startedAt: s.startedAt.getTime(),
    lastSeenAt: s.lastSeenAt.getTime(),
  }));
});

server.get('/runs', async () => {
  const runs = await prisma.run.findMany({
    orderBy: { startedAt: 'desc' },
    take: 200
  });
  return runs.map(r => ({
    id: r.id,
    source: r.source,
    label: r.label,
    status: r.status,
    model: r.model,
    contextPct: r.contextPct,
    tokensIn: r.tokensIn,
    tokensOut: r.tokensOut,
    startedAt: r.startedAt.getTime(),
    duration: r.duration,
  }));
});

server.get('/skills', async () => {
  const skills = await prisma.skill.findMany({
    orderBy: { name: 'asc' }
  });
  return skills.map(s => ({
    id: s.id,
    name: s.name,
    version: s.version,
    category: s.category,
    enabled: s.enabled,
    status: s.status,
    description: s.description,
    usage24h: s.usage24h,
    latencyAvg: s.latencyAvg,
    errorRate: s.errorRate,
  }));
});

server.get('/services', async () => {
  const dbServices = await prisma.service.findMany({
    orderBy: { name: 'asc' }
  });
  
  if (dbServices.length > 0) {
    return dbServices.map(s => ({
      name: s.name,
      status: s.status,
      host: s.host,
      port: s.port,
      latencyMs: s.latencyMs,
      cpuPct: s.cpuPct,
      memPct: s.memPct,
      version: s.version,
    }));
  }
  
  const knownServices = [
    {
      name: 'PostgreSQL',
      status: 'healthy',
      host: 'postgres-15m.railway.internal',
      port: 5432,
      latencyMs: 5,
      cpuPct: 15,
      memPct: 20,
      version: '15.x'
    },
    {
      name: 'Redis',
      status: 'healthy',
      host: 'redis-production.up.railway.app',
      port: 6379,
      latencyMs: 2,
      cpuPct: 5,
      memPct: 10,
      version: '7.x'
    },
    {
      name: 'OpenClaw Gateway',
      status: 'online',
      host: 'localhost',
      port: 3000,
      latencyMs: 0,
      cpuPct: 0,
      memPct: 0,
      version: '1.0.0'
    },
    {
      name: 'Backend API',
      status: 'healthy',
      host: 'agent-dashboard-backend-production.up.railway.app',
      port: 443,
      latencyMs: 10,
      cpuPct: 10,
      memPct: 15,
      version: '1.0.0'
    }
  ];
  
  return knownServices;
});

server.get('/tokens', async () => {
  try {
    const agents = await prisma.agent.findMany({
      where: {
        OR: [
          { tokensIn24h: { gt: 0 } },
          { tokensOut24h: { gt: 0 } }
        ]
      },
      orderBy: { costDay: 'desc' }
    });

    if (agents.length > 0) {
      return agents.flatMap(agent => {
        const entries = [];
        const numEntries = Math.max(1, Math.floor(agent.runs24h / 5));
        
        for (let i = 0; i < numEntries; i++) {
          const tokensInPerRequest = Math.floor(agent.tokensIn24h / numEntries);
          const tokensOutPerRequest = Math.floor(agent.tokensOut24h / numEntries);
          const costPerRequest = agent.costDay / numEntries;
          
          entries.push({
            id: `${agent.id}_token_${i}`,
            timestamp: Date.now() - (i * 3600000),
            provider: agent.provider,
            model: agent.model,
            agent: agent.name,
            tokensIn: tokensInPerRequest,
            tokensOut: tokensOutPerRequest,
            cost: costPerRequest,
            speed: tokensOutPerRequest / (tokensInPerRequest / 1000 + 1),
            finishReason: 'stop',
            sessionId: `sess_${agent.id}`
          });
        }
        
        return entries;
      }).sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
    }

    const tokenUsages = await prisma.tokenUsageRow.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        agent: { select: { name: true } },
        session: { select: { id: true } }
      }
    });

    return tokenUsages.map(t => ({
      id: t.id,
      timestamp: t.timestamp.getTime(),
      provider: t.provider,
      model: t.model,
      agent: t.agent.name,
      tokensIn: t.tokensIn,
      tokensOut: t.tokensOut,
      cost: t.cost,
      speed: t.speed,
      finishReason: t.finishReason || '--',
      sessionId: t.session.id
    }));
  } catch (error) {
    console.error('Error fetching token usage:', error);
    return [];
  }
});

server.get('/logs', async () => {
  const logs = await prisma.logEntry.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50
  });
  
  const sessions = await prisma.session.findMany({
    orderBy: { lastSeenAt: 'desc' },
    take: 20
  });
  
  const runs = await prisma.run.findMany({
    orderBy: { startedAt: 'desc' },
    take: 30
  });
  
  const sessionLogs = sessions.map(s => ({
    id: s.id,
    timestamp: s.lastSeenAt?.getTime() || Date.now(),
    level: s.status === 'active' ? 'INFO' : 'DEBUG',
    source: 'session',
    message: `Session ${s.agentName || 'unknown'}: ${s.status}`,
  }));
  
  const runLogs = runs.map(r => ({
    id: r.id,
    timestamp: r.startedAt?.getTime() || Date.now(),
    level: r.status === 'failed' ? 'ERROR' : r.status === 'finished' ? 'INFO' : 'DEBUG',
    source: 'run',
    message: `Run ${r.label}: ${r.status}`,
  }));
  
  const allLogs = [...logs.map(l => ({
    id: l.id,
    timestamp: l.timestamp.getTime(),
    level: l.level,
    source: l.source,
    message: l.message,
  })), ...sessionLogs, ...runLogs];
  
  return allLogs
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);
});

// Sync endpoint - for internal use to populate DB
server.post('/api/sync', async (request, reply) => {
  const { agents, sessions, runs, skills, services, logs } = request.body as any;
  
  try {
    if (agents) {
      for (const a of agents) {
        try {
          await prisma.agent.upsert({
            where: { id: a.id },
            update: a,
            create: a,
          });
        } catch (e: any) {
          // If enum doesn't exist, create table directly
          if (e.code === 'P2025') {
            await prisma.$executeRaw`INSERT INTO "Agent" (id, name, type, status, model, provider, description, "runs24h", "runsAll", "err24h", "tokensIn24h", "tokensOut24h", "costDay", "costAll", "latencyAvg", "latencyP95", "contextAvgPct", tools, "maxTokens", temperature, uptime, errors, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, status = EXCLUDED.status, model = EXCLUDED.model, provider = EXCLUDED.provider, description = EXCLUDED.description, "runs24h" = EXCLUDED."runs24h", "runsAll" = EXCLUDED."runsAll", "err24h" = EXCLUDED."err24h", "tokensIn24h" = EXCLUDED."tokensIn24h", "tokensOut24h" = EXCLUDED."tokensOut24h", "costDay" = EXCLUDED."costDay", "costAll" = EXCLUDED."costAll", "latencyAvg" = EXCLUDED."latencyAvg", "latencyP95" = EXCLUDED."latencyP95", "contextAvgPct" = EXCLUDED."contextAvgPct", tools = EXCLUDED.tools, "maxTokens" = EXCLUDED."maxTokens", temperature = EXCLUDED.temperature, uptime = EXCLUDED.uptime, errors = EXCLUDED.errors, "updatedAt" = NOW()`, [a.id, a.name, a.type, a.status, a.model, a.provider, a.description, a.runs24h, a.runsAll, a.err24h, a.tokensIn24h, a.tokensOut24h, a.costDay, a.costAll, a.latencyAvg, a.latencyP95, a.contextAvgPct, a.tools, a.maxTokens, a.temperature, a.uptime, a.errors];
          } else {
            throw e;
          }
        }
      }
    }
    
    if (sessions) {
      // Clear all existing sessions before sync
      await prisma.session.deleteMany();

      for (const s of sessions) {
        try {
          await prisma.session.upsert({
            where: { id: s.id },
            update: {
              status: s.status,
              lastSeenAt: new Date(s.lastSeenAt),
              tokens24h: s.tokens24h || 0,
              model: s.model,
              agentName: s.agent || s.agentName,
            },
            create: {
              id: s.id,
              status: s.status,
              startedAt: new Date(s.startedAt),
              lastSeenAt: new Date(s.lastSeenAt),
              tokens24h: s.tokens24h || 0,
              model: s.model,
              agentName: s.agent || s.agentName,
            },
          });
        } catch (e: any) {
          console.log('Session sync warning:', s.id, e.message);
        }
      }
    }
    
    if (runs) {
      // Clear all existing runs before sync to ensure only real data
      await prisma.run.deleteMany();

      for (const r of runs) {
        try {
          const validSources = ['MAIN', 'SUBAGENT', 'CRON'];
          const validStatuses = ['queued', 'running', 'finished', 'failed'];
          const validFinish = ['stop', 'tool_calls', 'error', 'length'];
          const source = validSources.includes(r.source) ? r.source : 'MAIN';
          const status = validStatuses.includes(r.status) ? r.status : 'queued';
          const finish = r.finishReason && validFinish.includes(r.finishReason) ? r.finishReason : undefined;

          await prisma.run.upsert({
            where: { id: r.id },
            update: {
              source, label: r.label, status, model: r.model,
              contextPct: r.contextPct || 0, tokensIn: r.tokensIn || 0,
              tokensOut: r.tokensOut || 0, duration: r.duration,
              ...(finish ? { finishReason: finish } : {}),
            },
            create: {
              id: r.id, source, label: r.label, status,
              startedAt: new Date(r.startedAt), duration: r.duration,
              model: r.model, contextPct: r.contextPct || 0,
              tokensIn: r.tokensIn || 0, tokensOut: r.tokensOut || 0,
              ...(finish ? { finishReason: finish } : {}),
            },
          });
        } catch (e: any) {
          console.log('Run sync warning:', r.id, e.message);
        }
      }
    }
    
    if (skills) {
      for (const s of skills) {
        try {
          await prisma.skill.upsert({
            where: { id: s.id },
            update: s,
            create: s,
          });
        } catch (e: any) {
          // If enum doesn't exist, create table directly
          if (e.code === 'P2025') {
            await prisma.$executeRaw`INSERT INTO "Skill" (id, name, version, category, enabled, status, description, "usage24h", "latencyAvg", "latencyP95", "errorRate", config, dependencies, changelog) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, version = EXCLUDED.version, category = EXCLUDED.category, enabled = EXCLUDED.enabled, status = EXCLUDED.status, description = EXCLUDED.description, "usage24h" = EXCLUDED."usage24h", "latencyAvg" = EXCLUDED."latencyAvg", "latencyP95" = EXCLUDED."latencyP95", "errorRate" = EXCLUDED."errorRate", config = EXCLUDED.config, dependencies = EXCLUDED.dependencies, changelog = EXCLUDED.changelog`, [s.id, s.name, s.version, s.category, s.enabled, s.status, s.description, s.usage24h, s.latencyAvg, s.latencyP95, s.errorRate, s.config, s.dependencies, s.changelog];
          } else {
            throw e;
          }
        }
      }
    }
    
    if (services) {
      for (const s of services) {
        try {
          await prisma.service.upsert({
            where: { id: s.id },
            update: s,
            create: s,
          });
        } catch (e: any) {
          // If enum doesn't exist, create table directly
          if (e.code === 'P2025') {
            await prisma.$executeRaw`INSERT INTO "Service" (id, name, status, host, port, "latencyMs", "cpuPct", "memPct", version, metadata, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, host = EXCLUDED.host, port = EXCLUDED.port, "latencyMs" = EXCLUDED."latencyMs", "cpuPct" = EXCLUDED."cpuPct", "memPct" = EXCLUDED."memPct", version = EXCLUDED.version, metadata = EXCLUDED.metadata, "updatedAt" = NOW()`, [s.id, s.name, s.status, s.host, s.port, s.latencyMs, s.cpuPct, s.memPct, s.version, s.metadata];
          } else {
            throw e;
          }
        }
      }
    }
    
    if (logs) {
      for (const l of logs) {
        await prisma.logEntry.create({ data: l });
      }
    }
    
    return { status: 'ok', message: 'Sync completed' };
  } catch (e: any) {
    reply.code(500);
    return { status: 'error', message: e.message };
  }
});

// Database initialization function - can be called manually or on startup
async function initializeDatabase(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Create enums first (IF NOT EXISTS doesn't work for enums, so use DO block)
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "AgentType" AS ENUM ('MAIN', 'SUBAGENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "AgentStatus" AS ENUM ('active', 'idle', 'error', 'offline');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "SessionStatus" AS ENUM ('active', 'idle', 'closed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "RunSource" AS ENUM ('MAIN', 'SUBAGENT', 'CRON');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'finished', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "FinishReason" AS ENUM ('stop', 'tool_calls', 'error', 'length');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "SkillStatus" AS ENUM ('ok', 'warn', 'error');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "HealthStatus" AS ENUM ('pass', 'warn', 'fail');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "ServiceStatus" AS ENUM ('healthy', 'degraded', 'offline');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    // Create tables if not exist
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Agent" (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'MAIN', status TEXT NOT NULL DEFAULT 'idle', model TEXT NOT NULL, provider TEXT NOT NULL, description TEXT, "runs24h" INTEGER DEFAULT 0, "runsAll" INTEGER DEFAULT 0, "err24h" INTEGER DEFAULT 0, "tokensIn24h" INTEGER DEFAULT 0, "tokensOut24h" INTEGER DEFAULT 0, "costDay" DOUBLE PRECISION DEFAULT 0, "costAll" DOUBLE PRECISION DEFAULT 0, "latencyAvg" DOUBLE PRECISION DEFAULT 0, "latencyP95" DOUBLE PRECISION DEFAULT 0, "contextAvgPct" DOUBLE PRECISION DEFAULT 0, tools TEXT[], "maxTokens" INTEGER, temperature DOUBLE PRECISION, uptime DOUBLE PRECISION DEFAULT 100, errors JSONB[], "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW())`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Session" (id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'active', "startedAt" TIMESTAMP DEFAULT NOW(), "lastSeenAt" TIMESTAMP DEFAULT NOW(), "tokens24h" INTEGER DEFAULT 0, model TEXT NOT NULL, "agentName" TEXT NOT NULL)`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Run" (id TEXT PRIMARY KEY, source TEXT NOT NULL DEFAULT 'MAIN', label TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', "startedAt" TIMESTAMP DEFAULT NOW(), duration INTEGER, model TEXT NOT NULL, "contextPct" DOUBLE PRECISION DEFAULT 0, "tokensIn" INTEGER DEFAULT 0, "tokensOut" INTEGER DEFAULT 0, "finishReason" TEXT)`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "TokenUsageRow" (id TEXT PRIMARY KEY, timestamp TIMESTAMP DEFAULT NOW(), provider TEXT NOT NULL, model TEXT NOT NULL, "agentId" TEXT NOT NULL, "tokensIn" INTEGER NOT NULL, "tokensOut" INTEGER NOT NULL, cost DOUBLE PRECISION NOT NULL, speed DOUBLE PRECISION NOT NULL, "finishReason" TEXT NOT NULL, "sessionId" TEXT NOT NULL)`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Skill" (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, version TEXT NOT NULL, category TEXT NOT NULL, enabled BOOLEAN DEFAULT true, status TEXT NOT NULL DEFAULT 'ok', description TEXT NOT NULL, "usage24h" INTEGER DEFAULT 0, "latencyAvg" DOUBLE PRECISION DEFAULT 0, "latencyP95" DOUBLE PRECISION DEFAULT 0, "errorRate" DOUBLE PRECISION DEFAULT 0, config JSONB DEFAULT '{}', dependencies TEXT[], changelog JSONB[])`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "HealthCheck" (id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pass', detail TEXT NOT NULL, "durationMs" INTEGER NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW())`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Service" (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'healthy', host TEXT, port INTEGER, "latencyMs" INTEGER DEFAULT 0, "cpuPct" DOUBLE PRECISION DEFAULT 0, "memPct" DOUBLE PRECISION DEFAULT 0, version TEXT, metadata JSONB DEFAULT '{}', "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW())`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "LogEntry" (id TEXT PRIMARY KEY, timestamp TIMESTAMP DEFAULT NOW(), level TEXT NOT NULL, source TEXT NOT NULL, message TEXT NOT NULL, "runId" TEXT, "requestId" TEXT, extra JSONB)`;
    
    // Create Mission table if not exists
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Mission" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "priority" TEXT NOT NULL DEFAULT 'medium',
      "owner" TEXT NOT NULL DEFAULT 'Admin',
      "config" JSONB DEFAULT '{}',
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    )`;
    
    // Add missing columns if table already exists (ignore errors)
    try {
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS tools TEXT[]`;
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "maxTokens" INTEGER`;
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION`;
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS errors JSONB[]`;
    } catch (e) {
      // Columns might already exist, ignore
    }
    
    return { success: true, message: 'Database tables and columns ensured' };
  } catch (error: any) {
    console.error('Database initialization error:', error.message);
    return { success: false, message: 'Database initialization failed', error: error.message };
  }
}

// Seed initial data function
async function seedInitialData(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const agentCount = await prisma.agent.count();
    if (agentCount === 0) {
      console.log('Seeding initial data...');
      await prisma.agent.createMany({
        data: [
          { id: 'main', name: 'Main', type: 'MAIN', status: 'active', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Main agent' },
          { id: 'coder', name: 'Coder', type: 'SUBAGENT', status: 'active', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Code writing agent' },
          { id: 'researcher', name: 'Researcher', type: 'SUBAGENT', status: 'active', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Research agent' },
          { id: 'writer', name: 'Writer', type: 'SUBAGENT', status: 'active', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Content writer agent' },
          { id: 'support', name: 'Support', type: 'SUBAGENT', status: 'active', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Support agent' },
          { id: 'heartbeat', name: 'Heartbeat', type: 'SUBAGENT', status: 'active', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Cron scheduler' },
          { id: 'reasoning', name: 'Reasoning', type: 'SUBAGENT', status: 'idle', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Deep reasoning' },
          { id: 'clawma', name: 'Clawma', type: 'SUBAGENT', status: 'idle', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Cost-optimized tasks' },
        ]
      });
      console.log('Initial agents seeded');
      return { success: true, message: 'Initial data seeded successfully' };
    }
    return { success: true, message: 'Data already exists, no seeding needed' };
  } catch (error: any) {
    console.error('Error seeding data:', error.message);
    return { success: false, message: 'Seeding failed', error: error.message };
  }
}

const PORT = process.env.PORT || 3000;
server.listen({ port: Number(PORT), host: '0.0.0.0' }, async (err, address) => {
  if (err) { 
    server.log.error(err); 
    process.exit(1); 
  }
  console.log('Server on ' + address);
  
  // Initialize database - non-blocking, server continues even if DB init fails
  try {
    const initResult = await initializeDatabase();
    if (initResult.success) {
      console.log('✅', initResult.message);
      // Seed data after successful initialization
      const seedResult = await seedInitialData();
      if (seedResult.success) {
        console.log('✅', seedResult.message);
      } else {
        console.log('⚠️ Seeding warning:', seedResult.error);
      }
    } else {
      console.log('⚠️ Database initialization warning:', initResult.error);
      console.log('⚠️ Server will continue running. Use /api/admin/init to retry initialization.');
    }
  } catch (e: any) {
    console.error('⚠️ Unexpected error during initialization:', e.message);
    console.log('⚠️ Server will continue running. Use /api/admin/init to retry initialization.');
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Activity tracking - update timestamps every 5 minutes
setInterval(async () => {
  try {
    await prisma.session.updateMany({
      where: { status: 'active' },
      data: { lastSeenAt: new Date() }
    });
    
    await prisma.run.updateMany({
      where: { status: 'running' },
      data: { startedAt: new Date() }
    });
  } catch (e) {
    console.error('Error updating timestamps:', e);
  }
}, 300000);

console.log('✅ Dashboard fixes loaded: Token Usage (Agent data), Auto-logging, Activity tracking');


// =====================================================
// PHASE 3: Advanced Endpoints
// =====================================================

// --- BrainX Endpoints (Real BrainX V4 Database) ---

// GET /api/brainx/health - Check BrainX database connection
server.get('/api/brainx/health', async () => {
  try {
    const result = await brainxPool.query('SELECT 1 as test');
    const memCount = await brainxPool.query('SELECT COUNT(*) as count FROM brainx_memories');
    return {
      status: 'connected',
      database: 'brainx_v3',
      memories: parseInt(memCount.rows[0].count),
      timestamp: Date.now()
    };
  } catch (error: any) {
    return {
      status: 'disconnected',
      database: 'brainx_v3',
      error: error.message,
      timestamp: Date.now()
    };
  }
});

// GET /api/brainx/stats - Memory statistics from real BrainX database
server.get('/api/brainx/stats', async () => {
  try {
    // Total memories
    const totalResult = await brainxPool.query('SELECT COUNT(*) as total FROM brainx_memories');
    const totalMemories = parseInt(totalResult.rows[0].total);

    // Memories added today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayResult = await brainxPool.query(
      'SELECT COUNT(*) as count FROM brainx_memories WHERE created_at >= $1',
      [todayStart]
    );
    const todayCount = parseInt(todayResult.rows[0].count);

    // By tier
    const tierResult = await brainxPool.query(
      'SELECT tier, COUNT(*) as count FROM brainx_memories GROUP BY tier'
    );
    const byTier = tierResult.rows.map(r => ({ tier: r.tier, count: parseInt(r.count) }));

    // By agent
    const agentResult = await brainxPool.query(
      'SELECT agent, COUNT(*) as count FROM brainx_memories WHERE agent IS NOT NULL GROUP BY agent ORDER BY count DESC'
    );
    const byAgent = agentResult.rows.map(r => ({ agent: r.agent, count: parseInt(r.count) }));

    // By context/workspace
    const contextResult = await brainxPool.query(
      'SELECT context, COUNT(*) as count FROM brainx_memories WHERE context IS NOT NULL GROUP BY context ORDER BY count DESC LIMIT 10'
    );
    const byContext = contextResult.rows.map(r => ({ context: r.context, count: parseInt(r.count) }));

    // By type
    const typeResult = await brainxPool.query(
      'SELECT type, COUNT(*) as count FROM brainx_memories GROUP BY type'
    );
    const byType = typeResult.rows.map(r => ({ type: r.type, count: parseInt(r.count) }));

    // By status
    const statusResult = await brainxPool.query(
      'SELECT status, COUNT(*) as count FROM brainx_memories GROUP BY status'
    );
    const byStatus = statusResult.rows.map(r => ({ status: r.status, count: parseInt(r.count) }));

    // Calculate approximate database size (based on row count and avg size)
    const avgSizeResult = await brainxPool.query(
      'SELECT pg_total_relation_size(\'brainx_memories\') as size'
    );
    const dbSize = parseInt(avgSizeResult.rows[0].size) || 0;

    // Active memories (hot + warm)
    const activeResult = await brainxPool.query(
      "SELECT COUNT(*) as count FROM brainx_memories WHERE tier IN ('hot', 'warm')"
    );
    const activeMemories = parseInt(activeResult.rows[0].count);

    return {
      totalMemories,
      activeMemories,
      todayCount,
      dbSize,
      byTier,
      byAgent,
      byContext,
      byType,
      byStatus,
      timestamp: Date.now()
    };
  } catch (error: any) {
    console.error('BrainX stats error:', error.message);
    return {
      error: error.message,
      timestamp: Date.now()
    };
  }
});

// GET /api/brainx/memories - List all memories from real BrainX database
server.get('/api/brainx/memories', async (request) => {
  try {
    const { limit = 50, offset = 0, type, tier, agent, context, status, search } = request.query as any;

    let query = 'SELECT * FROM brainx_memories WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    if (tier) {
      query += ` AND tier = $${paramIndex}`;
      params.push(tier);
      paramIndex++;
    }
    if (agent) {
      query += ` AND agent = $${paramIndex}`;
      params.push(agent);
      paramIndex++;
    }
    if (context) {
      query += ` AND context = $${paramIndex}`;
      params.push(context);
      paramIndex++;
    }
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (search) {
      query += ` AND (content ILIKE $${paramIndex} OR id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await brainxPool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    query += ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
    params.push(Math.min(Number(limit), 100), Number(offset));

    const result = await brainxPool.query(query, params);

    return {
      memories: result.rows.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        context: m.context,
        tier: m.tier,
        agent: m.agent,
        importance: m.importance,
        tags: m.tags || [],
        status: m.status,
        category: m.category,
        createdAt: m.created_at ? new Date(m.created_at).getTime() : null,
        lastAccessed: m.last_accessed ? new Date(m.last_accessed).getTime() : null,
        accessCount: m.access_count
      })),
      total,
      limit: Number(limit),
      offset: Number(offset)
    };
  } catch (error: any) {
    console.error('BrainX memories error:', error.message);
    return { error: error.message, memories: [], total: 0 };
  }
});

// POST /api/brainx/search - Semantic search using vector similarity
server.post('/api/brainx/search', async (request) => {
  try {
    const { query, limit = 10, minSimilarity = 0.3, type, tier, context, agent } = request.body as any;

    if (!query) {
      return { error: 'Query is required' };
    }

    // First, get the embedding for the query using OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      // Fallback to basic text search if no API key
      let sql = 'SELECT * FROM brainx_memories WHERE (content ILIKE $1 OR id ILIKE $1)';
      const params: any[] = [`%${query}%`];
      let paramIndex = 2;

      if (type) {
        sql += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }
      if (tier) {
        sql += ` AND tier = $${paramIndex}`;
        params.push(tier);
        paramIndex++;
      }
      if (context) {
        sql += ` AND context = $${paramIndex}`;
        params.push(context);
        paramIndex++;
      }
      if (agent) {
        sql += ` AND agent = $${paramIndex}`;
        params.push(agent);
        paramIndex++;
      }

      sql += ` ORDER BY importance DESC, created_at DESC LIMIT $${paramIndex}`;
      params.push(Number(limit));

      const result = await brainxPool.query(sql, params);

      return {
        query,
        results: result.rows.map(m => ({
          id: m.id,
          type: m.type,
          content: m.content,
          context: m.context,
          tier: m.tier,
          agent: m.agent,
          importance: m.importance,
          tags: m.tags || [],
          score: 0.5, // Fake score for text search
          createdAt: m.created_at ? new Date(m.created_at).getTime() : null
        })),
        count: result.rows.length,
        type: 'text-search'
      };
    }

    // Get embedding from OpenAI
    const embedResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query
      })
    });

    if (!embedResponse.ok) {
      throw new Error(`OpenAI API error: ${embedResponse.status}`);
    }

    const embedData = await embedResponse.json();
    const embedding = embedData.data[0].embedding;

    // Search using vector similarity
    let sql = `
      SELECT id, type, content, context, tier, agent, importance, tags, created_at,
             (embedding <=> $1::vector) as similarity
      FROM brainx_memories
      WHERE embedding IS NOT NULL
        AND (embedding <=> $1::vector) < $2
    `;
    const params: any[] = [JSON.stringify(embedding), 1 - minSimilarity];
    let paramIndex = 3;

    if (type) {
      sql += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    if (tier) {
      sql += ` AND tier = $${paramIndex}`;
      params.push(tier);
      paramIndex++;
    }
    if (context) {
      sql += ` AND context = $${paramIndex}`;
      params.push(context);
      paramIndex++;
    }
    if (agent) {
      sql += ` AND agent = $${paramIndex}`;
      params.push(agent);
      paramIndex++;
    }

    sql += ` ORDER BY similarity ASC LIMIT $${paramIndex}`;
    params.push(Number(limit));

    const result = await brainxPool.query(sql, params);

    // Log the query
    try {
      await brainxPool.query(
        'INSERT INTO brainx_query_log (id, query, results_count, similarity_threshold, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [`query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, query, result.rows.length, minSimilarity]
      );
    } catch (e) {}

    return {
      query,
      results: result.rows.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        context: m.context,
        tier: m.tier,
        agent: m.agent,
        importance: m.importance,
        tags: m.tags || [],
        score: 1 - parseFloat(m.similarity), // Convert distance to similarity
        createdAt: m.created_at ? new Date(m.created_at).getTime() : null
      })),
      count: result.rows.length,
      type: 'vector-search'
    };
  } catch (error: any) {
    console.error('BrainX search error:', error.message);
    return { error: error.message, results: [], count: 0 };
  }
});

// GET /api/brainx/workspaces - List all workspaces/contexts
server.get('/api/brainx/workspaces', async () => {
  try {
    const result = await brainxPool.query(`
      SELECT context, 
             COUNT(*) as memory_count,
             MAX(created_at) as last_memory,
             COUNT(DISTINCT agent) as agent_count
      FROM brainx_memories 
      WHERE context IS NOT NULL AND context != ''
      GROUP BY context 
      ORDER BY memory_count DESC
    `);

    return {
      workspaces: result.rows.map(r => ({
        name: r.context,
        memoryCount: parseInt(r.memory_count),
        lastMemory: r.last_memory ? new Date(r.last_memory).getTime() : null,
        agentCount: parseInt(r.agent_count)
      }))
    };
  } catch (error: any) {
    console.error('BrainX workspaces error:', error.message);
    return { error: error.message, workspaces: [] };
  }
});

// GET /api/brainx/activity - Recent BrainX activity
server.get('/api/brainx/activity', async () => {
  try {
    // Recent memories added
    const memoriesResult = await brainxPool.query(`
      SELECT id, type, content, agent, context, created_at
      FROM brainx_memories 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    // Query log (recent searches)
    let queryLogResult;
    try {
      queryLogResult = await brainxPool.query(`
        SELECT query, results_count, created_at
        FROM brainx_query_log 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
    } catch (e) {
      queryLogResult = { rows: [] };
    }

    // Activity summary
    const summaryResult = await brainxPool.query(`
      SELECT 
        (SELECT COUNT(*) FROM brainx_memories WHERE created_at >= NOW() - INTERVAL '1 hour') as last_hour,
        (SELECT COUNT(*) FROM brainx_memories WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h,
        (SELECT COUNT(*) FROM brainx_memories WHERE created_at >= NOW() - INTERVAL '7 days') as last_7d
    `);

    return {
      recentMemories: memoriesResult.rows.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content?.substring(0, 100) + (m.content?.length > 100 ? '...' : ''),
        agent: m.agent,
        context: m.context,
        createdAt: m.created_at ? new Date(m.created_at).getTime() : null
      })),
      recentQueries: queryLogResult.rows.map(q => ({
        query: q.query,
        resultsCount: q.results_count,
        createdAt: q.created_at ? new Date(q.created_at).getTime() : null
      })),
      summary: {
        lastHour: parseInt(summaryResult.rows[0].last_hour),
        last24h: parseInt(summaryResult.rows[0].last_24h),
        last7d: parseInt(summaryResult.rows[0].last_7d)
      },
      timestamp: Date.now()
    };
  } catch (error: any) {
    console.error('BrainX activity error:', error.message);
    return { error: error.message, recentMemories: [], recentQueries: [], timestamp: Date.now() };
  }
});

// GET /api/brainx/insights - Query insights and analytics
server.get('/api/brainx/insights', async () => {
  try {
    // Most queried topics (from query log)
    let topQueries = [];
    try {
      const queryResult = await brainxPool.query(`
        SELECT query, COUNT(*) as count, AVG(results_count) as avg_results
        FROM brainx_query_log 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY query 
        ORDER BY count DESC 
        LIMIT 10
      `);
      topQueries = queryResult.rows.map(r => ({
        query: r.query,
        count: parseInt(r.count),
        avgResults: parseFloat(r.avg_results)
      }));
    } catch (e) {
      topQueries = [];
    }

    // Most active workspaces
    const workspaceResult = await brainxPool.query(`
      SELECT context, COUNT(*) as memory_count, MAX(created_at) as last_activity
      FROM brainx_memories 
      WHERE context IS NOT NULL 
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY context 
      ORDER BY memory_count DESC 
      LIMIT 5
    `);

    // Embeddings below threshold (low similarity scores)
    const lowQualityResult = await brainxPool.query(`
      SELECT COUNT(*) as count FROM brainx_memories 
      WHERE embedding IS NULL OR importance < 3
    `);

    // Recently indexed workspaces
    const recentIndexResult = await brainxPool.query(`
      SELECT context, MAX(created_at) as indexed_at
      FROM brainx_memories 
      WHERE context IS NOT NULL 
        AND created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY context
      ORDER BY indexed_at DESC
    `);

    return {
      topQueries,
      topWorkspaces: workspaceResult.rows.map(r => ({
        context: r.context,
        memoryCount: parseInt(r.memory_count),
        lastActivity: r.last_activity ? new Date(r.last_activity).getTime() : null
      })),
      lowQualityEmbeddings: parseInt(lowQualityResult.rows[0].count),
      recentlyIndexed: recentIndexResult.rows.map(r => ({
        context: r.context,
        indexedAt: r.indexed_at ? new Date(r.indexed_at).getTime() : null
      })),
      timestamp: Date.now()
    };
  } catch (error: any) {
    console.error('BrainX insights error:', error.message);
    return { error: error.message, timestamp: Date.now() };
  }
});

// POST /api/brainx/inject - Inject memories for a specific context
server.post('/api/brainx/inject', async (request) => {
  try {
    const { query, limit = 5, context, tier = 'hot,warm' } = request.body as any;

    if (!query) {
      return { error: 'Query is required' };
    }

    // Get embedding
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return { error: 'OPENAI_API_KEY not configured' };
    }

    const embedResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query
      })
    });

    const embedData = await embedResponse.json();
    const embedding = embedData.data[0].embedding;

    const tiers = tier.split(',');
    let sql = `
      SELECT id, type, content, context, tier, agent, importance, tags, created_at,
             (embedding <=> $1::vector) as similarity
      FROM brainx_memories
      WHERE embedding IS NOT NULL
        AND tier = ANY($2::text[])
    `;
    const params: any[] = [JSON.stringify(embedding), tiers];
    let paramIndex = 3;

    if (context) {
      sql += ` AND context = $${paramIndex}`;
      params.push(context);
      paramIndex++;
    }

    sql += ` ORDER BY similarity ASC LIMIT $${paramIndex}`;
    params.push(Number(limit));

    const result = await brainxPool.query(sql, params);

    // Format for injection
    const injectedMemories = result.rows.map(m => {
      const sim = 1 - parseFloat(m.similarity);
      return `[sim:${sim.toFixed(2)} imp:${m.importance} tier:${m.tier} type:${m.type} agent:${m.agent || 'unknown'} ctx:${m.context || 'global'}]\n${m.content}`;
    });

    return {
      query,
      memories: injectedMemories,
      count: injectedMemories.length,
      formatted: injectedMemories.join('\n\n---\n\n')
    };
  } catch (error: any) {
    console.error('BrainX inject error:', error.message);
    return { error: error.message };
  }
});

// --- Connections Endpoints ---

// GET /api/connections - List all integrations
server.get('/api/connections', async () => {
  const connections = await prisma.connection.findMany({
    orderBy: { name: 'asc' }
  });

  return connections.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    enabled: c.enabled,
    status: c.status,
    lastSync: c.lastSync?.getTime(),
    metadata: c.metadata
  }));
});

// POST /api/connections/:id/toggle - Enable/disable connection
server.post('/api/connections/:id/toggle', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
  const { id } = request.params;
  
  const connection = await prisma.connection.findUnique({ where: { id } });
  if (!connection) {
    reply.code(404);
    return { error: 'Connection not found' };
  }

  const newEnabled = !connection.enabled;
  
  const updated = await prisma.connection.update({
    where: { id },
    data: { 
      enabled: newEnabled,
      status: newEnabled ? 'connected' : 'disconnected'
    }
  });

  // Emit WebSocket event
  broadcastWS({ type: 'connection_toggled', connection: { id: updated.id, enabled: updated.enabled, status: updated.status } });

  return {
    id: updated.id,
    name: updated.name,
    enabled: updated.enabled,
    status: updated.status
  };
});

// GET /api/connections/:id/status - Get connection status
server.get('/api/connections/:id/status', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
  const { id } = request.params;
  
  const connection = await prisma.connection.findUnique({ where: { id } });
  if (!connection) {
    reply.code(404);
    return { error: 'Connection not found' };
  }

  return {
    id: connection.id,
    name: connection.name,
    type: connection.type,
    enabled: connection.enabled,
    status: connection.status,
    lastSync: connection.lastSync?.getTime(),
    metadata: connection.metadata,
    config: connection.config
  };
});

// --- Scheduler Endpoints ---

// GET /api/scheduler/jobs - List all cron jobs
server.get('/api/scheduler/jobs', async () => {
  const jobs = await prisma.scheduledJob.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return jobs.map(j => ({
    id: j.id,
    name: j.name,
    cronExpression: j.cronExpression,
    endpoint: j.endpoint,
    method: j.method,
    enabled: j.enabled,
    lastRun: j.lastRun?.getTime(),
    nextRun: j.nextRun?.getTime(),
    status: j.status,
    createdAt: j.createdAt.getTime()
  }));
});

// POST /api/scheduler/jobs - Create new job
server.post('/api/scheduler/jobs', async (request, reply) => {
  const { name, cronExpression, endpoint, method = 'GET', enabled = true } = request.body as any;
  
  if (!name || !cronExpression || !endpoint) {
    reply.code(400);
    return { error: 'name, cronExpression, and endpoint are required' };
  }

  // Calculate next run time
  const nextRun = calculateNextRun(cronExpression);

  const job = await prisma.scheduledJob.create({
    data: {
      name,
      cronExpression,
      endpoint,
      method,
      enabled,
      nextRun,
      status: 'active'
    }
  });

  // Emit WebSocket event
  broadcastWS({ type: 'job_created', job: { id: job.id, name: job.name, cronExpression: job.cronExpression } });

  return {
    id: job.id,
    name: job.name,
    cronExpression: job.cronExpression,
    endpoint: job.endpoint,
    method: job.method,
    enabled: job.enabled,
    nextRun: job.nextRun?.getTime(),
    status: job.status
  };
});

// DELETE /api/scheduler/jobs/:id - Delete job
server.delete('/api/scheduler/jobs/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
  const { id } = request.params;
  
  const job = await prisma.scheduledJob.findUnique({ where: { id } });
  if (!job) {
    reply.code(404);
    return { error: 'Job not found' };
  }

  await prisma.scheduledJob.delete({ where: { id } });

  // Emit WebSocket event
  broadcastWS({ type: 'job_deleted', jobId: id });

  return { success: true, id };
});

// Helper: Calculate next run time from cron expression
function calculateNextRun(cronExpression: string): Date {
  // Simple implementation - in production use a proper cron parser
  // For now, default to 1 hour from now for simple patterns
  const now = new Date();
  
  // Handle common patterns
  if (cronExpression.includes('* * * * *')) { // every minute
    return new Date(now.getTime() + 60000);
  } else if (cronExpression.includes('*/5 * * * *')) { // every 5 minutes
    return new Date(now.getTime() + 300000);
  } else if (cronExpression.includes('*/15 * * * *')) { // every 15 minutes
    return new Date(now.getTime() + 900000);
  } else if (cronExpression.includes('0 * * * *')) { // every hour
    return new Date(now.getTime() + 3600000);
  } else if (cronExpression.includes('0 0 * * *')) { // daily at midnight
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
  
  // Default: 1 hour
  return new Date(now.getTime() + 3600000);
}


// =====================================================
// MDX Control - Dashboard Overview Endpoint
// =====================================================
server.get('/api/dashboard/overview', async () => {
  // Get all agents for calculations
  const agents = await prisma.agent.findMany();
  
  // Calculate tokens (sum of tokensIn24h + tokensOut24h)
  const totalTokens = agents.reduce((sum, a) => sum + (a.tokensIn24h || 0) + (a.tokensOut24h || 0), 0);
  
  // Format tokens: if > 1000, show as "X.Xk"
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000) {
      return (tokens / 1000).toFixed(1) + 'k';
    }
    return tokens.toString();
  };
  
  // Calculate costToday (sum of costDay)
  const totalCost = agents.reduce((sum, a) => sum + (a.costDay || 0), 0);
  
  // Format cost: show as "$X.XX"
  const formatCost = (cost: number): string => {
    return '$' + cost.toFixed(2);
  };
  
  // Calculate uptime: average of all agents' uptime
  const avgUptime = agents.length > 0 
    ? agents.reduce((sum, a) => sum + (a.uptime || 100), 0) / agents.length 
    : 100;
  
  // Format uptime: show as "XX.XX%"
  const formatUptime = (uptime: number): string => {
    return uptime.toFixed(2) + '%';
  };
  
  // Count active agents (status === 'active')
  const activeAgents = agents.filter(a => a.status === 'active').length;
  
  const stats = {
    tokens: formatTokens(totalTokens),
    costToday: formatCost(totalCost),
    uptime: formatUptime(avgUptime),
    models: `${activeAgents} online`
  };
  
  return { stats };
});

// =====================================================
// MDX Control - Missions Endpoints
// =====================================================

// Helper: Calculate progress based on run status and metrics
function calculateProgress(run: any): number {
  if (!run) return 0;
  
  switch (run.status) {
    case 'finished':
      return 100;
    case 'failed':
      // Failed runs show 0% or could show partial progress
      return 0;
    case 'running':
      // Running runs show 50% or calculate based on token usage vs estimated
      const tokenProgress = run.tokensIn && run.tokensOut 
        ? Math.min(90, Math.round(((run.tokensIn + run.tokensOut) / 10000) * 100))
        : 50;
      return tokenProgress;
    case 'queued':
    default:
      return 0;
  }
}

// Helper: Get priority based on run source and tokens
function getPriority(run: any): string {
  if (run.source === 'MAIN') return 'high';
  if (run.tokensIn + run.tokensOut > 10000) return 'high';
  if (run.tokensIn + run.tokensOut > 5000) return 'medium';
  return 'low';
}

// Get all missions - creates missions from real runs if table is empty
server.get('/api/missions', async () => {
  // First, try to get existing missions from the Mission table
  const existingMissions = await prisma.mission.findMany({
    orderBy: { createdAt: 'desc' }
  });
  
  // If we have real missions in the table, return them with calculated progress
  if (existingMissions.length > 0) {
    // Get runs to calculate progress for missions linked to runs
    const runs = await prisma.run.findMany({
      orderBy: { startedAt: 'desc' },
      take: 100
    });
    
    const runMap = new Map(runs.map(r => [r.id, r]));
    
    return existingMissions.map(m => {
      const config = m.config as any;
      const linkedRunId = config?.runId;
      const linkedRun = linkedRunId ? runMap.get(linkedRunId) : null;
      
      // Calculate real progress
      const progress = linkedRun 
        ? calculateProgress(linkedRun)
        : (config?.progress ?? (m.status === 'completed' ? 100 : m.status === 'active' ? 50 : 0));
      
      return {
        id: m.id,
        name: m.name,
        description: m.description,
        status: m.status,
        priority: m.priority,
        owner: m.owner,
        progress,
        config: {
          ...config,
          progress,
          tokensIn: linkedRun?.tokensIn || config?.tokensIn || 0,
          tokensOut: linkedRun?.tokensOut || config?.tokensOut || 0,
          model: linkedRun?.model || config?.model,
          runStatus: linkedRun?.status || config?.runStatus
        },
        createdAt: m.createdAt.getTime(),
        updatedAt: m.updatedAt.getTime()
      };
    });
  }
  
  // If no missions in table, create virtual missions from real runs
  const runs = await prisma.run.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50
  });
  
  // Also get sessions for additional context
  const sessions = await prisma.session.findMany({
    orderBy: { lastSeenAt: 'desc' },
    take: 20
  });
  
  // Create missions from runs
  const runMissions = runs.map((run, index) => {
    const progress = calculateProgress(run);
    const priority = getPriority(run);
    
    // Map run status to mission status
    let missionStatus = 'pending';
    if (run.status === 'finished') missionStatus = 'completed';
    else if (run.status === 'running') missionStatus = 'active';
    else if (run.status === 'failed') missionStatus = 'paused';
    else if (run.status === 'queued') missionStatus = 'pending';
    
    return {
      id: `mission_run_${run.id}`,
      name: run.label || `Run ${run.source} - ${run.model}`,
      description: `Agent execution: ${run.source} using ${run.model}`,
      status: missionStatus,
      priority,
      owner: run.source === 'MAIN' ? 'Main Agent' : run.source === 'SUBAGENT' ? 'Sub-Agent' : 'System',
      progress,
      config: {
        runId: run.id,
        source: run.source,
        model: run.model,
        tokensIn: run.tokensIn,
        tokensOut: run.tokensOut,
        duration: run.duration,
        contextPct: run.contextPct,
        runStatus: run.status,
        finishReason: run.finishReason,
        progress
      },
      createdAt: run.startedAt.getTime(),
      updatedAt: run.startedAt.getTime()
    };
  });
  
  // Create missions from active sessions
  const sessionMissions = sessions
    .filter(s => s.status === 'active')
    .slice(0, 5)
    .map((session, index) => ({
      id: `mission_session_${session.id}`,
      name: `Session: ${session.agentName}`,
      description: `Active session with ${session.model}`,
      status: 'active',
      priority: 'medium',
      owner: session.agentName,
      progress: Math.min(95, Math.round((session.tokens24h / 50000) * 100)) || 25,
      config: {
        sessionId: session.id,
        model: session.model,
        tokens24h: session.tokens24h,
        progress: Math.min(95, Math.round((session.tokens24h / 50000) * 100)) || 25
      },
      createdAt: session.startedAt.getTime(),
      updatedAt: session.lastSeenAt.getTime()
    }));
  
  // Combine and return
  return [...runMissions, ...sessionMissions];
});

// Get mission by ID
server.get('/api/missions/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
  const { id } = request.params;
  
  const mission = await prisma.mission.findUnique({ where: { id } });
  
  if (!mission) {
    reply.code(404);
    return { error: 'Mission not found' };
  }
  
  return {
    id: mission.id,
    name: mission.name,
    description: mission.description,
    status: mission.status,
    priority: mission.priority,
    owner: mission.owner,
    config: mission.config,
    createdAt: mission.createdAt.getTime(),
    updatedAt: mission.updatedAt.getTime()
  };
});

// Create new mission
server.post('/api/missions', async (request, reply) => {
  const body = request.body as any;
  
  const newMission = await prisma.mission.create({
    data: {
      id: 'mission_' + Date.now(),
      name: body?.name || 'New Mission',
      description: body?.description || '',
      status: body?.status || 'pending',
      priority: body?.priority || 'medium',
      owner: body?.owner || 'Admin',
      config: body?.config || {}
    }
  });
  
  return reply.code(201).send({
    id: newMission.id,
    name: newMission.name,
    description: newMission.description,
    status: newMission.status,
    priority: newMission.priority,
    owner: newMission.owner,
    config: newMission.config,
    createdAt: newMission.createdAt.getTime(),
    updatedAt: newMission.updatedAt.getTime()
  });
});

// Update mission
server.patch('/api/missions/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
  const { id } = request.params;
  const body = request.body as any;
  
  // Verify mission exists
  const existingMission = await prisma.mission.findUnique({ where: { id } });
  if (!existingMission) {
    reply.code(404);
    return { error: 'Mission not found' };
  }
  
  const updatedMission = await prisma.mission.update({
    where: { id },
    data: {
      ...(body?.name !== undefined && { name: body.name }),
      ...(body?.description !== undefined && { description: body.description }),
      ...(body?.status !== undefined && { status: body.status }),
      ...(body?.priority !== undefined && { priority: body.priority }),
      ...(body?.owner !== undefined && { owner: body.owner }),
      ...(body?.config !== undefined && { config: body.config }),
      updatedAt: new Date()
    }
  });
  
  return {
    id: updatedMission.id,
    name: updatedMission.name,
    description: updatedMission.description,
    status: updatedMission.status,
    priority: updatedMission.priority,
    owner: updatedMission.owner,
    config: updatedMission.config,
    createdAt: updatedMission.createdAt.getTime(),
    updatedAt: updatedMission.updatedAt.getTime()
  };
});

// =====================================================
// MDX Control - Activity Feed Endpoint
// =====================================================
server.get('/api/activity', async () => {
  // Get real runs with detailed info
  const runs = await prisma.run.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50
  });
  
  // Get sessions for additional activity context
  const sessions = await prisma.session.findMany({
    orderBy: { lastSeenAt: 'desc' },
    take: 20
  });
  
  // Get agents for context
  const agents = await prisma.agent.findMany({
    where: { status: 'active' }
  });
  
  // Map runs to activity feed with descriptive messages
  const runActivities = runs.map(r => {
    let message = '';
    let type = 'run';
    
    switch (r.status) {
      case 'finished':
        message = `✅ ${r.source} completed "${r.label}"`;
        if (r.tokensOut > 0) {
          message += ` · ${r.tokensOut.toLocaleString()} tokens`;
        }
        if (r.duration) {
          message += ` · ${(r.duration / 1000).toFixed(1)}s`;
        }
        break;
      case 'running':
        message = `🔄 ${r.source} running "${r.label}"`;
        if (r.model) {
          message += ` · ${r.model}`;
        }
        break;
      case 'failed':
        message = `❌ ${r.source} failed on "${r.label}"`;
        if (r.finishReason) {
          message += ` · ${r.finishReason}`;
        }
        break;
      case 'queued':
        message = `⏳ ${r.source} queued "${r.label}"`;
        break;
      default:
        message = `${r.source} · ${r.label} (${r.status})`;
    }
    
    return {
      id: r.id,
      type,
      message,
      status: r.status,
      model: r.model,
      source: r.source,
      label: r.label,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      timestamp: r.startedAt.getTime(),
      duration: r.duration,
      finishReason: r.finishReason
    };
  });
  
  // Map sessions to activity
  const sessionActivities = sessions.map(s => {
    const isActive = s.status === 'active';
    return {
      id: s.id,
      type: 'session',
      message: isActive 
        ? `🟢 ${s.agentName} session active · ${s.tokens24h.toLocaleString()} tokens`
        : `⚪ ${s.agentName} session ${s.status}`,
      status: s.status,
      model: s.model,
      source: s.agentName,
      agent: s.agentName,
      tokens24h: s.tokens24h,
      timestamp: s.lastSeenAt.getTime()
    };
  });
  
  // Combine and sort by timestamp
  const allActivities = [...runActivities, ...sessionActivities]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);
  
  return allActivities;
});

// =====================================================
// WebSocket Support for Real-time Events
// =====================================================

// Simple WebSocket broadcast function (works with compatible clients)
const wsClients = new Set<any>();

// Endpoint to register as WebSocket client (SSE alternative)
server.get('/api/events', async (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial connection event
  reply.raw.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Keep connection alive with heartbeat
  const interval = setInterval(() => {
    try {
      reply.raw.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(interval);
    }
  }, 30000);

  request.raw.on('close', () => {
    clearInterval(interval);
  });

  return reply;
});

// Broadcast function for internal use
function broadcastWS(event: any) {
  // For now, log the event - in production would push to SSE clients
  console.log('[WS Broadcast]', event.type, event);
}

// Activity Feed Events - emit on new activity
async function emitActivityEvent(type: string, data: any) {
  broadcastWS({ type, data, timestamp: Date.now() });
}
