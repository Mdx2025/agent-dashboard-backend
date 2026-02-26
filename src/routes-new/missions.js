import { Router } from 'express';
import { Op } from 'sequelize';
import { Mission, MissionStep, Agent } from '../models/index.js';
import { getIO } from '../websocket/index.js';

const router = Router();

// GET /api/missions - List all missions
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.agentId) where.agentId = req.query.agentId;
    if (req.query.priority) where.priority = req.query.priority;

    const missions = await Mission.findAll({
      where,
      include: [
        { model: MissionStep, as: 'steps', order: [['order', 'ASC']] },
        { model: Agent, as: 'agent', attributes: ['id', 'name', 'emoji', 'status'] }
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: MissionStep, as: 'steps' }, 'order', 'ASC']
      ]
    });

    const result = missions.map(m => ({
      id: m.id,
      title: m.title,
      agentId: m.agentId,
      agentName: m.agent?.name || null,
      agentEmoji: m.agent?.emoji || '🤖',
      status: m.status,
      progress: m.progress,
      priority: m.priority,
      dueDate: m.dueDate,
      steps: (m.steps || []).map(s => ({
        id: s.id,
        name: s.name,
        order: s.order,
        done: s.done,
        current: s.current
      })),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /api/missions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/missions/:id - Get single mission with steps
router.get('/:id', async (req, res) => {
  try {
    const mission = await Mission.findByPk(req.params.id, {
      include: [
        { model: MissionStep, as: 'steps', order: [['order', 'ASC']] },
        { model: Agent, as: 'agent', attributes: ['id', 'name', 'emoji', 'status'] }
      ],
      order: [
        [{ model: MissionStep, as: 'steps' }, 'order', 'ASC']
      ]
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    res.json({
      id: mission.id,
      title: mission.title,
      agentId: mission.agentId,
      agentName: mission.agent?.name || null,
      agentEmoji: mission.agent?.emoji || '🤖',
      status: mission.status,
      progress: mission.progress,
      priority: mission.priority,
      dueDate: mission.dueDate,
      metadata: mission.metadata,
      steps: (mission.steps || []).map(s => ({
        id: s.id,
        name: s.name,
        order: s.order,
        done: s.done,
        current: s.current
      })),
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt
    });
  } catch (err) {
    console.error('GET /api/missions/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/missions - Create new mission with steps
router.post('/', async (req, res) => {
  try {
    const { title, agentId, priority, dueDate, steps, metadata } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const mission = await Mission.create({
      title,
      agentId: agentId || null,
      priority: priority || 'medium',
      dueDate: dueDate || null,
      metadata: metadata || {},
      status: 'pending',
      progress: 0
    });

    // Create steps if provided
    if (steps && Array.isArray(steps) && steps.length > 0) {
      const stepRecords = steps.map((step, idx) => ({
        missionId: mission.id,
        name: step.name || step,
        order: step.order !== undefined ? step.order : idx,
        done: false,
        current: idx === 0
      }));
      await MissionStep.bulkCreate(stepRecords);
    }

    // Fetch with associations
    const full = await Mission.findByPk(mission.id, {
      include: [
        { model: MissionStep, as: 'steps', order: [['order', 'ASC']] },
        { model: Agent, as: 'agent', attributes: ['id', 'name', 'emoji', 'status'] }
      ],
      order: [
        [{ model: MissionStep, as: 'steps' }, 'order', 'ASC']
      ]
    });

    // Emit WebSocket event
    try {
      const io = getIO();
      if (io) {
        io.emit('mission.create', {
          id: full.id,
          title: full.title,
          agentId: full.agentId,
          status: full.status,
          progress: full.progress,
          priority: full.priority
        });
      }
    } catch (e) { /* ws optional */ }

    res.status(201).json({
      id: full.id,
      title: full.title,
      agentId: full.agentId,
      agentName: full.agent?.name || null,
      status: full.status,
      progress: full.progress,
      priority: full.priority,
      dueDate: full.dueDate,
      steps: (full.steps || []).map(s => ({
        id: s.id,
        name: s.name,
        order: s.order,
        done: s.done,
        current: s.current
      })),
      createdAt: full.createdAt,
      updatedAt: full.updatedAt
    });
  } catch (err) {
    console.error('POST /api/missions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/missions/:id - Update mission
router.patch('/:id', async (req, res) => {
  try {
    const mission = await Mission.findByPk(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const { status, progress, currentStepId, title, priority, dueDate, agentId, metadata } = req.body;

    // Update mission fields
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (progress !== undefined) updates.progress = progress;
    if (title !== undefined) updates.title = title;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (agentId !== undefined) updates.agentId = agentId;
    if (metadata !== undefined) updates.metadata = metadata;

    await mission.update(updates);

    // Handle currentStepId - mark step as current
    if (currentStepId) {
      // Reset all steps' current flag
      await MissionStep.update(
        { current: false },
        { where: { missionId: mission.id } }
      );
      // Mark the specified step as current and done for all previous
      const currentStep = await MissionStep.findByPk(currentStepId);
      if (currentStep) {
        await currentStep.update({ current: true });
        // Mark all steps before this one as done
        await MissionStep.update(
          { done: true, current: false },
          { where: { missionId: mission.id, order: { [Op.lt]: currentStep.order } } }
        );
      }
    }

    // Fetch updated mission
    const full = await Mission.findByPk(mission.id, {
      include: [
        { model: MissionStep, as: 'steps', order: [['order', 'ASC']] },
        { model: Agent, as: 'agent', attributes: ['id', 'name', 'emoji', 'status'] }
      ],
      order: [
        [{ model: MissionStep, as: 'steps' }, 'order', 'ASC']
      ]
    });

    // Emit WebSocket event
    try {
      const io = getIO();
      if (io) {
        io.emit('mission.update', {
          id: full.id,
          title: full.title,
          agentId: full.agentId,
          status: full.status,
          progress: full.progress,
          priority: full.priority
        });
      }
    } catch (e) { /* ws optional */ }

    res.json({
      id: full.id,
      title: full.title,
      agentId: full.agentId,
      agentName: full.agent?.name || null,
      status: full.status,
      progress: full.progress,
      priority: full.priority,
      dueDate: full.dueDate,
      steps: (full.steps || []).map(s => ({
        id: s.id,
        name: s.name,
        order: s.order,
        done: s.done,
        current: s.current
      })),
      createdAt: full.createdAt,
      updatedAt: full.updatedAt
    });
  } catch (err) {
    console.error('PATCH /api/missions/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/missions/:id - Delete mission and its steps
router.delete('/:id', async (req, res) => {
  try {
    const mission = await Mission.findByPk(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    await MissionStep.destroy({ where: { missionId: mission.id } });
    await mission.destroy();

    // Emit WebSocket event
    try {
      const io = getIO();
      if (io) {
        io.emit('mission.delete', { id: req.params.id });
      }
    } catch (e) { /* ws optional */ }

    res.json({ ok: true, deleted: req.params.id });
  } catch (err) {
    console.error('DELETE /api/missions/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
