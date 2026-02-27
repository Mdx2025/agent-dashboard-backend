import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import sequelize from './index.js';
import { Agent, Mission, MissionStep, Activity, BrainXMemory, ScheduledTask, Artifact } from './models/index.js';
import { initIO } from './websocket/index.js';

// Routes
import missionsRouter from './routes-new/missions.js';
import activityRouter from './routes-new/activity.js';
import dashboardRouter from './routes-new/dashboard.js';
import agentsRouter from './routes-new/agents.js';
import healthRouter from './routes-new/health.js';
import brainxRouter from './routes-new/brainx.js';
import schedulerRouter from './routes-new/scheduler.js';
import artifactsRouter from './routes-new/artifacts.js';

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
app.use('/api/artifacts', artifactsRouter);

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
    await sequelize.sync({ alter: false });
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

    // Seed sample scheduled tasks if empty
    const taskCount = await ScheduledTask.count();
    if (taskCount === 0) {
      console.log('🌱 Seeding sample scheduled tasks...');
      const now = new Date();
      await ScheduledTask.bulkCreate([
        {
          name: 'Morning Sync',
          agent: 'main',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          recurrence: 'daily',
          status: 'scheduled',
          description: 'Daily morning synchronization task'
        },
        {
          name: 'Weekly Report',
          agent: 'writer',
          scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          recurrence: 'weekly',
          status: 'scheduled',
          description: 'Generate weekly activity report'
        },
        {
          name: 'Database Cleanup',
          agent: 'coder',
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
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

    // Seed sample missions if empty
    const missionCount = await Mission.count();
    if (missionCount === 0) {
      console.log("🌱 Seeding sample missions...");
      await Mission.bulkCreate([
        { title: "Email Campaign Automation", description: "Automate email outreach", agentId: "coder", status: "in_progress", progress: 65, priority: "high", dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { title: "BrainX Integration", description: "Integrate BrainX memory", agentId: "main", status: "pending", progress: 0, priority: "high", dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
        { title: "Documentation Update", description: "Update API docs", agentId: "writer", status: "completed", progress: 100, priority: "medium", dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { title: "Performance Optimization", description: "Optimize dashboard", agentId: "coder", status: "in_progress", progress: 40, priority: "medium", dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }
      ]);
      console.log("✅ Sample missions seeded");
    }

    // Seed sample activity if empty
    const activityCount = await Activity.count();
    if (activityCount === 0) {
      console.log("🌱 Seeding sample activity...");
      await Activity.bulkCreate([
        { agentId: "main", agentEmoji: "🧠", type: "message", message: "Completed mission", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { agentId: "coder", agentEmoji: "💻", type: "run", message: "Deployed frontend v1.2.0", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        { agentId: "heartbeat", agentEmoji: "💓", type: "system", message: "Health check passed", timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) },
        { agentId: "writer", agentEmoji: "✍️", type: "message", message: "Generated report", timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000) }
      ]);
      console.log("✅ Sample activity seeded");
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
