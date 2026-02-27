import express from 'express';
import { Op } from 'sequelize';

const router = express.Router();

// GET /api/scheduler/tasks - Lista de tareas
router.get('/tasks', async (req, res) => {
  try {
    const { ScheduledTask } = req.app.get('models');
    const { status, agent, limit = 50, offset = 0 } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (agent) where.agent = agent;
    
    const tasks = await ScheduledTask.findAll({
      where,
      order: [['scheduledAt', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({ tasks });
  } catch (error) {
    console.error('Scheduler tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/scheduler/calendar - Eventos para calendario
router.get('/calendar', async (req, res) => {
  try {
    const { ScheduledTask } = req.app.get('models');
    const { month, year } = req.query;
    
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    // Calculate date range for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    
    const tasks = await ScheduledTask.findAll({
      where: {
        scheduledAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      order: [['scheduledAt', 'ASC']]
    });
    
    // Transform to calendar events format
    const events = tasks.map(task => ({
      id: task.id,
      title: task.name,
      date: task.scheduledAt.toISOString().split('T')[0],
      time: task.scheduledAt.toTimeString().substring(0, 5),
      agent: task.agent,
      status: task.status,
      recurrence: task.recurrence,
      description: task.description
    }));
    
    res.json({ 
      month: targetMonth,
      year: targetYear,
      events 
    });
  } catch (error) {
    console.error('Scheduler calendar error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// POST /api/scheduler/tasks - Crear nueva tarea
router.post('/tasks', async (req, res) => {
  try {
    const { ScheduledTask } = req.app.get('models');
    const { name, agent, scheduledAt, recurrence = 'once', description, metadata = {} } = req.body;
    
    if (!name || !scheduledAt) {
      return res.status(400).json({ error: 'Name and scheduledAt are required' });
    }
    
    const task = await ScheduledTask.create({
      name,
      agent,
      scheduledAt: new Date(scheduledAt),
      recurrence,
      status: 'scheduled',
      description,
      metadata
    });
    
    res.status(201).json({ task });
  } catch (error) {
    console.error('Scheduler create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/scheduler/tasks/:id - Actualizar tarea
router.put('/tasks/:id', async (req, res) => {
  try {
    const { ScheduledTask } = req.app.get('models');
    const { id } = req.params;
    const { name, agent, scheduledAt, recurrence, status, description, metadata } = req.body;
    
    const task = await ScheduledTask.findByPk(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Update fields if provided
    if (name !== undefined) task.name = name;
    if (agent !== undefined) task.agent = agent;
    if (scheduledAt !== undefined) task.scheduledAt = new Date(scheduledAt);
    if (recurrence !== undefined) task.recurrence = recurrence;
    if (status !== undefined) task.status = status;
    if (description !== undefined) task.description = description;
    if (metadata !== undefined) task.metadata = { ...task.metadata, ...metadata };
    
    await task.save();
    
    res.json({ task });
  } catch (error) {
    console.error('Scheduler update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/scheduler/tasks/:id - Eliminar tarea
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { ScheduledTask } = req.app.get('models');
    const { id } = req.params;
    
    const task = await ScheduledTask.findByPk(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    await task.destroy();
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('Scheduler delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// GET /api/scheduler/stats - Stats para el dashboard
router.get('/stats', async (req, res) => {
  try {
    const { ScheduledTask } = req.app.get('models');
    
    const total = await ScheduledTask.count();
    const scheduled = await ScheduledTask.count({ where: { status: 'scheduled' } });
    const running = await ScheduledTask.count({ where: { status: 'running' } });
    const completed = await ScheduledTask.count({ where: { status: 'completed' } });
    
    // Get upcoming tasks (next 24 hours)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const upcoming = await ScheduledTask.count({
      where: {
        status: 'scheduled',
        scheduledAt: { [Op.lte]: tomorrow }
      }
    });
    
    res.json({
      total,
      scheduled,
      running,
      completed,
      upcoming
    });
  } catch (error) {
    console.error('Scheduler stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});


// GET /api/scheduler - Listar tareas programadas (alias de /tasks)
router.get("/", async (req, res) => {
  try {
    const { ScheduledTask } = req.app.get("models");
    const tasks = await ScheduledTask.findAll({
      order: [["scheduledAt", "ASC"]],
      limit: 100
    });
    res.json(tasks);
  } catch (error) {
    console.error("Scheduler GET error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
