import { Server } from 'socket.io';

export function setupWebSocket(io) {
  // Connection handling
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join channels
    socket.on('join', (channel) => {
      socket.join(channel);
      console.log(`Socket ${socket.id} joined channel: ${channel}`);
    });

    socket.on('leave', (channel) => {
      socket.leave(channel);
      console.log(`Socket ${socket.id} left channel: ${channel}`);
    });

    // Subscribe to agent updates
    socket.on('subscribe:agent', (agentId) => {
      socket.join(`agent:${agentId}`);
      console.log(`Socket ${socket.id} subscribed to agent: ${agentId}`);
    });

    // Subscribe to mission updates
    socket.on('subscribe:mission', (missionId) => {
      socket.join(`mission:${missionId}`);
      console.log(`Socket ${socket.id} subscribed to mission: ${missionId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error: ${socket.id}`, error);
    });
  });

  // Event emitters (these are used by routes)
  io.emitAgentStatus = (agentId, status) => {
    io.to(`agent:${agentId}`).emit('agent.status', {
      agentId,
      status,
      timestamp: new Date().toISOString()
    });
    // Also emit to general agents channel
    io.to('agents').emit('agent.status', {
      agentId,
      status,
      timestamp: new Date().toISOString()
    });
  };

  io.emitActivity = (activity) => {
    io.emit('activity.new', activity);
  };

  io.emitMissionUpdate = (mission) => {
    io.emit('mission.update', {
      mission,
      timestamp: new Date().toISOString()
    });
  };

  io.emitNotification = (notification) => {
    io.emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  };

  return io;
}

// Socket events reference:
// - agent.status: { agentId, status, timestamp }
// - activity.new: Activity object
// - mission.update: { mission, action, timestamp }
// - notification: { id, type, message, timestamp }
