import express from 'express';
import { Op } from 'sequelize';

const router = express.Router();

// GET /api/brainx/stats - Stats para el dashboard
router.get('/stats', async (req, res) => {
  try {
    const { BrainXMemory, sequelize } = req.app.get('models');
    
    // Get counts
    const embeddings = await BrainXMemory.count();
    
    // Get unique workspaces
    const workspaces = await BrainXMemory.aggregate('workspace', 'count', {
      distinct: true,
      where: { workspace: { [Op.ne]: null } }
    });
    
    // Get database size (PostgreSQL specific)
    let dbSize = 'Unknown';
    try {
      const [result] = await sequelize.query(
        "SELECT pg_size_pretty(pg_database_size(current_database())) as size"
      );
      dbSize = result[0]?.size || 'Unknown';
    } catch (e) {
      console.log('Could not get DB size:', e.message);
    }
    
    // Get queued pruning count (memories older than 30 days without access)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const queuedPruning = await BrainXMemory.count({
      where: {
        updatedAt: { [Op.lt]: thirtyDaysAgo }
      }
    });
    
    // Calculate average query latency (mock - would be real metrics in production)
    const latency = Math.floor(Math.random() * 100) + 150; // 150-250ms
    
    res.json({
      embeddings,
      workspaces: workspaces || 1,
      dbSize,
      queuedPruning,
      latency: `${latency}ms`,
      status: 'online'
    });
  } catch (error) {
    console.error('BrainX stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/brainx/search?q=query - Búsqueda semántica
router.get('/search', async (req, res) => {
  try {
    const { BrainXMemory } = req.app.get('models');
    const { q: query, workspace, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const where = {};
    if (workspace) where.workspace = workspace;
    
    // Simple text search (in production would use vector similarity with embeddings)
    const memories = await BrainXMemory.findAll({
      where: {
        ...where,
        content: { [Op.iLike]: `%${query}%` }
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit) * 2 // Get more to filter by relevance
    });
    
    // Transform to response format with scores
    const results = memories.map((m, index) => {
      const contentLower = m.content.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // Simple relevance scoring
      let score = 0.5;
      if (contentLower.includes(queryLower)) score += 0.3;
      if (contentLower.startsWith(queryLower)) score += 0.2;
      
      // Extract title from content (first line or first 50 chars)
      const title = m.content.split('\n')[0].substring(0, 50) || 'Untitled Memory';
      
      // Format date
      const date = m.createdAt ? m.createdAt.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }) : 'Unknown';
      
      return {
        id: m.id,
        title: title.length > 50 ? title.substring(0, 50) + '...' : title,
        content: m.content.substring(0, 200) + (m.content.length > 200 ? '...' : ''),
        score: Math.min(score, 0.99),
        agent: m.metadata?.agent || '🛠 Developer',
        date,
        badge: m.workspace ? m.workspace.toUpperCase() : 'WORKSPACE'
      };
    });
    
    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    
    res.json({ results: results.slice(0, parseInt(limit)) });
  } catch (error) {
    console.error('BrainX search error:', error);
    res.status(500).json({ error: 'Failed to search memories' });
  }
});

// POST /api/brainx/inject - Inyectar nueva memoria
router.post('/inject', async (req, res) => {
  try {
    const { BrainXMemory } = req.app.get('models');
    const { content, workspaces = ['default'], category = 'context', metadata = {} } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const memories = [];
    
    // Create memory for each workspace
    for (const workspace of workspaces) {
      const memory = await BrainXMemory.create({
        content,
        workspace,
        embedding: null, // Would use OpenAI to generate embedding in production
        metadata: {
          ...metadata,
          category,
          injectedAt: new Date().toISOString()
        }
      });
      memories.push(memory);
    }
    
    res.status(201).json({
      success: true,
      injected: memories.length,
      memories: memories.map(m => ({ id: m.id, workspace: m.workspace }))
    });
  } catch (error) {
    console.error('BrainX inject error:', error);
    res.status(500).json({ error: 'Failed to inject memory' });
  }
});

// GET /api/brainx/workspaces - Lista de workspaces con counts
router.get('/workspaces', async (req, res) => {
  try {
    const { BrainXMemory } = req.app.get('models');
    
    const workspaces = await BrainXMemory.findAll({
      attributes: ['workspace', [BrainXMemory.sequelize.fn('COUNT', '*'), 'count']],
      group: ['workspace'],
      order: [['workspace', 'ASC']],
      raw: true
    });
    
    const result = workspaces.map(w => ({
      name: w.workspace || 'default',
      count: parseInt(w.count),
      lastUpdated: new Date().toISOString() // Would be actual last update in production
    }));
    
    res.json({ workspaces: result });
  } catch (error) {
    console.error('BrainX workspaces error:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// GET /api/brainx/insights - Query insights
router.get('/insights', async (req, res) => {
  try {
    const { BrainXMemory } = req.app.get('models');
    
    const totalMemories = await BrainXMemory.count();
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentCount = await BrainXMemory.count({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } }
    });
    
    // Get top workspaces
    const workspaceStats = await BrainXMemory.findAll({
      attributes: ['workspace', [BrainXMemory.sequelize.fn('COUNT', '*'), 'count']],
      group: ['workspace'],
      order: [[BrainXMemory.sequelize.fn('COUNT', '*'), 'DESC']],
      limit: 5,
      raw: true
    });
    
    // Mock query patterns (would be real analytics in production)
    const queryPatterns = [
      { pattern: 'deployment', count: Math.floor(Math.random() * 50) + 20 },
      { pattern: 'database', count: Math.floor(Math.random() * 40) + 15 },
      { pattern: 'api', count: Math.floor(Math.random() * 35) + 10 },
      { pattern: 'frontend', count: Math.floor(Math.random() * 30) + 10 },
      { pattern: 'config', count: Math.floor(Math.random() * 25) + 5 }
    ];
    
    res.json({
      totalMemories,
      recentAdditions: recentCount,
      topWorkspaces: workspaceStats.map(w => ({
        name: w.workspace || 'default',
        count: parseInt(w.count)
      })),
      queryPatterns,
      cacheHitRate: `${Math.floor(Math.random() * 20) + 75}%`, // 75-95%
      avgQueryTime: `${Math.floor(Math.random() * 100) + 150}ms`
    });
  } catch (error) {
    console.error('BrainX insights error:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// GET /api/brainx - Lista memorias (existing endpoint)
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

// GET /api/brainx/:id - Detalle memoria (existing endpoint)
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

// DELETE /api/brainx/:id - Eliminar memoria (existing endpoint)
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

export default router;
