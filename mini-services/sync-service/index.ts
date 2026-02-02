// Real-time Sync Service for Todo Application
// Handles WebSocket connections for live synchronization

import { Server } from 'socket.io';

const PORT = 3003;
const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

console.log(`🔄 Sync Service running on port ${PORT}`);

// Store connected clients and their workspace subscriptions
const clientWorkspaces = new Map<string, Set<string>>();
const workspaceClients = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Subscribe to workspace
  socket.on('subscribe:workspace', (workspaceId: string) => {
    console.log(`Client ${socket.id} subscribing to workspace: ${workspaceId}`);
    
    // Track workspace subscriptions
    if (!clientWorkspaces.has(socket.id)) {
      clientWorkspaces.set(socket.id, new Set());
    }
    clientWorkspaces.get(socket.id)!.add(workspaceId);
    
    if (!workspaceClients.has(workspaceId)) {
      workspaceClients.set(workspaceId, new Set());
    }
    workspaceClients.get(workspaceId)!.add(socket.id);
    
    socket.join(`workspace:${workspaceId}`);
    
    // Send confirmation
    socket.emit('subscribed', { workspaceId });
  });

  // Unsubscribe from workspace
  socket.on('unsubscribe:workspace', (workspaceId: string) => {
    console.log(`Client ${socket.id} unsubscribing from workspace: ${workspaceId}`);
    
    socket.leave(`workspace:${workspaceId}`);
    
    // Clean up tracking
    clientWorkspaces.get(socket.id)?.delete(workspaceId);
    workspaceClients.get(workspaceId)?.delete(socket.id);
    
    socket.emit('unsubscribed', { workspaceId });
  });

  // Handle sync events from clients
  socket.on('sync:event', (data) => {
    const { type, entity, workspaceId, payload } = data;
    
    console.log(`Sync event from ${socket.id}:`, { type, entity, workspaceId });
    
    // Broadcast to all clients in the same workspace (except sender)
    socket.to(`workspace:${workspaceId}`).emit('sync:event', {
      type,
      entity,
      workspaceId,
      payload,
      timestamp: new Date().toISOString(),
      senderId: socket.id,
    });
  });

  // Handle bulk sync events
  socket.on('sync:bulk', (data) => {
    const { workspaceId, events } = data;
    
    console.log(`Bulk sync from ${socket.id}:`, { workspaceId, eventCount: events.length });
    
    // Broadcast to all clients in the same workspace (except sender)
    socket.to(`workspace:${workspaceId}`).emit('sync:bulk', {
      workspaceId,
      events,
      timestamp: new Date().toISOString(),
      senderId: socket.id,
    });
  });

  // Handle presence/typing indicators
  socket.on('presence:typing', (data) => {
    const { workspaceId, taskId, isTyping } = data;
    
    socket.to(`workspace:${workspaceId}`).emit('presence:typing', {
      socketId: socket.id,
      taskId,
      isTyping,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Clean up workspace subscriptions
    const workspaces = clientWorkspaces.get(socket.id);
    if (workspaces) {
      for (const workspaceId of workspaces) {
        workspaceClients.get(workspaceId)?.delete(socket.id);
        
        // Notify other clients in workspace
        socket.to(`workspace:${workspaceId}`).emit('presence:left', {
          socketId: socket.id,
          workspaceId,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    clientWorkspaces.delete(socket.id);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Broadcast server events (can be called from other processes)
export function broadcastEvent(workspaceId: string, event: any) {
  io.to(`workspace:${workspaceId}`).emit('sync:event', {
    ...event,
    workspaceId,
    timestamp: new Date().toISOString(),
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing sync service...');
  io.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing sync service...');
  io.close();
  process.exit(0);
});
