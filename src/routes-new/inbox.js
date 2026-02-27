import { Router } from 'express';
import { Mission } from '../models/index.js';

const router = Router();

const AGENT_NAMES = {
  main: 'Main', coder: 'Coder', writer: 'Writer', researcher: 'Researcher',
  reasoning: 'Reasoning', clawma: 'Clawma', support: 'Support', heartbeat: 'Heartbeat',
  raider: 'Raider', monitor: 'Monitor', router: 'Router'
};

const AGENT_EMOJIS = {
  main: '🧠', coder: '💻', writer: '✍️', researcher: '🔍',
  reasoning: '🤔', clawma: '🐾', support: '🛟', heartbeat: '💓',
  raider: '🏴‍☠️', monitor: '📊', router: '🔄'
};

// GET /api/inbox - Listar threads desde Missions
router.get('/', async (req, res) => {
  try {
    const missions = await Mission.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    const threads = missions.map(mission => {
      const metadata = mission.metadata || {};
      const agentId = mission.agent_id || 'unknown';
      
      return {
        id: mission.id,
        name: `${AGENT_EMOJIS[agentId] || '🤖'} ${AGENT_NAMES[agentId] || agentId} - ${mission.title?.slice(0, 20) || 'Task'}`,
        agent: agentId,
        agentName: AGENT_NAMES[agentId] || agentId,
        messages: [{
          role: 'system',
          text: mission.description || 'Task created',
          time: mission.due_date || mission.createdAt
        }],
        status: mission.status === 'failed' ? 'error' : 'active',
        lastSeenAt: mission.updatedAt || mission.createdAt,
        lastMessage: mission.description?.substring(0, 50) || 'No details'
      };
    });
    
    res.json({ threads, messages: [] });
  } catch (err) {
    console.error('Inbox error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reply', async (req, res) => {
  res.json({ success: true, message: 'Reply sent' });
});

router.post('/:id/ping', async (req, res) => {
  res.json({ success: true, message: 'Ping sent' });
});

export default router;
