import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';
import { setUserOnline, setUserOffline } from '../utils/redis';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

// Store online users and their socket connections
const onlineUsers = new Map<string, string>(); // userId -> socketId
const userSockets = new Map<string, AuthenticatedSocket>(); // socketId -> socket

export const initializeSocket = (io: Server) => {
  
  // Authentication middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = verifyAccessToken(token);
      
      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);

    // Store user connection
    if (socket.userId) {
      onlineUsers.set(socket.userId, socket.id);
      userSockets.set(socket.id, socket);
      
      // Set user online in Redis
      setUserOnline(socket.userId);

      // Join user to their personal room (for notifications)
      socket.join(`user:${socket.userId}`);

      // Notify friends that user is online
      socket.broadcast.emit('user_online', {
        userId: socket.userId,
        username: socket.username
      });
    }

    // Handle joining conversation rooms
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${socket.username} joined conversation: ${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.username} left conversation: ${conversationId}`);
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, messageId } = data;
        
        if (!conversationId || !content || !messageId) {
          socket.emit('message_error', { error: 'Missing required fields' });
          return;
        }

        // Broadcast message to all users in the conversation
        socket.to(`conversation:${conversationId}`).emit('new_message', {
          messageId,
          conversationId,
          content,
          senderId: socket.userId,
          senderUsername: socket.username,
          timestamp: new Date().toISOString()
        });

        // Confirm message sent
        socket.emit('message_sent', { messageId });
        
      } catch (error) {
        console.error('Error handling send_message:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_typing', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    // Handle message read receipts
    socket.on('mark_message_read', (data) => {
      const { conversationId, messageId } = data;
      if (conversationId && messageId) {
        socket.to(`conversation:${conversationId}`).emit('message_read', {
          messageId,
          readBy: {
            userId: socket.userId,
            username: socket.username,
            readAt: new Date().toISOString()
          }
        });
      }
    });

    // Handle post likes (real-time notifications)
    socket.on('like_post', (data) => {
      const { postId, postAuthorId } = data;
      
      if (postAuthorId && postAuthorId !== socket.userId) {
        // Notify post author
        socket.to(`user:${postAuthorId}`).emit('new_like', {
          postId,
          likedBy: {
            userId: socket.userId,
            username: socket.username
          },
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle reel likes
    socket.on('like_reel', (data) => {
      const { reelId, reelAuthorId } = data;
      
      if (reelAuthorId && reelAuthorId !== socket.userId) {
        // Notify reel author
        socket.to(`user:${reelAuthorId}`).emit('new_reel_like', {
          reelId,
          likedBy: {
            userId: socket.userId,
            username: socket.username
          },
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle new comments
    socket.on('new_comment', (data) => {
      const { postId, postAuthorId, comment } = data;
      
      if (postAuthorId && postAuthorId !== socket.userId) {
        // Notify post author
        socket.to(`user:${postAuthorId}`).emit('new_comment_notification', {
          postId,
          comment,
          commentBy: {
            userId: socket.userId,
            username: socket.username
          },
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle follow notifications
    socket.on('new_follow', (data) => {
      const { followedUserId } = data;
      
      if (followedUserId) {
        // Notify followed user
        socket.to(`user:${followedUserId}`).emit('new_follower', {
          follower: {
            userId: socket.userId,
            username: socket.username
          },
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle story views
    socket.on('view_story', (data) => {
      const { storyId, storyAuthorId } = data;
      
      if (storyAuthorId && storyAuthorId !== socket.userId) {
        // Notify story author
        socket.to(`user:${storyAuthorId}`).emit('story_viewed', {
          storyId,
          viewedBy: {
            userId: socket.userId,
            username: socket.username
          },
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.username} (${socket.userId})`);

      if (socket.userId) {
        // Remove from online users
        onlineUsers.delete(socket.userId);
        userSockets.delete(socket.id);
        
        // Set user offline in Redis
        await setUserOffline(socket.userId);

        // Notify friends that user is offline
        socket.broadcast.emit('user_offline', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.username}:`, error);
    });
  });

  // Global error handler
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });

  console.log('Socket.IO server initialized');
};

// Helper function to emit to specific user
export const emitToUser = (userId: string, event: string, data: any) => {
  const socketId = onlineUsers.get(userId);
  if (socketId) {
    const socket = userSockets.get(socketId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
  }
  return false;
};

// Helper function to emit to multiple users
export const emitToUsers = (userIds: string[], event: string, data: any) => {
  const results = userIds.map(userId => emitToUser(userId, event, data));
  return results.filter(Boolean).length;
};

// Helper function to check if user is online
export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId);
};

// Get all online users
export const getOnlineUsers = (): string[] => {
  return Array.from(onlineUsers.keys());
};