import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import sequelize from './index.js';
import { Agent, Mission, MissionStep, Activity, BrainXMemory } from './models/index.js';
import { initIO } from './websocket/index.js';

// Routes
import missionsRouter from './routes-new/missions.js';
import activityRouter from './routes-new/activity.js';
import dashboardRouter from './routes-new/dashboard.js';
import agentsRouter from './routes-new/agents.js';
import healthRouter from './routes-new/health.js';
import brainxRouter from './routes-new/brainx.js';

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
app.set('models', { sequelize, Agent, Mission, MissionStep, Activity, BrainXMemory });

// Mount routes
app.use('/api/missions', missionsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/health', healthRouter);
app.use('/api/brainx', brainxRouter);

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
