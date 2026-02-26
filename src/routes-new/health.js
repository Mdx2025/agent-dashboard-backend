import express from 'express';

const router = express.Router();

// GET /api/health/services - Estado de servicios
router.get('/services', async (req, res) => {
  try {
    const { sequelize } = req.app.get('models') || {};
    
    let dbStatus = 'unknown';
    let dbLatency = null;
    
    // Check database connection
    if (sequelize) {
      try {
        const start = Date.now();
        await sequelize.authenticate();
        dbLatency = Date.now() - start;
        dbStatus = 'healthy';
      } catch (dbError) {
        dbStatus = 'unhealthy';
      }
    }

    // Check other services (mock for now)
    const services = {
      database: {
        status: dbStatus,
        latency: dbLatency,
        type: 'sqlite'
      },
      websocket: {
        status: 'healthy',
        connectedClients: 0 // Would get from io engine
      },
      brainx: {
        status: 'unknown',
        note: 'BrainX external service'
      },
      openclaw: {
        status: 'unknown',
        note: 'OpenClaw Gateway'
      }
    };

    const allHealthy = Object.values(services).every(s => s.status === 'healthy');
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      services,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// GET /api/health - Health check básico
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mdx-control-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;
