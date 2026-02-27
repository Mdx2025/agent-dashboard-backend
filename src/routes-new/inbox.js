import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';

const router = Router();
const OPENCLAW_DIR = path.join(process.env.HOME || '/home/clawd', '.openclaw', 'agents');

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

async function parseSessionForInbox(filePath, agentId) {
  const sessionId = path.basename(filePath, '.jsonl');
  const stats = await fs.stat(filePath).catch(() => null);
  if (!stats || stats.size === 0) return null;

  const fileStream = createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let firstTimestamp = null, lastTimestamp = null;
  let messages = [], hasError = false;

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
      
      // Extraer mensajes relevantes
      if (entry.type === 'request' && entry.payload?.messages?.[0]?.content) {
        messages.push({
          role: 'user',
          text: entry.payload.messages[0].content.substring(0, 200),
          time: entry.timestamp
        });
      }
      if (entry.type === 'response' && entry.payload?.choices?.[0]?.message?.content) {
        messages.push({
          role: 'assistant',
          text: entry.payload.choices[0].message.content.substring(0, 200),
          time: entry.timestamp
        });
      }
    } catch (e) {}
  }

  if (!firstTimestamp) return null;

  const lastMessage = messages[messages.length - 1]?.text || 'Session active';
  
  return {
    id: sessionId,
    name: `${AGENT_EMOJIS[agentId] || '🤖'} ${AGENT_NAMES[agentId] || agentId} - ${sessionId.slice(0, 8)}`,
    agent: agentId,
    agentName: AGENT_NAMES[agentId] || agentId,
    messages: messages.slice(-5), // Últimos 5 mensajes
    status: hasError ? 'error' : 'active',
    lastSeenAt: lastTimestamp?.toISOString() || firstTimestamp.toISOString(),
    lastMessage: lastMessage.substring(0, 100)
  };
}

async function discoverSessions() {
  const sessions = [];
  try {
    for (const agentId of await fs.readdir(OPENCLAW_DIR)) {
      const sessionsDir = path.join(OPENCLAW_DIR, agentId, 'sessions');
      try {
        const files = await fs.readdir(sessionsDir);
        for (const file of files.filter(f => f.endsWith('.jsonl'))) {
          sessions.push({ agentId, filePath: path.join(sessionsDir, file) });
        }
      } catch (e) {}
    }
  } catch (e) {}
  return sessions;
}

// GET /api/inbox - Listar threads/sesiones
router.get('/', async (req, res) => {
  try {
    const sessions = await discoverSessions();
    const threads = [];
    
    // Procesar últimas 20 sesiones (más recientes primero)
    const sortedSessions = sessions.sort((a, b) => b.mtime - a.mtime).slice(0, 20);
    
    for (const s of sortedSessions) {
      const thread = await parseSessionForInbox(s.filePath, s.agentId);
      if (thread) threads.push(thread);
    }
    
    res.json({ threads, messages: [] });
  } catch (err) {
    console.error('Inbox error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inbox/:id/reply - Simular respuesta
router.post('/:id/reply', async (req, res) => {
  res.json({ success: true, message: 'Reply sent (simulated)' });
});

// POST /api/inbox/:id/ping - Ping a agente
router.post('/:id/ping', async (req, res) => {
  res.json({ success: true, message: 'Ping sent' });
});

export default router;
