import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';

const server = Fastify({ logger: true });
const prisma = new PrismaClient();

server.register(cors, { origin: true });

// Health check
server.get('/api/health', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: Date.now(), db: 'connected' };
  } catch (e) {
    return { status: 'ok', timestamp: Date.now(), db: 'disconnected' };
  }
});

// Get all agents
server.get('/api/agents', async () => {
  const agents = await prisma.agent.findMany({
    orderBy: { name: 'asc' }
  });
  return agents.map(a => ({
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
  }));
});

// Get all sessions
server.get('/api/sessions', async () => {
  const sessions = await prisma.session.findMany({
    orderBy: { lastSeenAt: 'desc' },
    take: 50
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
    take: 50
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

// Get all services
server.get('/api/services', async () => {
  const services = await prisma.service.findMany({
    orderBy: { name: 'asc' }
  });
  return services.map(s => ({
    name: s.name,
    status: s.status,
    host: s.host,
    port: s.port,
    latencyMs: s.latencyMs,
    cpuPct: s.cpuPct,
    memPct: s.memPct,
    version: s.version,
  }));
});

// Get logs
server.get('/api/logs', async () => {
  const logs = await prisma.logEntry.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100
  });
  return logs.map(l => ({
    id: l.id,
    timestamp: l.timestamp.getTime(),
    level: l.level,
    source: l.source,
    message: l.message,
  }));
});

// Sync endpoint - for internal use to populate DB
server.post('/api/sync', async (request, reply) => {
  const { agents, sessions, runs, skills, services, logs } = request.body as any;
  
  try {
    if (agents) {
      for (const a of agents) {
        await prisma.agent.upsert({
          where: { id: a.id },
          update: a,
          create: a,
        });
      }
    }
    
    if (sessions) {
      for (const s of sessions) {
        await prisma.session.upsert({
          where: { id: s.id },
          update: s,
          create: s,
        });
      }
    }
    
    if (runs) {
      for (const r of runs) {
        await prisma.run.upsert({
          where: { id: r.id },
          update: r,
          create: r,
        });
      }
    }
    
    if (skills) {
      for (const s of skills) {
        await prisma.skill.upsert({
          where: { id: s.id },
          update: s,
          create: s,
        });
      }
    }
    
    if (services) {
      for (const s of services) {
        await prisma.service.upsert({
          where: { id: s.id },
          update: s,
          create: s,
        });
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

const PORT = process.env.PORT || 3000;
server.listen({ port: Number(PORT), host: '0.0.0.0' }, async (err, address) => {
  if (err) { 
    server.log.error(err); 
    process.exit(1); 
  }
  console.log('Server on ' + address);
  
  // Try to ensure tables exist using raw SQL
  try {
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Agent" (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'MAIN', status TEXT NOT NULL DEFAULT 'idle', model TEXT NOT NULL, provider TEXT NOT NULL, description TEXT, "runs24h" INTEGER DEFAULT 0, "runsAll" INTEGER DEFAULT 0, "err24h" INTEGER DEFAULT 0, "tokensIn24h" INTEGER DEFAULT 0, "tokensOut24h" INTEGER DEFAULT 0, "costDay" DOUBLE PRECISION DEFAULT 0, "costAll" DOUBLE PRECISION DEFAULT 0, "latencyAvg" DOUBLE PRECISION DEFAULT 0, "latencyP95" DOUBLE PRECISION DEFAULT 0, "contextAvgPct" DOUBLE PRECISION DEFAULT 0, uptime DOUBLE PRECISION DEFAULT 100, "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW())`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Session" (id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'active', "startedAt" TIMESTAMP DEFAULT NOW(), "lastSeenAt" TIMESTAMP DEFAULT NOW(), "tokens24h" INTEGER DEFAULT 0, model TEXT NOT NULL, "agentName" TEXT NOT NULL)`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Run" (id TEXT PRIMARY KEY, source TEXT NOT NULL DEFAULT 'MAIN', label TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', "startedAt" TIMESTAMP DEFAULT NOW(), duration INTEGER, model TEXT NOT NULL, "contextPct" DOUBLE PRECISION DEFAULT 0, "tokensIn" INTEGER DEFAULT 0, "tokensOut" INTEGER DEFAULT 0, "finishReason" TEXT)`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Skill" (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, version TEXT NOT NULL, category TEXT NOT NULL, enabled BOOLEAN DEFAULT true, status TEXT NOT NULL DEFAULT 'ok', description TEXT NOT NULL, "usage24h" INTEGER DEFAULT 0, "latencyAvg" DOUBLE PRECISION DEFAULT 0, "latencyP95" DOUBLE PRECISION DEFAULT 0, "errorRate" DOUBLE PRECISION DEFAULT 0, config JSONB DEFAULT '{}', dependencies TEXT[], changelog JSONB[])`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Service" (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'healthy', host TEXT, port INTEGER, "latencyMs" INTEGER DEFAULT 0, "cpuPct" DOUBLE PRECISION DEFAULT 0, "memPct" DOUBLE PRECISION DEFAULT 0, version TEXT, metadata JSONB DEFAULT '{}', "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW())`;
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "LogEntry" (id TEXT PRIMARY KEY, timestamp TIMESTAMP DEFAULT NOW(), level TEXT NOT NULL, source TEXT NOT NULL, message TEXT NOT NULL, "runId" TEXT, "requestId" TEXT, extra JSONB)`;
    console.log('Database tables ensured');
  } catch (e: any) {
    console.log('Table creation warning:', e.message);
  }
  
  // Seed initial data if DB is empty
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
    }
  } catch (e) {
    console.error('Error seeding data:', e);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
