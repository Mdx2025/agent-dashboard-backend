import { Op } from 'sequelize';

export async function syncRunsToMissions(sequelize) {
  const { Run, Mission, Activity, Agent } = sequelize.models;
  
  if (!Run || !Mission) {
    console.log('⚠️ Run or Mission model not available, skipping sync');
    return;
  }
  
  // Buscar runs que no tengan mission asociada
  const runs = await Run.findAll({
    where: {
      status: { [Op.in]: ['finished', 'failed', 'stopped'] },
      // Runs de últimos 7 días
      startedAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    order: [['startedAt', 'DESC']],
    limit: 100
  });
  
  let synced = 0;
  
  for (const run of runs) {
    const missionId = `run_${run.id}`;
    
    // Verificar si ya existe mission para este run
    const existing = await Mission.findByPk(missionId);
    if (existing) continue;
    
    // Crear mission desde run
    await Mission.create({
      id: missionId,
      title: run.label || `Task: ${run.agentId}`,
      agentId: run.agentId,
      status: mapRunStatus(run.status),
      progress: calculateProgress(run.status),
      priority: inferPriority(run),
      dueDate: run.finishedAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      description: `Run from ${run.agentId} using ${run.model}`,
      metadata: {
        source: 'openclaw_run',
        runId: run.id,
        tokensIn: run.tokensIn,
        tokensOut: run.tokensOut,
        cost: run.cost,
        duration: run.duration
      }
    });
    
    // Crear activity entry
    await Activity.create({
      agentId: run.agentId,
      type: 'run',
      message: `Run ${run.status}: ${run.label || 'unnamed'}`,
      timestamp: run.finishedAt || run.startedAt,
      metadata: {
        runId: run.id,
        tokensIn: run.tokensIn,
        tokensOut: run.tokensOut,
        cost: run.cost
      }
    });
    
    synced++;
  }
  
  console.log(`✅ Synced ${synced} runs to missions`);
}

function mapRunStatus(runStatus) {
  const map = {
    'queued': 'pending',
    'running': 'in_progress',
    'finished': 'completed',
    'failed': 'failed',
    'stopped': 'cancelled'
  };
  return map[runStatus] || 'pending';
}

function calculateProgress(status) {
  if (status === 'finished') return 100;
  if (status === 'failed') return 0;
  if (status === 'running') return 50;
  if (status === 'stopped') return 75;
  return 0;
}

function inferPriority(run) {
  if (['main', 'coder', 'reasoning'].includes(run.agentId)) return 'high';
  if ((run.tokensIn + run.tokensOut) > 10000) return 'high';
  if (run.cost > 0.5) return 'high';
  return 'medium';
}
