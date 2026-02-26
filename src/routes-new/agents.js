import express from 'express';

const router = express.Router();

// Mock agent logs storage (in production, use database)
const agentLogs = new Map();

// GET /api/agents - Lista agentes con status
router.get('/', (req, res) => {
  const agents = [
    { id: 'main', name: 'Jarvis', status: 'online', model: 'MiniMax-M2.5-highspeed', lastActive: new Date().toISOString(), capabilities: ['general', 'coordination'] },
    { id: 'coder', name: 'Coder', status: 'online', model: 'kimi-coding/k2p5', lastActive: new Date().toISOString(), capabilities: ['coding', 'debugging'] },
    { id: 'writer', name: 'Writer', status: 'idle', model: 'openai-codex/gpt-5.3-codex', lastActive: new Date(Date.now() - 3600000).toISOString(), capabilities: ['writing', 'content'] },
    { id: 'researcher', name: 'Researcher', status: 'offline', model: 'google-gemini-cli/gemini-2.5-pro', lastActive: new Date(Date.now() - 7200000).toISOString(), capabilities: ['research', 'analysis'] },
    { id: 'raider', name: 'Raider', status: 'online', model: 'anthropic/claude-opus-4-6', lastActive: new Date().toISOString(), capabilities: ['review', 'security'] },
    { id: 'clawma', name: 'Clawma', status: 'idle', model: 'zai/glm-5', lastActive: new Date(Date.now() - 1800000).toISOString(), capabilities: ['support', 'customer-service'] },
    { id: 'support', name: 'Support', status: 'offline', model: 'minimax-portal/MiniMax-M2.5', lastActive: new Date(Date.now() - 86400000).toISOString(), capabilities: ['support'] },
    { id: 'reasoning', name: 'Reasoning', status: 'idle', model: 'openai/gpt-5.2', lastActive: new Date(Date.now() - 900000).toISOString(), capabilities: ['reasoning', 'analysis'] }
  ];

  res.json(agents);
});

// GET /api/agents/:id - Detalle agente
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const agentsData = {
    main: { id: 'main', name: 'Jarvis', status: 'online', model: 'MiniMax-M2.5-highspeed', lastActive: new Date().toISOString(), capabilities: ['general', 'coordination'], description: 'Main coordinator agent' },
    coder: { id: 'coder', name: 'Coder', status: 'online', model: 'kimi-coding/k2p5', lastActive: new Date().toISOString(), capabilities: ['coding', 'debugging'], description: 'Coding and development agent' },
    writer: { id: 'writer', name: 'Writer', status: 'idle', model: 'openai-codex/gpt-5.3-codex', lastActive: new Date(Date.now() - 3600000).toISOString(), capabilities: ['writing', 'content'], description: 'Content creation agent' },
    researcher: { id: 'researcher', name: 'Researcher', status: 'offline', model: 'google-gemini-cli/gemini-2.5-pro', lastActive: new Date(Date.now() - 7200000).toISOString(), capabilities: ['research', 'analysis'], description: 'Research and analysis agent' },
    raider: { id: 'raider', name: 'Raider', status: 'online', model: 'anthropic/claude-opus-4-6', lastActive: new Date().toISOString(), capabilities: ['review', 'security'], description: 'Code review and security agent' },
    clawma: { id: 'clawma', name: 'Clawma', status: 'idle', model: 'zai/glm-5', lastActive: new Date(Date.now() - 1800000).toISOString(), capabilities: ['support', 'customer-service'], description: 'Customer support agent' },
    support: { id: 'support', name: 'Support', status: 'offline', model: 'minimax-portal/MiniMax-M2.5', lastActive: new Date(Date.now() - 86400000).toISOString(), capabilities: ['support'], description: 'General support agent' },
    reasoning: { id: 'reasoning', name: 'Reasoning', status: 'idle', model: 'openai/gpt-5.2', lastActive: new Date(Date.now() - 900000).toISOString(), capabilities: ['reasoning', 'analysis'], description: 'Advanced reasoning agent' }
  };

  const agent = agentsData[id];
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json(agent);
});

// GET /api/agents/:id/logs - Logs del agente
router.get('/:id/logs', (req, res) => {
  const { id } = req.params;
  const { limit = 100 } = req.query;

  // Generate mock logs
  const logs = [];
  const actions = ['task_started', 'task_completed', 'message_sent', 'file_created', 'api_called', 'error', 'warning'];
  
  for (let i = 0; i < Math.min(parseInt(limit), 100); i++) {
    logs.push({
      id: `log-${Date.now()}-${i}`,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      level: actions[Math.floor(Math.random() * actions.length)],
      message: `Sample log message ${i + 1} for agent ${id}`,
      metadata: { agentId: id }
    });
  }

  res.json(logs);
});

// POST /api/agents/:id/status - Actualizar status del agente
router.post('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['online', 'idle', 'offline', 'busy'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Emit WebSocket event
  const io = req.app.get('io');
  io.emit('agent.status', { agentId: id, status, timestamp: new Date().toISOString() });

  res.json({ success: true, agentId: id, status });
});

export default router;
