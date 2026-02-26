import { Server } from 'socket.io';

let io = null;

/**
 * Initialize Socket.IO with the HTTP server
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
export function initIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Client can subscribe to specific agent updates
    socket.on('subscribe.agent', (agentId) => {
      socket.join(`agent:${agentId}`);
      console.log(`[WS] ${socket.id} subscribed to agent:${agentId}`);
    });

    // Client can subscribe to mission updates
    socket.on('subscribe.mission', (missionId) => {
      socket.join(`mission:${missionId}`);
      console.log(`[WS] ${socket.id} subscribed to mission:${missionId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('[WS] Socket.IO initialized');
  return io;
}

/**
 * Get the Socket.IO instance
 * @returns {Server|null}
 */
export function getIO() {
  return io;
}

/**
 * Emit agent status change
 * @param {string} agentId
 * @param {string} status
 */
export function emitAgentStatus(agentId, status) {
  if (io) {
    io.emit('agent.status', { agentId, status, timestamp: new Date().toISOString() });
    io.to(`agent:${agentId}`).emit('agent.status.detail', { agentId, status, timestamp: new Date().toISOString() });
  }
}

/**
 * Emit new activity
 * @param {object} activity
 */
export function emitActivity(activity) {
  if (io) {
    io.emit('activity.new', activity);
  }
}

/**
 * Emit mission update
 * @param {object} mission
 */
export function emitMissionUpdate(mission) {
  if (io) {
    io.emit('mission.update', mission);
    if (mission.id) {
      io.to(`mission:${mission.id}`).emit('mission.update.detail', mission);
    }
  }
}
