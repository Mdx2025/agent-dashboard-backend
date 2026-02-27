import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import sequelize from './index.js';
import { Agent, Mission, MissionStep, Activity, BrainXMemory, ScheduledTask, Artifact, Run, Session, LogEntry } from './models/index.js';
import { syncRunsToMissions } from './services/runSync.js';
import { initIO } from './websocket/index.js';

// Routes
import missionsRouter from './routes-new/missions.js';

// ETL imports
import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';

import activityRouter from './routes-new/activity.js';
import dashboardRouter from './routes-new/dashboard.js';
import agentsRouter from './routes-new/agents.js';
import healthRouter from './routes-new/health.js';
import brainxRouter from './routes-new/brainx.js';
import schedulerRouter from './routes-new/scheduler.js';
import artifactsRouter from './routes-new/artifacts.js';
import webhooksRouter from './routes-new/webhooks.js';
import etlRouter from './routes-new/etl.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.includes('/health')) {
      console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Set models on app for routes that use req.app.get('models')
app.set('models', { sequelize, Agent, Mission, MissionStep, Activity, BrainXMemory, ScheduledTask, Artifact });

// Mount routes
app.use('/api/missions', missionsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/health', healthRouter);
app.use('/api/brainx', brainxRouter);
app.use('/api/scheduler', schedulerRouter);
app.use('/api/admin/etl', etlRouter);
app.use('/api/artifacts', artifactsRouter);
app.use('/api/webhooks', webhooksRouter);
// TEMP: ETL Endpoint
import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';

const OPENCLAW_DIR = path.join(process.env.HOME || '/home/clawd', '.openclaw', 'agents');

async function parseJsonlFile(filePath, agentId) {
  const sessionId = path.basename(filePath, '.jsonl');
  const stats = await fs.stat(filePath).catch(() => null);
  if (!stats || stats.size === 0) return null;

  const fileStream = createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let firstTimestamp = null, lastTimestamp = null, totalTokens = 0;
  let models = new Set(), hasError = false, messageCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      const ts = entry.timestamp ? new Date(entry.timestamp) : null;
      if (ts && !isNaN(ts)) {
        if (!firstTimestamp) firstTimestamp = ts;
        lastTimestamp = ts;
      }
      if (entry.type === 'error') hasError = true;
      if (entry.type === 'response' && entry.payload?.usage) {
        totalTokens += (entry.payload.usage.total_tokens || 0);
        if (entry.payload.model) models.add(entry.payload.model);
      }
      messageCount++;
    } catch (e) {}
  }

  if (!firstTimestamp) return null;

  return {
    id: sessionId, agent_id: agentId, status: hasError ? 'failed' : 'closed',
    started_at: firstTimestamp, last_activity_at: lastTimestamp || firstTimestamp,
    total_tokens: totalTokens, metadata: { models: [...models], messageCount }
  };
}

async function discoverSessions() {
  const sessions = [];
  try {
    for (const agentId of await fs.readdir(OPENCLAW_DIR)) {
      const sessionsDir = path.join(OPENCLAW_DIR, agentId, 'sessions');
      try {
        for (const file of await fs.readdir(sessionsDir)) {
          if (file.endsWith('.jsonl')) {
            sessions.push({ agentId, filePath: path.join(sessionsDir, file) });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return sessions;
}

app.post('/api/admin/run-etl', async (req, res) => {
  try {
    console.log('🚀 ETL iniciado via HTTP');
    const sessions = await discoverSessions();
    let count = 0;
    
    for (const s of sessions) {
      const data = await parseJsonlFile(s.filePath, s.agentId);
      if (!data) continue;

      await Session.upsert(data);
      const runId = 'run_' + data.id;
      await Run.upsert({
        id: runId, session_id: data.id, agent_id: data.agent_id,
        label: `${data.agent_id}: ${data.id.slice(0, 8)}`,
        status: data.status === 'failed' ? 'failed' : 'finished',
        started_at: data.started_at, finished_at: data.last_activity_at,
        duration: 0, model: data.metadata.models?.[0] || 'unknown',
        tokens_in: Math.floor(data.metadata.messageCount * 100),
        tokens_out: data.total_tokens, cost: 0, metadata: { source: 'etl' }
      });

      const existing = await Mission.findByPk(runId);
      if (!existing) {
        await Mission.create({
          id: runId, title: data.agent_id + ' task', agent_id: data.agent_id,
          status: data.status === 'failed' ? 'failed' : 'completed',
          progress: data.status === 'failed' ? 0 : 100,
          priority: data.total_tokens > 5000 ? 'high' : 'medium',
          due_date: data.last_activity_at,
          description: `ETL from ${data.agent_id}`,
          metadata: { sessionId: data.id, tokens: data.total_tokens }
        });
      }
      count++;
    }

    res.json({ success: true, processed: count, total: sessions.length });
  } catch (err) {
    console.error('ETL error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Initialize WebSocket
const io = initIO(httpServer);

// Database sync and start
async function start() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync all models (creates tables if not exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Models synced');
    // Sync runs to missions
    await syncRunsToMissions(sequelize);
    console.log('✅ Runs synced to missions');

    // Seed default agents if empty
    const agentCount = await Agent.count();
    if (agentCount === 0) {
      console.log('🌱 Seeding default agents...');
      await Agent.bulkCreate([
        { id: 'main', name: 'Main', type: 'MAIN', status: 'active', provider: 'MiniMax', model: 'MiniMax-M2.5-highspeed', emoji: '🧠', description: 'Main orchestrator agent' },
        { id: 'coder', name: 'Coder', type: 'SUBAGENT', status: 'active', provider: 'Kimi', model: 'k2p5', emoji: '💻', description: 'Code writing and review' },
        { id: 'writer', name: 'Writer', type: 'SUBAGENT', status: 'idle', provider: 'OpenAI', model: 'gpt-5.3-codex', emoji: '✍️', description: 'Content writer' },
        { id: 'researcher', name: 'Researcher', type: 'SUBAGENT', status: 'idle', provider: 'Google', model: 'gemini-2.5-pro', emoji: '🔍', description: 'Research agent' },
        { id: 'reasoning', name: 'Reasoning', type: 'SUBAGENT', status: 'idle', provider: 'OpenAI', model: 'gpt-5.2', emoji: '🤔', description: 'Deep reasoning' },
        { id: 'clawma', name: 'Clawma', type: 'SUBAGENT', status: 'idle', provider: 'ZAI', model: 'glm-5', emoji: '🐾', description: 'Cost-optimized tasks' },
        { id: 'support', name: 'Support', type: 'SUBAGENT', status: 'idle', provider: 'MiniMax', model: 'MiniMax-M2.5', emoji: '🛟', description: 'Support agent' },
        { id: 'heartbeat', name: 'Heartbeat', type: 'SUBAGENT', status: 'active', provider: 'MiniMax', model: 'MiniMax-M2.5', emoji: '💓', description: 'Cron scheduler' },
      ]);
      console.log('✅ Default agents seeded');
    }

    // Seed sample scheduled tasks if empty
    const taskCount = await ScheduledTask.count();
    if (taskCount === 0) {
      console.log('🌱 Seeding sample scheduled tasks...');
      const now = new Date();
      await ScheduledTask.bulkCreate([
        {
          name: 'Morning Sync',
          agent: 'main',
          scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
          recurrence: 'daily',
          status: 'scheduled',
          description: 'Daily morning synchronization task'
        },
        {
          name: 'Weekly Report',
          agent: 'writer',
          scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          recurrence: 'weekly',
          status: 'scheduled',
          description: 'Generate weekly activity report'
        },
        {
          name: 'Database Cleanup',
          agent: 'coder',
          scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
          recurrence: 'once',
          status: 'scheduled',
          description: 'Clean up old database entries'
        }
      ]);
      console.log('✅ Sample tasks seeded');
    }

    // Seed sample artifacts if empty
    const artifactCount = await Artifact.count();
    if (artifactCount === 0) {
      console.log('🌱 Seeding sample artifacts...');
      await Artifact.bulkCreate([
        {
          name: 'API Documentation.md',
          emoji: '📄',
          agent: 'coder',
          type: 'markdown',
          size: '12.5 KB',
          badge: 'MD',
          content: '# API Documentation\n\n## Endpoints\n\n### GET /api/missions\nReturns list of missions.\n\n### POST /api/missions\nCreates a new mission.'
        },
        {
          name: 'Architecture Diagram.svg',
          emoji: '🎨',
          agent: 'designer',
          type: 'svg',
          size: '45.2 KB',
          badge: 'SVG',
          content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>'
        },
        {
          name: 'Deployment Guide.md',
          emoji: '🚀',
          agent: 'devops',
          type: 'markdown',
          size: '8.3 KB',
          badge: 'MD',
          content: '# Deployment Guide\n\n## Prerequisites\n- Node.js 18+\n- PostgreSQL 14+\n\n## Steps\n1. Clone repository\n2. Install dependencies\n3. Configure environment'
        }
      ]);
      console.log('✅ Sample artifacts seeded');
    }

    // Start server
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 MDX Control Backend running on http://0.0.0.0:${PORT}`);
      console.log(`📡 WebSocket ready on ws://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await sequelize.close();
  process.exit(0);
});

start();
// Cache-bust: 1772187193

