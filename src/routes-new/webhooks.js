/**
 * Webhook Routes
 * Handles callbacks from external services (OpenClaw Gateway)
 */

import { Router } from 'express';
import { Mission, Activity } from '../models/index.js';
import { getIO } from '../websocket/index.js';

const router = Router();

/**
 * POST /api/webhooks/mission-complete
 * Called by OpenClaw Gateway when a mission execution completes
 */
router.post('/mission-complete', async (req, res) => {
  try {
    const { missionId, status, result, executionId } = req.body;
    
    if (!missionId) {
      return res.status(400).json({ error: 'missionId is required' });
    }

    // Find the mission
    const mission = await Mission.findByPk(missionId);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Determine final status
    const finalStatus = status === 'success' ? 'completed' : 'failed';
    
    // Update mission
    await mission.update({
      status: finalStatus,
      completedAt: new Date(),
      metadata: {
        ...mission.metadata,
        executionResult: result,
        executionId: executionId || null
      }
    });

    // Create activity log
    await Activity.create({
      type: 'mission_complete',
      agent: mission.agentId || 'system',
      message: `Mission "${mission.title}" ${finalStatus}`,
      metadata: {
        missionId: mission.id,
        status: finalStatus,
        result: result
      }
    });

    // Emit WebSocket event
    try {
      const io = getIO();
      if (io) {
        io.emit('mission.complete', {
          id: mission.id,
          title: mission.title,
          agentId: mission.agentId,
          status: finalStatus,
          result: result
        });
      }
    } catch (e) { /* ws optional */ }

    res.json({ 
      success: true, 
      missionId: mission.id,
      status: finalStatus 
    });
  } catch (err) {
    console.error('POST /api/webhooks/mission-complete error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/webhooks/mission-update
 * Called by OpenClaw Gateway for mission progress updates
 */
router.post('/mission-update', async (req, res) => {
  try {
    const { missionId, progress, status, message } = req.body;
    
    if (!missionId) {
      return res.status(400).json({ error: 'missionId is required' });
    }

    const mission = await Mission.findByPk(missionId);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const updates = {};
    if (progress !== undefined) updates.progress = progress;
    if (status) updates.status = status;
    
    await mission.update(updates);

    // Emit WebSocket event
    try {
      const io = getIO();
      if (io) {
        io.emit('mission.update', {
          id: mission.id,
          title: mission.title,
          agentId: mission.agentId,
          status: mission.status,
          progress: mission.progress,
          message: message
        });
      }
    } catch (e) { /* ws optional */ }

    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/webhooks/mission-update error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
