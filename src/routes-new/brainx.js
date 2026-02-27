import express from 'express';
import { Op } from 'sequelize';

const router = express.Router();

// Helper to get column names based on model config
function getDateColumn(model, column = 'created') {
  // Use underscored column names
  return column === 'created' ? 'created_at' : 'updated_at';
}

// GET /api/brainx/stats - Stats para el dashboard
router.get('/stats', async (req, res) => {
  try {
    const { BrainXMemory, sequelize } = req.app.get('models');
    
    // Get counts
    const embeddings = await BrainXMemory.count();
    
    // Get unique workspaces
    let workspaces = 1;
    try {
      const [result] = await sequelize.query(
        'SELECT COUNT(DISTINCT workspace) as count FROM brainx_memories WHERE workspace IS NOT NULL'
      );
      workspaces = parseInt(result[0]?.count) || 1;
    } catch (e) {
      console.log('Could not get workspace count:', e.message);
    }
    
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
    
    // Get queued pruning count
    let queuedPruning = 0;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [result] = await sequelize.query(
        'SELECT COUNT(*) as count FROM brainx_memories WHERE created_at < $1',
        { bind: [thirtyDaysAgo] }
      );
      queuedPruning = parseInt(result[0]?.count) || 0;
    } catch (e) {
      console.log('Could not get pruning count:', e.message);
    }
    
    // Calculate average query latency (mock)
    const latency = Math.floor(Math.random() * 100) + 150;
    
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
    const { BrainXMemory, sequelize } = req.app.get('models');
    const { q: query, workspace, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    // Build query with raw SQL for compatibility
    let sql = 'SELECT * FROM brainx_memories WHERE content ILIKE $1';
    const params = [`%${query}%`];
    
    if (workspace) {
      sql += ' AND workspace = $2';
      params.push(workspace);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit) * 2);
    
    const [memories] = await sequelize.query(sql, { bind: params });
    
    // Transform to response format with scores
    const results = memories.map((m) => {
      const contentLower = m.content.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // Simple relevance scoring
      let score = 0.5;
      if (contentLower.includes(queryLower)) score += 0.3;
      if (contentLower.startsWith(queryLower)) score += 0.2;
      
      // Extract title from content
      const title = m.content.split('\n')[0].substring(0, 50) || 'Untitled Memory';
      
      // Format date
      const date = m.created_at ? new Date(m.created_at).toLocaleDateString('en-US', { 
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
    const { BrainXMemory, sequelize } = req.app.get('models');
    const { content, workspaces = ['default'], category = 'context', metadata = {} } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const memories = [];
    
    // Create memory for each workspace using raw SQL for compatibility
    for (const workspace of workspaces) {
      const [result] = await sequelize.query(
        `INSERT INTO brainx_memories (id, content, workspace, metadata, created_at, updated_at) 
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW()) 
         RETURNING id, workspace`,
        { bind: [content, workspace, JSON.stringify({ ...metadata, category, injectedAt: new Date().toISOString() })] }
      );
      memories.push(result[0]);
    }
    
    res.status(201).json({
      success: true,
      injected: memories.length,
      memories
    });
  } catch (error) {
    console.error('BrainX inject error:', error);
    res.status(500).json({ error: 'Failed to inject memory' });
  }
});

// GET /api/brainx/workspaces - Lista de workspaces con counts
router.get('/workspaces', async (req, res) => {
  try {
    const { sequelize } = req.app.get('models');
    
    const [workspaces] = await sequelize.query(
      'SELECT COALESCE(workspace, \'default\') as name, COUNT(*) as count FROM brainx_memories GROUP BY workspace ORDER BY workspace ASC'
    );
    
    const result = workspaces.map(w => ({
      name: w.name,
      count: parseInt(w.count),
      lastUpdated: new Date().toISOString()
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
    const { sequelize } = req.app.get('models');
    
    const [totalResult] = await sequelize.query('SELECT COUNT(*) as count FROM brainx_memories');
    const totalMemories = parseInt(totalResult[0].count);
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [recentResult] = await sequelize.query(
      'SELECT COUNT(*) as count FROM brainx_memories WHERE created_at >= $1',
      { bind: [sevenDaysAgo] }
    );
    const recentCount = parseInt(recentResult[0].count);
    
    // Get top workspaces
    const [workspaceStats] = await sequelize.query(
      'SELECT COALESCE(workspace, \'default\') as name, COUNT(*) as count FROM brainx_memories GROUP BY workspace ORDER BY COUNT(*) DESC LIMIT 5'
    );
    
    // Mock query patterns
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
        name: w.name,
        count: parseInt(w.count)
      })),
      queryPatterns,
      cacheHitRate: `${Math.floor(Math.random() * 20) + 75}%`,
      avgQueryTime: `${Math.floor(Math.random() * 100) + 150}ms`
    });
  } catch (error) {
    console.error('BrainX insights error:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// GET /api/brainx - Lista memorias
// GET /api/brainx/memories - Lista memorias (alias para compatibilidad con frontend)
router.get("/memories", async (req, res) => {
  try {
    const { sequelize } = req.app.get("models");
    const { workspace, limit = 50, offset = 0 } = req.query;
    
    let sql = "SELECT * FROM brainx_memories";
    const params = [];
    
    if (workspace) {
      sql += " WHERE workspace = $1";
      params.push(workspace);
    }
    
    sql += " ORDER BY created_at DESC LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));
    
    const [memories] = await sequelize.query(sql, { bind: params });
    res.json(memories);
  } catch (error) {
    console.error("Get brainx memories error:", error);
    res.status(500).json({ error: "Failed to fetch memories" });
  }
});

router.get('/', async (req, res) => {
  try {
    const { sequelize } = req.app.get('models');
    const { workspace, limit = 50, offset = 0 } = req.query;
    
    let sql = 'SELECT * FROM brainx_memories';
    const params = [];
    
    if (workspace) {
      sql += ' WHERE workspace = $1';
      params.push(workspace);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));
    
    const [memories] = await sequelize.query(sql, { bind: params });
    res.json(memories);
  } catch (error) {
    console.error('Get brainx memories error:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// GET /api/brainx/:id - Detalle memoria
router.get('/:id', async (req, res) => {
  try {
    const { sequelize } = req.app.get('models');
    const { id } = req.params;
    
    const [memories] = await sequelize.query(
      'SELECT * FROM brainx_memories WHERE id = $1',
      { bind: [id] }
    );
    
    if (!memories.length) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    res.json(memories[0]);
  } catch (error) {
    console.error('Get brainx memory error:', error);
    res.status(500).json({ error: 'Failed to fetch memory' });
  }
});

// DELETE /api/brainx/:id - Eliminar memoria
router.delete('/:id', async (req, res) => {
  try {
    const { sequelize } = req.app.get('models');
    const { id } = req.params;
    
    const [result] = await sequelize.query(
      'DELETE FROM brainx_memories WHERE id = $1 RETURNING id',
      { bind: [id] }
    );
    
    if (!result.length) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete brainx memory error:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

export default router;
