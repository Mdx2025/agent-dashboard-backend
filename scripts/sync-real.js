#!/usr/bin/env node
/**
 * Sync REAL OpenClaw data to Railway Dashboard
 * Runs every 5 minutes via cron
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BACKEND_URL = 'https://agent-dashboard-backend-production.up.railway.app';
const AGENTS_DIR = '/home/clawd/.openclaw/agents';
const MAX_RUN_AGE_HOURS = 24;

/**
 * Extract runs from session JSONL files
 */
function extractRunsFromSessions() {
  const runs = [];
  const agents = fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const agent of agents) {
    const sessionsDir = path.join(AGENTS_DIR, agent, 'sessions');
    if (!fs.existsSync(sessionsDir)) continue;

    const sessionFiles = fs.readdirSync(sessionsDir)
      .filter(f => f.endsWith('.jsonl'));

    for (const file of sessionFiles) {
      const filePath = path.join(sessionsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      let sessionStart = null;
      let lastMessageTime = null;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);

          // Track session start
          if (entry.type === 'session') {
            sessionStart = new Date(entry.timestamp).getTime();
          }

          // Extract assistant messages as "runs"
          if (entry.type === 'message' && entry.message?.role === 'assistant') {
            const msg = entry.message;
            const usage = msg.usage || {};
            const timestamp = new Date(entry.timestamp).getTime();
            
            // Calculate duration from previous message or session start
            const duration = lastMessageTime 
              ? timestamp - lastMessageTime 
              : (sessionStart ? timestamp - sessionStart : 0);

            // Determine run source
            let source = 'MAIN';
            if (agent.includes('heartbeat')) source = 'CRON';
            else if (entry.parentId && lines.some(l => JSON.parse(l).customType === 'subagent')) {
              source = 'SUBAGENT';
            }

            // Create run ID from timestamp + agent
            const runId = `run_${agent}_${timestamp}`;

            runs.push({
              id: runId,
              source,
              label: extractLabel(msg.content, agent),
              status: msg.stopReason === 'error' ? 'failed' : 'finished',
              startedAt: timestamp - (duration || 0),
              duration: duration || 0,
              model: extractModelName(msg.model || entry.model || 'unknown'),
              contextPct: calculateContextPercent(usage),
              tokensIn: usage.input || usage.totalTokens || 0,
              tokensOut: usage.output || 0,
              finishReason: mapFinishReason(msg.stopReason),
              agent: agent,
            });

            lastMessageTime = timestamp;
          }
        } catch (e) {
          // Skip malformed lines
        }
      }
    }
  }

  return runs;
}

/**
 * Extract label from message content
 */
function extractLabel(content, agent) {
  if (Array.isArray(content)) {
    const text = content.find(c => c.type === 'text')?.text || '';
    const firstLine = text.split('\n')[0];
    // Take first 50 chars, remove markdown and escape quotes
    return firstLine.substring(0, 50)
      .replace(/[*_`#\n\r\t"]/g, ' ')
      .replace(/\\/g, '')
      .trim() || `${agent} task`;
  }
  return `${agent} task`;
}

/**
 * Extract clean model name
 */
function extractModelName(fullModel) {
  if (!fullModel) return 'unknown';
  // Remove provider prefix: "minimax-portal/MiniMax-M2.5" -> "MiniMax-M2.5"
  return fullModel.split('/').pop().split(':')[0];
}

/**
 * Calculate context percentage
 */
function calculateContextPercent(usage) {
  if (!usage || !usage.input) return 0;
  // Assume 128k context window
  const contextWindow = 128000;
  return Math.min(Math.round((usage.input / contextWindow) * 100), 100);
}

/**
 * Map finish reason to enum
 */
function mapFinishReason(reason) {
  const valid = ['stop', 'tool_calls', 'error', 'length'];
  return valid.includes(reason) ? reason : 'stop';
}

/**
 * Extract real sessions
 */
function extractSessions() {
  const sessions = [];
  const agents = fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const agent of agents) {
    const sessionsFile = path.join(AGENTS_DIR, agent, 'sessions', 'sessions.json');
    if (!fs.existsSync(sessionsFile)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
      const sessionList = Object.values(data);

      for (const sess of sessionList.slice(0, 20)) { // Limit to 20 per agent
        sessions.push({
          id: sess.sessionId || sess.id,
          status: sess.endedAt ? 'idle' : 'active',
          agent: agent,
          agentName: agent,
          model: extractModelName(sess.model || 'unknown'),
          tokens24h: sess.totalTokens || sess.inputTokens || 0,
          startedAt: sess.startedAt || sess.createdAt || Date.now(),
          lastSeenAt: sess.updatedAt || sess.lastSeenAt || Date.now(),
        });
      }
    } catch (e) {
      // Skip invalid files
    }
  }

  return sessions;
}

/**
 * Sync to backend
 */
async function syncToBackend(runs, sessions) {
  // Sanitize all string fields
  const sanitize = (obj) => {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Escape special chars and limit length
        clean[key] = value
          .substring(0, 100)
          .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
          .replace(/[\\"]/g, ' ') // Escape quotes and backslashes
          .trim();
      } else if (value !== null && value !== undefined) {
        clean[key] = value;
      }
    }
    return clean;
  };

  const payload = {
    runs: runs.map(sanitize),
    sessions: sessions.map(sanitize)
  };

  // Validate JSON
  try {
    JSON.stringify(payload);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(`${BACKEND_URL}/api/sync`);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ status: 'ok', message: body });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Main
 */
async function main() {
  console.log('🔄 Syncing REAL OpenClaw data...');
  console.log(`Time: ${new Date().toISOString()}`);

  // Extract real data
  const runs = extractRunsFromSessions();
  const sessions = extractSessions();

  console.log(`Extracted: ${runs.length} runs, ${sessions.length} sessions`);

  // Filter old runs (keep last 24h) and sort by most recent
  const cutoff = Date.now() - (MAX_RUN_AGE_HOURS * 3600000);
  const recentRuns = runs
    .filter(r => r.startedAt > cutoff)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 50); // Limit to 50 most recent
  console.log(`Recent runs (last ${MAX_RUN_AGE_HOURS}h): ${recentRuns.length}`);

  // Sync to backend
  try {
    const result = await syncToBackend(recentRuns, sessions.slice(0, 50));
    console.log('✅ Sync completed:', result);
    console.log(`Synced: ${recentRuns.length} runs, ${Math.min(sessions.length, 50)} sessions`);
  } catch (e) {
    console.error('❌ Sync failed:', e.message);
    process.exit(1);
  }
}

main();
