import express from 'express';

const router = express.Router();

// GET /api/brainx - Lista memorias
router.get('/', async (req, res) => {
  try {
    const { BrainXMemory } = req.app.get('models');
    const { workspace, limit = 50, offset = 0 } = req.query;
    
    const where = {};
    if (workspace) where.workspace = workspace;

    const memories = await BrainXMemory.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(memories);
  } catch (error) {
    console.error('Get brainx memories error:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// GET /api/brainx/:id - Detalle memoria
router.get('/:id', async (req, res) => {
  try {
    const { BrainXMemory } = req.app.get('models');
    const { id } = req.params;
    
    const memory = await BrainXMemory.findByPk(id);

    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json(memory);
  } catch (error) {
    console.error('Get brainx memory error:', error);
    res.status(500).json({ error: 'Failed to fetch memory' });
  }
});

// POST /api/brainx - Crear memoria
router.post('/', async (req, res) => {
  try {
    const { BrainXMemory } = req.app.get('models');
    const { content, workspace, metadata } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const memory = await BrainXMemory.create({
      content,
      workspace: workspace || 'default',
      embedding: null, // Would use OpenAI to generate embedding in production
      metadata: metadata || {}
    });

    res.status(201).json(memory);
  } catch (error) {
    console.error('Create brainx memory error:', error);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

// DELETE /api/brainx/:id - Eliminar memoria
router.delete('/:id', async (req, res) => {
  try {
    const { BrainXMemory } = req.app.get('models');
    const { id } = req.params;
    
    const memory = await BrainXMemory.findByPk(id);
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    await memory.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete brainx memory error:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// POST /api/brainx/search - Buscar memorias (simulated - would use vector similarity in production)
router.post('/search', async (req, res) => {
  try {
    const { BrainXMemory } = req.app.get('models');
    const { query, workspace, limit = 10 } = req.body;
    
    // Simple text search (in production, would use vector similarity with embeddings)
    const where = {};
    if (workspace) where.workspace = workspace;
    
    const memories = await BrainXMemory.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Filter by content match (simple implementation)
    const results = query 
      ? memories.filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
      : memories;

    res.json(results.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Search brainx memory error:', error);
    res.status(500).json({ error: 'Failed to search memories' });
  }
});

export default router;
