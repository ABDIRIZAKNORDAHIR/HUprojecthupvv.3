import http from 'http';
import express from 'express';

import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import dotenv from 'dotenv';

import path from 'path';

import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

import { ensureDatabase } from './setupDatabase.js';

import { testConnection, getDriverLabel } from './db.js';

import authRoutes from './routes/auth.js';

import projectRoutes from './routes/projects.js';

import messageRoutes from './routes/messages.js';

import adminRoutes from './routes/admin.js';


import studentRoutes from './routes/student.js';

import teacherRoutes from './routes/teacher.js';

import atlasRoutes from './routes/atlas.js';

import conversationRoutes from './routes/conversations.js';

import userRoutes from './routes/users.js';

import evaluationRoutes from './routes/evaluations.js';

import projectAIRoutes from './routes/projectAI.js';

import classAssignmentRoutes from './routes/classAssignments.js';
import studentCoachRoutes from './routes/studentCoach.js';
import pushRoutes from './routes/push.js';
import { attachRealtime } from './realtime/socket.js';
import { ensurePushTable, getVapidPublicKey } from './services/push.js';

import { getAIProviderInfo } from './services/aiEngine.js';

import { startClassAssignmentDeadlineWatcher } from './services/classAssignmentDeadline.js';
import { validateProductionConfig } from './config/security.js';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rootEnv = path.resolve(__dirname, '../../.env');

dotenv.config({ path: rootEnv });

dotenv.config({ path: path.resolve(process.cwd(), '.env') });



const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3004;

const isProduction = process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true';

const distPath = path.resolve(__dirname, '../../dist');

validateProductionConfig();

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
      frameSrc: ["'self'", 'blob:', 'data:'],
      connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
}));

// Force HTTPS in production behind Render / reverse proxies.
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (forwarded && forwarded !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});



function configuredOrigins() {
  return [
    process.env.CLIENT_URL,
    process.env.RENDER_EXTERNAL_URL,
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
  ]
    .map(value => String(value || '').trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function isPublicOrigin(origin) {

  if (!origin) return true;

  if (configuredOrigins().includes(origin.replace(/\/$/, ''))) return true;

  if (!isProduction && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) return true;

  return false;

}



app.use(cors({

  origin: (origin, callback) => {

    if (!origin) return callback(null, true);

    const allowed = [

      process.env.CLIENT_URL,

      'http://localhost:5173',

      'http://localhost:5174',

      'http://localhost:5175',

      'http://localhost:5176',

      'http://localhost:5180',

    ].filter(Boolean);

    if (allowed.includes(origin) || isPublicOrigin(origin)) return callback(null, true);

    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) {

      return callback(null, true);

    }

    callback(new Error('Not allowed by CORS'));

  },

  credentials: true,

}));

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '6mb' }));
app.use((req, res, next) => {
  const requestId = String(req.headers['x-request-id'] || randomUUID());
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({
      level: res.statusCode >= 500 ? 'error' : 'info',
      event: 'http_request',
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    }));
  });
  next();
});

/** Tells the user how long the lockout lasts instead of a vague "wait". */
function retryMessage(text) {
  return (req, res) => {
    const resetAt = req.rateLimit?.resetTime;
    const seconds = resetAt ? Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)) : null;
    if (!seconds) return { error: `${text} Please wait and try again.` };
    const wait = seconds >= 60
      ? `${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) === 1 ? '' : 's'}`
      : `${seconds} seconds`;
    res.set('Retry-After', String(seconds));
    return { error: `${text} Try again in ${wait}.`, retryAfterSeconds: seconds };
  };
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: retryMessage('Too many requests.'),
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 20 : 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: retryMessage('Too many authentication attempts.'),
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: retryMessage('Too many login attempts.'),
});
// Every request here sends a real email, so production stays tight.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 8 : 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: retryMessage('Too many verification-code requests.'),
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Analysis request limit reached. Please wait a minute and try again.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth/register/request-otp', otpLimiter);
app.use('/api/auth/admin/request-otp', otpLimiter);
app.use('/api/auth/password-reset/request-otp', otpLimiter);
app.use('/api/auth/login', loginLimiter);
app.use([
  '/api/auth/register',
  '/api/auth/register/verify-otp',
  '/api/auth/admin/verify-otp',
  '/api/auth/password-reset/verify-otp',
  '/api/auth/password-reset/confirm',
], authLimiter);
app.use('/api/projects/:projectId/ai', aiLimiter);
app.use('/api/student/ai-coach', aiLimiter);
app.use('/api/admin/batch-scan', aiLimiter);



app.get('/api/health', async (_req, res) => {

  const db = await testConnection();

  const ai = getAIProviderInfo();

  res.status(db.ok ? 200 : 503).json({

    status: db.ok ? 'ok' : 'degraded',

    service: 'ProjectHub API',

    mode: isProduction ? 'production' : 'development',

    database: db.ok ? (isProduction ? 'connected' : getDriverLabel()) : 'unavailable',

    ai: {

      configured: ai.configured,

      provider: isProduction ? undefined : ai.provider,

      model: isProduction ? undefined : ai.model,

      message: isProduction ? undefined : ai.message,

      fallbackAvailable: ai.fallbackAvailable,

      setup: !isProduction && !ai.configured
        ? 'Run SETUP_FREE_AI.bat or add GROQ_API_KEY to .env'
        : undefined,

    },

  });

});



app.use('/api/auth', authRoutes);

app.use('/api/projects', projectRoutes);

app.use('/api/projects/:projectId/messages', messageRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/student', studentRoutes);

app.use('/api/teacher', teacherRoutes);

app.use('/api/atlas', atlasRoutes);

app.use('/api/conversations', conversationRoutes);

app.use('/api/users', userRoutes);

app.use('/api/projects/:projectId/evaluations', evaluationRoutes);

app.use('/api/projects/:projectId/ai', projectAIRoutes);

app.use('/api/class-assignments', classAssignmentRoutes);
app.use('/api/student/ai-coach', studentCoachRoutes);
app.use('/api/push', pushRoutes);



if (isProduction) {

  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {

    if (req.path.startsWith('/api')) return next();

    res.sendFile(path.join(distPath, 'index.html'), (err) => {

      if (err) next(err);

    });

  });

}



app.use((err, _req, res, _next) => {

  console.error(err);

  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (err.message || 'Internal server error');
  res.status(err.status || 500).json({ error: message });

});



let httpServer = null;

async function start() {

  const usePg = process.env.DB_DRIVER === 'postgres' || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const useMySql = process.env.DB_DRIVER === 'mysql';
  const dbLabel = usePg ? 'PostgreSQL (cloud)' : useMySql ? 'MySQL' : 'SQL Server';

  console.log(`ProjectHub — configuring ${dbLabel}...`);

  const setup = await ensureDatabase();

  if (!setup.ok) {

    console.error('Database setup failed:', setup.error);

    process.exit(1);

  }



  const server = http.createServer(app);
    httpServer = server;
    await attachRealtime(server);
    await ensurePushTable();
    getVapidPublicKey();

    server.listen(PORT, '0.0.0.0', async () => {

    const db = await testConnection();

    console.log(`ProjectHub API: http://localhost:${PORT}`);

    if (isProduction) console.log(`ProjectHub UI:  http://localhost:${PORT}/ (served from /dist)`);

    console.log(`Database: ${db.ok ? getDriverLabel() : 'FAILED - ' + db.error}`);

    startClassAssignmentDeadlineWatcher(60000);

  });

}



start();

function shutdown(signal) {
  console.log(JSON.stringify({ level: 'info', event: 'shutdown', signal }));
  if (!httpServer) return process.exit(0);
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => {
  console.error(JSON.stringify({
    level: 'error',
    event: 'unhandled_rejection',
    message: error instanceof Error ? error.message : String(error),
  }));
});


