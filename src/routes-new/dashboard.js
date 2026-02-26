import express from 'express';

const router = express.Router();

// Mock agents data - in production, this would come from the database
const agents = [
  { id: 'main', name: 'Jarvis', status: 'online', model: 'MiniMax-M2.5-highspeed', lastActive: new Date() },
  { id: 'coder', name: 'Coder', status: 'online', model: 'kimi-coding/k2p5', lastActive: new Date() },
  { id: 'writer', name: 'Writer', status: 'idle', model: 'openai-codex/gpt-5.3-codex', lastActive: new Date(Date.now() - 3600000) },
  { id: 'researcher', name: 'Researcher', status: 'offline', model: 'google-gemini-cli/gemini-2.5-pro', lastActive: new Date(Date.now() - 7200000) },
  { id: 'raider', name: 'Raider', status: 'online', model: 'anthropic/claude-opus-4-6', lastActive: new Date() },
  { id: 'clawma', name: 'Clawma', status: 'idle', model: 'zai/glm-5', lastActive: new Date(Date.now() - 1800000) }
];

// GET /api/dashboard/overview - Stats globales
router.get('/overview', async (req, res) => {
  try {
    const { Mission, Activity } = req.app.get('models');
    
    // Get mission stats
    const missionStats = await Mission.findAll({
      attributes: [
        'status',
        [Mission.sequelize.fn('COUNT', Mission.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const totalMissions = missionStats.reduce((acc, s) => acc + parseInt(s.count), 0);
    const completedMissions = missionStats.find(s => s.status === 'completed')?.count || 0;
    const inProgressMissions = missionStats.find(s => s.status === 'in_progress')?.count || 0;

    // Get activity count (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivities = await Activity.count({
      where: {
        timestamp: { [Mission.sequelize.Op.gte]: yesterday }
      }
    });

    // Agent stats
    const onlineAgents = agents.filter(a => a.status === 'online').length;
    const idleAgents = agents.filter(a => a.status === 'idle').length;

    res.json({
      missions: {
        total: totalMissions,
        completed: parseInt(completedMissions),
        inProgress: parseInt(inProgressMissions),
        pending: totalMissions - parseInt(completedMissions) - parseInt(inProgressMissions)
      },
      agents: {
        total: agents.length,
        online: onlineAgents,
        idle: idleAgents,
        offline: agents.length - onlineAgents - idleAgents
      },
      activity: {
        last24h: recentActivities
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    // Return mock data if DB not available
    res.json({
      missions: { total: 0, completed: 0, inProgress: 0, pending: 0 },
      agents: { total: 6, online: 3, idle: 2, offline: 1 },
      activity: { last24h: 0 },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
