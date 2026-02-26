import { Router } from 'express';
import { Op } from 'sequelize';
import { Activity, Agent } from '../models/index.js';
import { getIO } from '../websocket/index.js';

const router = Router();

// GET /api/activity - Get activity feed
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const where = {};

    // Filter by agent
    if (req.query.agent) {
      where[Op.or] = [
        { agentId: req.query.agent },
        { agentName: req.query.agent }
      ];
    }

    // Filter by type
    if (req.query.type) {
      where.type = req.query.type;
    }

    // Filter by date range
    if (req.query.since) {
      where.createdAt = { [Op.gte]: new Date(req.query.since) };
    }

    const activities = await Activity.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const result = activities.map(a => ({
      id: a.id,
      agentId: a.agentId,
      agentName: a.agentName,
      emoji: a.emoji,
      type: a.type,
      action: a.action,
      details: a.details,
      timestamp: a.createdAt,
      tokens: a.tokens,
      metadata: a.metadata
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /api/activity error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/activity - Create activity entry
router.post('/', async (req, res) => {
  try {
    const { agentId, agentName, emoji, type, action, details, tokens, metadata } = req.body;

    if (!agentId || !action) {
      return res.status(400).json({ error: 'agentId and action are required' });
    }

    // Auto-resolve agentName from Agent model if not provided
    let resolvedName = agentName;
    if (!resolvedName) {
      const agent = await Agent.findByPk(agentId);
      resolvedName = agent?.name || agentId;
    }

    const activity = await Activity.create({
      agentId,
      agentName: resolvedName,
      emoji: emoji || '🤖',
      type: type || 'info',
      action,
      details: details || null,
      tokens: tokens || 0,
      metadata: metadata || {}
    });

    const result = {
      id: activity.id,
      agentId: activity.agentId,
      agentName: activity.agentName,
      emoji: activity.emoji,
      type: activity.type,
      action: activity.action,
      details: activity.details,
      timestamp: activity.createdAt,
      tokens: activity.tokens,
      metadata: activity.metadata
    };

    // Emit WebSocket event
    try {
      const io = getIO();
      if (io) {
        io.emit('activity.new', result);
      }
    } catch (e) { /* ws optional */ }

    res.status(201).json(result);
  } catch (err) {
    console.error('POST /api/activity error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
