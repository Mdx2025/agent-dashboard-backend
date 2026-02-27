import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import { Op } from 'sequelize';

const router = Router();
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

router.post('/admin/etl', async (req, res) => {
  try {
    const { sequelize } = req.app.get('sequelize') || require('../index.js');
    const { Session, Run, Mission } = sequelize.models;
    
    console.log('🚀 ETL iniciado via API');
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

    res.json({ success: true, processed: count, totalSessions: sessions.length });
  } catch (err) {
    console.error('ETL error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
