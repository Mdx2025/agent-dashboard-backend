#!/usr/bin/env node
/**
 * ETL Pipeline: OpenClaw JSONL → PostgreSQL
 * Extrae datos históricos de sesiones OpenClaw y los carga en el dashboard
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Sequelize, Op } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const OPENCLAW_DIR = path.join(process.env.HOME || '/home/clawd', '.openclaw', 'agents');
const BATCH_SIZE = 50;
const DRY_RUN = process.env.DRY_RUN === 'true';

// Inicializar Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: DRY_RUN ? console.log : false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
  }
});

// Modelos
const Run = sequelize.define('Run', {
  id: { type: Sequelize.STRING, primaryKey: true },
  session_id: { type: Sequelize.STRING, allowNull: false },
  agent_id: { type: Sequelize.STRING, allowNull: false },
  label: { type: Sequelize.STRING },
  status: { type: Sequelize.ENUM('queued', 'running', 'finished', 'failed', 'stopped') },
  started_at: { type: Sequelize.DATE },
  finished_at: { type: Sequelize.DATE },
  duration: { type: Sequelize.INTEGER },
  model: { type: Sequelize.STRING },
  tokens_in: { type: Sequelize.INTEGER, defaultValue: 0 },
  tokens_out: { type: Sequelize.INTEGER, defaultValue: 0 },
  cost: { type: Sequelize.FLOAT, defaultValue: 0 },
  context_pct: { type: Sequelize.FLOAT, defaultValue: 0 },
  metadata: { type: Sequelize.JSONB, defaultValue: {} }
}, { tableName: 'runs', timestamps: false, underscored: true });

const Session = sequelize.define('Session', {
  id: { type: Sequelize.STRING, primaryKey: true },
  agent_id: { type: Sequelize.STRING, allowNull: false },
  status: { type: Sequelize.ENUM('active', 'idle', 'closed') },
  started_at: { type: Sequelize.DATE },
  last_activity_at: { type: Sequelize.DATE },
  total_tokens: { type: Sequelize.INTEGER, defaultValue: 0 },
  metadata: { type: Sequelize.JSONB, defaultValue: {} }
}, { tableName: 'sessions', timestamps: false, underscored: true });

const LogEntry = sequelize.define('LogEntry', {
  id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  run_id: { type: Sequelize.STRING, allowNull: false },
  level: { type: Sequelize.ENUM('info', 'warn', 'error', 'debug') },
  message: { type: Sequelize.TEXT },
  timestamp: { type: Sequelize.DATE },
  metadata: { type: Sequelize.JSONB, defaultValue: {} }
}, { tableName: 'log_entries', timestamps: false, underscored: true });

class SessionData {
  constructor() {
    this.id = null;
    this.agentId = null;
    this.status = 'closed';
    this.startedAt = null;
    this.lastActivityAt = null;
    this.totalTokens = 0;
    this.messages = [];
    this.model = null;
    this.cost = 0;
    this.duration = 0;
  }
}

async function parseJsonlFile(filePath, agentId) {
  const sessionData = new SessionData();
  sessionData.agentId = agentId;
  sessionData.id = path.basename(filePath, '.jsonl');

  const stats = await fs.stat(filePath).catch(() => null);
  if (!stats || stats.size === 0) return null;

  const fileStream = createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let firstTimestamp = null, lastTimestamp = null;
  let totalPromptTokens = 0, totalCompletionTokens = 0;
  let models = new Set(), hasError = false;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;
      if (timestamp && !isNaN(timestamp)) {
        if (!firstTimestamp) firstTimestamp = timestamp;
        lastTimestamp = timestamp;
      }
      if (entry.type === 'error' || entry.payload?.error) hasError = true;
      if (entry.type === 'response' && entry.payload?.usage) {
        totalPromptTokens += entry.payload.usage.prompt_tokens || 0;
        totalCompletionTokens += entry.payload.usage.completion_tokens || 0;
        if (entry.payload.model) models.add(entry.payload.model);
      }
      if (entry.type === 'system') {
        if (entry.payload?.cost) sessionData.cost += entry.payload.cost;
        if (entry.payload?.duration) sessionData.duration += entry.payload.duration;
      }
      sessionData.messages.push({ type: entry.type, timestamp: entry.timestamp, model: entry.payload?.model });
    } catch (err) {}
  }

  if (!firstTimestamp) return null;
  sessionData.startedAt = firstTimestamp;
  sessionData.lastActivityAt = lastTimestamp || firstTimestamp;
  sessionData.totalTokens = totalPromptTokens + totalCompletionTokens;
  sessionData.model = Array.from(models)[0] || 'unknown';
  sessionData.status = hasError ? 'failed' : 'closed';
  if (!sessionData.duration && firstTimestamp && lastTimestamp) {
    sessionData.duration = lastTimestamp - firstTimestamp;
  }
  return sessionData;
}

async function discoverSessions() {
  const sessions = [];
  try {
    const agentDirs = await fs.readdir(OPENCLAW_DIR);
    for (const agentId of agentDirs) {
      const agentPath = path.join(OPENCLAW_DIR, agentId, 'sessions');
      try {
        const files = await fs.readdir(agentPath);
        for (const file of files.filter(f => f.endsWith('.jsonl'))) {
          sessions.push({ agentId, filePath: path.join(agentPath, file), sessionId: path.basename(file, '.jsonl') });
        }
      } catch (err) {}
    }
  } catch (err) {
    console.error('❌ Error leyendo directorio OpenClaw:', err);
    throw err;
  }
  return sessions;
}

function transformToModels(sessionData) {
  const runId = 'run_' + sessionData.id;
  const session = {
    id: sessionData.id, agent_id: sessionData.agentId, status: sessionData.status,
    started_at: sessionData.startedAt, last_activity_at: sessionData.lastActivityAt,
    total_tokens: sessionData.totalTokens,
    metadata: { messageCount: sessionData.messages.length, models: [...new Set(sessionData.messages.filter(m => m.model).map(m => m.model))] }
  };
  const run = {
    id: runId, session_id: sessionData.id, agent_id: sessionData.agentId,
    label: sessionData.agentId + ': ' + sessionData.id.slice(0, 8) + '...',
    status: sessionData.status === 'failed' ? 'failed' : 'finished',
    started_at: sessionData.startedAt, finished_at: sessionData.lastActivityAt,
    duration: sessionData.duration, model: sessionData.model,
    tokens_in: Math.floor(sessionData.messages.filter(m => m.type === 'request').length * 150),
    tokens_out: sessionData.totalTokens, cost: sessionData.cost, context_pct: 0,
    metadata: { source: 'openclaw_etl', messageCount: sessionData.messages.length }
  };
  const logEntries = sessionData.messages.slice(0, 5).map((msg, idx) => ({
    run_id: runId, level: msg.type === 'error' ? 'error' : 'info',
    message: msg.type + ': ' + (msg.model || 'no model'),
    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    metadata: { index: idx }
  }));
  return { session, run, logEntries };
}

async function insertBatch(batch) {
  if (DRY_RUN) {
    console.log('   [DRY RUN] Insertaría batch de ' + batch.length + ' registros');
    return true;
  }
  try {
    await sequelize.transaction(async (t) => {
      for (const item of batch) {
        await Session.upsert(item.session, { transaction: t });
        await Run.upsert(item.run, { transaction: t });
        if (item.logEntries.length > 0) {
          await LogEntry.bulkCreate(item.logEntries, { transaction: t, ignoreDuplicates: true });
        }
      }
    });
    return true;
  } catch (err) {
    console.error('❌ Error en batch:', err.message);
    return false;
  }
}

async function syncRunsToMissions() {
  if (DRY_RUN) {
    console.log('   [DRY RUN] Sincronizaría runs a missions');
    return;
  }
  const Mission = sequelize.define('Mission', {
    id: { type: Sequelize.STRING, primaryKey: true }, title: { type: Sequelize.STRING },
    agent_id: { type: Sequelize.STRING }, status: { type: Sequelize.STRING },
    progress: { type: Sequelize.INTEGER }, priority: { type: Sequelize.STRING },
    due_date: { type: Sequelize.DATE }, description: { type: Sequelize.TEXT },
    metadata: { type: Sequelize.JSONB, defaultValue: {} }
  }, { tableName: 'missions', timestamps: true, underscored: true });

  const Activity = sequelize.define('Activity', {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    agent_id: { type: Sequelize.STRING }, type: { type: Sequelize.STRING },
    message: { type: Sequelize.TEXT }, timestamp: { type: Sequelize.DATE },
    metadata: { type: Sequelize.JSONB, defaultValue: {} }
  }, { tableName: 'activities', timestamps: true, underscored: true });

  const runs = await Run.findAll({ where: { status: { [Op.in]: ['finished', 'failed'] } }, order: [['started_at', 'DESC']], limit: 500 });
  for (const run of runs) {
    const missionId = run.id;
    const existing = await Mission.findByPk(missionId);
    if (existing) continue;
    await Mission.create({
      id: missionId, title: run.label || 'Task: ' + run.agent_id,
      agent_id: run.agent_id, status: run.status === 'finished' ? 'completed' : 'failed',
      progress: run.status === 'finished' ? 100 : 0,
      priority: run.tokens_out > 10000 ? 'high' : 'medium',
      due_date: run.finished_at || new Date(),
      description: 'Run from ' + run.agent_id + ' using ' + run.model,
      metadata: { source: 'openclaw_run', runId: run.id, tokensIn: run.tokens_in, tokensOut: run.tokens_out, cost: run.cost }
    });
    await Activity.create({
      agent_id: run.agent_id, type: 'run', message: 'Run ' + run.status + ': ' + (run.label || 'unnamed'),
      timestamp: run.finished_at || run.started_at,
      metadata: { runId: run.id, tokensIn: run.tokens_in, tokensOut: run.tokens_out, cost: run.cost }
    });
  }
  console.log('   ✅ Synced ' + runs.length + ' runs to missions');
}

async function runETL() {
  console.log('🚀 Iniciando ETL Pipeline OpenClaw → PostgreSQL\n');
  console.log('📁 Directorio fuente: ' + OPENCLAW_DIR);
  console.log('🧪 Modo: ' + (DRY_RUN ? 'DRY RUN (sin cambios)' : 'PRODUCCIÓN'));
  await sequelize.authenticate();
  console.log('✅ Database connected\n');

  console.log('1️⃣  Descubriendo sesiones...');
  const sessions = await discoverSessions();
  console.log('   ✅ Encontradas: ' + sessions.length + ' sesiones');

  console.log('\n2️⃣  Procesando archivos JSONL...');
  let processed = 0, errors = 0, skipped = 0;
  const batch = [];

  for (const sessionInfo of sessions) {
    try {
      const sessionData = await parseJsonlFile(sessionInfo.filePath, sessionInfo.agentId);
      if (!sessionData) { skipped++; continue; }
      batch.push(transformToModels(sessionData));
      if (batch.length >= BATCH_SIZE) {
        process.stdout.write('\r   Procesando: ' + (processed + 1) + '/' + sessions.length + ' (errores: ' + errors + ', vacíos: ' + skipped + ')');
        await insertBatch([...batch]);
        batch.length = 0;
      }
      processed++;
    } catch (err) {
      console.error('\n   ❌ Error en ' + sessionInfo.filePath + ':', err.message);
      errors++;
    }
  }
  if (batch.length > 0) await insertBatch(batch);
  console.log('\r   ✅ Procesadas: ' + processed + ' | ❌ Errores: ' + errors + ' | ⏭️ Vacíos: ' + skipped);

  console.log('\n3️⃣  Sincronizando runs a missions...');
  await syncRunsToMissions();

  console.log('\n📊 REPORTE FINAL:');
  const [sessionCount, runCount, logCount] = await Promise.all([Session.count(), Run.count(), LogEntry.count()]);
  console.log('   Sessions:    ' + sessionCount);
  console.log('   Runs:        ' + runCount);
  console.log('   LogEntries:  ' + logCount);

  console.log('\n📈 TOP AGENTES:');
  const agentStats = await Run.findAll({
    attributes: ['agent_id', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'], [Sequelize.fn('SUM', Sequelize.col('tokens_out')), 'total_tokens']],
    group: ['agent_id'], order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']], limit: 8, raw: true
  });
  agentStats.forEach(stat => {
    console.log('   ' + stat.agent_id + ': ' + stat.count + ' runs, ' + (stat.total_tokens || 0) + ' tokens');
  });
  console.log('\n✅ ETL completado exitosamente!');
}

runETL()
  .then(async () => { await sequelize.close(); process.exit(0); })
  .catch(async (err) => { console.error('\n💥 ETL falló:', err); await sequelize.close(); process.exit(1); });
