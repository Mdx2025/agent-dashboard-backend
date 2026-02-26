import { Router } from 'express';
import { Op } from 'sequelize';
import sequelize from '../index.js';
import { Agent, Mission, MissionStep, Activity } from '../models/index.js';

const router = Router();

// GET /api/dashboard/overview - Full dashboard overview
router.get('/overview', async (req, res) => {
  try {
    // Stats
    const [
      agentsRunning,
      activeMissions,
      pendingApproval,
      allAgents,
      todayActivities
    ] = await Promise.all([
      Agent.count({ where: { status: 'active' } }),
      Mission.count({ where: { status: 'in_progress' } }),
      Mission.count({ where: { status: 'pending' } }),
      Agent.findAll(),
      Activity.count({
        where: {
          createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      })
    ]);

    const costToday = allAgents.reduce((sum, a) => sum + (a.costDay || 0), 0);

    // Active missions (limit 10)
    const missions = await Mission.findAll({
      where: { status: { [Op.in]: ['pending', 'in_progress'] } },
      include: [
        { model: MissionStep, as: 'steps' },
        { model: Agent, as: 'agent', attributes: ['id', 'name', 'emoji'] }
      ],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: 10
    });

    // Recent activity (limit 20)
    const recentActivity = await Activity.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // System health - check key components
    const systemHealth = [];

    // DB check
    try {
      const start = Date.now();
      await sequelize.query('SELECT 1');
      systemHealth.push({
        name: 'PostgreSQL',
        status: 'healthy',
        latencyMs: Date.now() - start,
        detail: 'Connected'
      });
    } catch (e) {
      systemHealth.push({
        name: 'PostgreSQL',
        status: 'unhealthy',
        latencyMs: 0,
        detail: e.message
      });
    }

    // Agent health
    const errorAgents = allAgents.filter(a => a.status === 'error');
    systemHealth.push({
      name: 'Agents',
      status: errorAgents.length > 0 ? 'degraded' : 'healthy',
      detail: `${agentsRunning} running, ${errorAgents.length} errors`,
      activeCount: agentsRunning,
      errorCount: errorAgents.length
    });

    // WebSocket check (simple - always healthy if server is up)
    systemHealth.push({
      name: 'WebSocket',
      status: 'healthy',
      detail: 'Socket.IO active'
    });

    // API check
    systemHealth.push({
      name: 'API Server',
      status: 'healthy',
      detail: `Uptime: ${Math.floor(process.uptime())}s`
    });

    res.json({
      stats: {
        agentsRunning,
        activeMissions,
        pendingApproval,
        costToday: Math.round(costToday * 100) / 100,
        activitiestoday: todayActivities
      },
      missions: missions.map(m => ({
        id: m.id,
        title: m.title,
        agentId: m.agentId,
        agentName: m.agent?.name || null,
        agentEmoji: m.agent?.emoji || '🤖',
        status: m.status,
        progress: m.progress,
        priority: m.priority,
        dueDate: m.dueDate,
        stepsTotal: (m.steps || []).length,
        stepsDone: (m.steps || []).filter(s => s.done).length,
        currentStep: (m.steps || []).find(s => s.current)?.name || null
      })),
      recentActivity: recentActivity.map(a => ({
        id: a.id,
        agentId: a.agentId,
        agentName: a.agentName,
        emoji: a.emoji,
        type: a.type,
        action: a.action,
        details: a.details,
        timestamp: a.createdAt,
        tokens: a.tokens
      })),
      systemHealth
    });
  } catch (err) {
    console.error('GET /api/dashboard/overview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/agents - Agent summary for dashboard
router.get('/agents', async (req, res) => {
  try {
    const agents = await Agent.findAll({
      include: [
        {
          model: Mission,
          as: 'missions',
          where: { status: { [Op.in]: ['pending', 'in_progress'] } },
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json(agents.map(a => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      status: a.status,
      type: a.type,
      model: a.model,
      provider: a.provider,
      costDay: a.costDay,
      runs24h: a.runs24h,
      err24h: a.err24h,
      activeMissions: (a.missions || []).length,
      uptime: a.uptime
    })));
  } catch (err) {
    console.error('GET /api/dashboard/agents error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
