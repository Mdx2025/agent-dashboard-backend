import { Router } from 'express';
import { Agent } from '../models/index.js';
import { emitAgentStatus } from '../websocket/index.js';

const router = Router();

// GET /api/agents - List all agents
router.get('/', async (req, res) => {
  try {
    const agents = await Agent.findAll({ order: [['name', 'ASC']] });
    res.json(agents.map(a => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      type: a.type,
      status: a.status,
      model: a.model,
      provider: a.provider,
      description: a.description,
      runs24h: a.runs24h,
      err24h: a.err24h,
      costDay: a.costDay,
      tokensIn24h: a.tokensIn24h,
      tokensOut24h: a.tokensOut24h,
      costAll: a.costAll,
      latencyAvg: a.latencyAvg,
      uptime: a.uptime
    })));
  } catch (err) {
    console.error('GET /api/agents error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/:id - Get single agent
router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findByPk(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/agents/:id - Update agent (mainly status)
router.patch('/:id', async (req, res) => {
  try {
    const agent = await Agent.findByPk(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const allowed = ['status', 'model', 'provider', 'description', 'emoji',
      'runs24h', 'runsAll', 'err24h', 'tokensIn24h', 'tokensOut24h',
      'costDay', 'costAll', 'latencyAvg', 'uptime'];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await agent.update(updates);

    // Emit status change if status was updated
    if (updates.status) {
      emitAgentStatus(agent.id, updates.status);
    }

    res.json(agent);
  } catch (err) {
    console.error('PATCH /api/agents/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/sync - Bulk sync agents from OpenClaw
router.post('/sync', async (req, res) => {
  try {
    const { agents } = req.body;
    if (!agents || !Array.isArray(agents)) {
      return res.status(400).json({ error: 'agents array is required' });
    }

    const results = [];
    for (const a of agents) {
      const [agent, created] = await Agent.upsert({
        id: a.id,
        name: a.name,
        type: a.type || 'SUBAGENT',
        status: a.status || 'idle',
        model: a.model || 'unknown',
        provider: a.provider || 'unknown',
        description: a.description || null,
        emoji: a.emoji || '🤖',
        runs24h: a.runs24h || 0,
        runsAll: a.runsAll || 0,
        err24h: a.err24h || 0,
        tokensIn24h: a.tokensIn24h || 0,
        tokensOut24h: a.tokensOut24h || 0,
        costDay: a.costDay || 0,
        costAll: a.costAll || 0,
        latencyAvg: a.latencyAvg || 0,
        uptime: a.uptime || 100
      });
      results.push({ id: a.id, status: 'ok' });
    }

    res.json({ synced: results.length, results });
  } catch (err) {
    console.error('POST /api/agents/sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
