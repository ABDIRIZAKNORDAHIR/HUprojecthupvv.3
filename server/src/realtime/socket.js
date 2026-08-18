import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { getJwtSecret, isProduction } from '../config/security.js';

/** @type {import('socket.io').Server | null} */
let io = null;

/** userId -> Set of socket ids */
const userSockets = new Map();

const PRIVATE_NETWORK_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
const TUNNEL_ORIGIN = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i;

function configuredOrigins() {
  return [
    process.env.CLIENT_URL,
    process.env.RENDER_EXTERNAL_URL,
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
  ]
    .map(value => String(value || '').trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function isAllowedRealtimeOrigin(origin) {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  if (configuredOrigins().includes(normalized)) return true;
  if (isProduction()) return false;
  return PRIVATE_NETWORK_ORIGIN.test(normalized) || TUNNEL_ORIGIN.test(normalized);
}

function conversationId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function canAccessConversation(user, value) {
  try {
    const cid = conversationId(value);
    const uid = Number(user?.userId);
    if (!cid || !Number.isInteger(uid) || uid <= 0) return false;
    const result = await query(
      `SELECT 1
       FROM ConversationMembers cm
       JOIN Conversations c ON c.ConversationId = cm.ConversationId
       WHERE cm.ConversationId = @cid AND cm.UserId = @uid
         AND (@role <> 'admin' OR c.ConversationType = 'student_direct')`,
      { cid, uid, role: user.role }
    );
    return result.recordset.length > 0;
  } catch (err) {
    console.warn('[Realtime] Conversation authorization failed:', err.message);
    return false;
  }
}

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
        origin: (origin, callback) => {
          if (isAllowedRealtimeOrigin(origin)) return callback(null, true);
          callback(new Error('Not allowed by CORS'));
        },
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
        const user = jwt.verify(token, getJwtSecret());
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

      socket.on('conversation:join', async (value) => {
        const id = conversationId(value);
        if (id && await canAccessConversation(socket.user, id)) {
          socket.join(`conversation:${id}`);
        }
      });

      socket.on('conversation:leave', async (value) => {
        const id = conversationId(value);
        if (!id) return;
        if (!(await canAccessConversation(socket.user, id))) {
          // Also remove stale room access if membership was revoked after joining.
          socket.leave(`conversation:${id}`);
          return;
        }
        socket.leave(`conversation:${id}`);
      });

      socket.on('typing:start', async ({ conversationId: value } = {}) => {
        const id = conversationId(value);
        if (!id || !(await canAccessConversation(socket.user, id))) return;
        socket.to(`conversation:${id}`).emit('typing:start', {
          conversationId: id,
          userId,
          name: `${socket.user.universityId || 'User'}`,
        });
      });

      socket.on('typing:stop', async ({ conversationId: value } = {}) => {
        const id = conversationId(value);
        if (!id || !(await canAccessConversation(socket.user, id))) return;
        socket.to(`conversation:${id}`).emit('typing:stop', {
          conversationId: id,
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
