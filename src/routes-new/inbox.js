import { Router } from 'express';
import { Session, Run, LogEntry } from '../models/index.js';
import { Op } from 'sequelize';

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

// GET /api/inbox - Listar threads desde DB
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.findAll({
      order: [['started_at', 'DESC']],
      limit: 50
    });
    
    const threads = sessions.map(session => {
      const agentId = session.agent_id;
      const sessionId = session.id;
      const metadata = session.metadata || {};
      
      return {
        id: sessionId,
        name: `${AGENT_EMOJIS[agentId] || '🤖'} ${AGENT_NAMES[agentId] || agentId} - ${sessionId.slice(0, 8)}`,
        agent: agentId,
        agentName: AGENT_NAMES[agentId] || agentId,
        messages: [{
          role: 'system',
          text: `Session with ${metadata.messageCount || 0} messages, ${session.total_tokens || 0} tokens`,
          time: session.started_at
        }],
        status: session.status === 'failed' ? 'error' : 'active',
        lastSeenAt: session.last_activity_at,
        lastMessage: `${metadata.messageCount || 0} messages exchanged`
      };
    });
    
    res.json({ threads, messages: [] });
  } catch (err) {
    console.error('Inbox error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inbox/:id/reply
router.post('/:id/reply', async (req, res) => {
  res.json({ success: true, message: 'Reply sent (simulated)' });
});

// POST /api/inbox/:id/ping
router.post('/:id/ping', async (req, res) => {
  res.json({ success: true, message: 'Ping sent' });
});

export default router;
