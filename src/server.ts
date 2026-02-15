import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const server = Fastify({ logger: true });
const prisma = new PrismaClient();

server.register(cors, { origin: true });

// Serve static frontend files
server.register(fastifyStatic, {
  root: path.join(process.cwd(), 'frontend'),
  prefix: '/',
  wildcard: false,
  index: ['index.html'],
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

const PORT = process.env.PORT || 3000;
server.listen({ port: Number(PORT), host: '0.0.0.0' }, async (err, address) => {
  if (err) { 
    server.log.error(err); 
    process.exit(1); 
  }
  console.log('Server on ' + address);
  
  // Try to ensure tables exist and have correct columns using raw SQL
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
    
    // Add missing columns if table already exists (ignore errors)
    try {
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS tools TEXT[]`;
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "maxTokens" INTEGER`;
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION`;
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS errors JSONB[]`;
    } catch (e) {
      // Columns might already exist, ignore
    }
    
    console.log('Database tables and columns ensured');
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
