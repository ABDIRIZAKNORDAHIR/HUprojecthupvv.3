import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/** @type {import('socket.io').Server | null} */
let io = null;

/** userId -> Set of socket ids */
const userSockets = new Map();

export function getIO() {
  return io;
}

export function isUserOnline(userId) {
  const set = userSockets.get(Number(userId));
  return Boolean(set && set.size > 0);
}

export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitToConversation(conversationId, event, payload) {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, payload);
}

export function attachRealtime(httpServer) {
  // Dynamic import keeps startup flexible if package missing in older installs
  return import('socket.io').then(({ Server }) => {
    io = new Server(httpServer, {
      cors: {
        origin: true,
        credentials: true,
      },
      path: '/socket.io',
    });

    io.use((socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');
        if (!token) return next(new Error('Authentication required'));
        const user = jwt.verify(token, JWT_SECRET);
        socket.user = user;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      const userId = Number(socket.user.userId);
      socket.join(`user:${userId}`);

      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId).add(socket.id);

      io.emit('presence:update', { userId, online: true });

      socket.on('conversation:join', (conversationId) => {
        const id = Number(conversationId);
        if (Number.isFinite(id)) socket.join(`conversation:${id}`);
      });

      socket.on('conversation:leave', (conversationId) => {
        const id = Number(conversationId);
        if (Number.isFinite(id)) socket.leave(`conversation:${id}`);
      });

      socket.on('typing:start', ({ conversationId }) => {
        if (!conversationId) return;
        socket.to(`conversation:${conversationId}`).emit('typing:start', {
          conversationId: Number(conversationId),
          userId,
          name: `${socket.user.universityId || 'User'}`,
        });
      });

      socket.on('typing:stop', ({ conversationId }) => {
        if (!conversationId) return;
        socket.to(`conversation:${conversationId}`).emit('typing:stop', {
          conversationId: Number(conversationId),
          userId,
        });
      });

      socket.on('disconnect', () => {
        const set = userSockets.get(userId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            userSockets.delete(userId);
            io.emit('presence:update', { userId, online: false });
          }
        }
      });
    });

    console.log('Realtime: Socket.IO attached');
    return io;
  });
}
