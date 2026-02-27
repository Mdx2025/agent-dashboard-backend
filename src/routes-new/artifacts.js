import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to calculate content size
function calculateSize(content) {
  if (!content) return '0 B';
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper to get badge based on type
function getBadgeForType(type) {
  const badges = {
    markdown: 'MD',
    pdf: 'PDF',
    svg: 'SVG',
    json: 'JSON',
    text: 'TXT',
    image: 'IMG'
  };
  return badges[type] || type.toUpperCase();
}

// GET /api/artifacts - Lista de artifacts
router.get('/', async (req, res) => {
  try {
    const { Artifact } = req.app.get('models');
    const { type, agent, limit = 50, offset = 0 } = req.query;
    
    const where = {};
    if (type) where.type = type;
    if (agent) where.agent = agent;
    
    const artifacts = await Artifact.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Transform to response format
    const results = artifacts.map(a => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      agent: a.agent,
      createdAt: a.createdAt,
      size: a.size || calculateSize(a.content),
      type: a.type,
      badge: a.badge || getBadgeForType(a.type)
    }));
    
    res.json({ artifacts: results });
  } catch (error) {
    console.error('Artifacts list error:', error);
    res.status(500).json({ error: 'Failed to fetch artifacts' });
  }
});

// GET /api/artifacts/:id - Detalle de artifact
router.get('/:id', async (req, res) => {
  try {
    const { Artifact } = req.app.get('models');
    const { id } = req.params;
    
    const artifact = await Artifact.findByPk(id);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }
    
    res.json({
      id: artifact.id,
      name: artifact.name,
      emoji: artifact.emoji,
      agent: artifact.agent,
      createdAt: artifact.createdAt,
      size: artifact.size || calculateSize(artifact.content),
      type: artifact.type,
      badge: artifact.badge || getBadgeForType(artifact.type),
      content: artifact.content,
      metadata: artifact.metadata
    });
  } catch (error) {
    console.error('Artifact detail error:', error);
    res.status(500).json({ error: 'Failed to fetch artifact' });
  }
});

// POST /api/artifacts - Crear artifact (upload o texto)
router.post('/', async (req, res) => {
  try {
    const { Artifact } = req.app.get('models');
    const { name, emoji, agent, type = 'markdown', content, filePath, metadata = {} } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!content && !filePath) {
      return res.status(400).json({ error: 'Either content or filePath is required' });
    }
    
    const size = calculateSize(content);
    const badge = getBadgeForType(type);
    const artifactEmoji = emoji || (type === 'markdown' ? '📝' : type === 'pdf' ? '📄' : type === 'svg' ? '🎨' : '📦');
    
    const artifact = await Artifact.create({
      name,
      emoji: artifactEmoji,
      agent,
      type,
      size,
      badge,
      filePath,
      content,
      metadata
    });
    
    res.status(201).json({
      id: artifact.id,
      name: artifact.name,
      emoji: artifact.emoji,
      agent: artifact.agent,
      createdAt: artifact.createdAt,
      size: artifact.size,
      type: artifact.type,
      badge: artifact.badge
    });
  } catch (error) {
    console.error('Artifact create error:', error);
    res.status(500).json({ error: 'Failed to create artifact' });
  }
});

// PUT /api/artifacts/:id - Actualizar artifact
router.put('/:id', async (req, res) => {
  try {
    const { Artifact } = req.app.get('models');
    const { id } = req.params;
    const { name, emoji, agent, content, metadata } = req.body;
    
    const artifact = await Artifact.findByPk(id);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }
    
    if (name !== undefined) artifact.name = name;
    if (emoji !== undefined) artifact.emoji = emoji;
    if (agent !== undefined) artifact.agent = agent;
    if (content !== undefined) {
      artifact.content = content;
      artifact.size = calculateSize(content);
    }
    if (metadata !== undefined) artifact.metadata = { ...artifact.metadata, ...metadata };
    
    await artifact.save();
    
    res.json({
      id: artifact.id,
      name: artifact.name,
      emoji: artifact.emoji,
      agent: artifact.agent,
      createdAt: artifact.createdAt,
      size: artifact.size,
      type: artifact.type,
      badge: artifact.badge,
      content: artifact.content
    });
  } catch (error) {
    console.error('Artifact update error:', error);
    res.status(500).json({ error: 'Failed to update artifact' });
  }
});

// GET /api/artifacts/:id/download - Descargar archivo
router.get('/:id/download', async (req, res) => {
  try {
    const { Artifact } = req.app.get('models');
    const { id } = req.params;
    
    const artifact = await Artifact.findByPk(id);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }
    
    // If filePath exists and file exists, serve it
    if (artifact.filePath && fs.existsSync(artifact.filePath)) {
      return res.download(artifact.filePath, artifact.name);
    }
    
    // Otherwise serve content as download
    const contentType = {
      markdown: 'text/markdown',
      pdf: 'application/pdf',
      svg: 'image/svg+xml',
      json: 'application/json',
      text: 'text/plain',
      image: 'image/png'
    }[artifact.type] || 'text/plain';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.name}"`);
    res.send(artifact.content || '');
  } catch (error) {
    console.error('Artifact download error:', error);
    res.status(500).json({ error: 'Failed to download artifact' });
  }
});

// DELETE /api/artifacts/:id - Eliminar artifact
router.delete('/:id', async (req, res) => {
  try {
    const { Artifact } = req.app.get('models');
    const { id } = req.params;
    
    const artifact = await Artifact.findByPk(id);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }
    
    // Delete file if exists
    if (artifact.filePath && fs.existsSync(artifact.filePath)) {
      fs.unlinkSync(artifact.filePath);
    }
    
    await artifact.destroy();
    res.json({ success: true, message: 'Artifact deleted' });
  } catch (error) {
    console.error('Artifact delete error:', error);
    res.status(500).json({ error: 'Failed to delete artifact' });
  }
});

export default router;
