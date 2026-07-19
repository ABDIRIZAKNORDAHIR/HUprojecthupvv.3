import http from 'http';
import express from 'express';

import cors from 'cors';

import dotenv from 'dotenv';

import path from 'path';

import { fileURLToPath } from 'url';

import { ensureDatabase } from './setupDatabase.js';

import { testConnection, getDriverLabel } from './db.js';

import authRoutes from './routes/auth.js';

import projectRoutes from './routes/projects.js';

import messageRoutes from './routes/messages.js';

import adminRoutes from './routes/admin.js';

import settingsRoutes from './routes/settings.js';

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



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rootEnv = path.resolve(__dirname, '../../.env');

dotenv.config({ path: rootEnv });

dotenv.config({ path: path.resolve(process.cwd(), '.env') });



const app = express();

const PORT = process.env.PORT || 3004;

const isProduction = process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true';

const distPath = path.resolve(__dirname, '../../dist');



function isPublicOrigin(origin) {

  if (!origin) return true;

  if (process.env.PUBLIC_DEPLOY === 'true') return true;

  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return true;

  if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) return true;

  if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin)) return true;

  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;

  if (/^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(origin)) return true;

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

app.use(express.json({ limit: '2mb' }));



app.get('/api/health', async (_req, res) => {

  const db = await testConnection();

  const ai = getAIProviderInfo();

  res.json({

    status: 'ok',

    service: 'ProjectHub API',

    mode: isProduction ? 'production' : 'development',

    database: db.ok ? getDriverLabel() : db.error,

    ai: {

      configured: ai.configured,

      provider: ai.provider,

      model: ai.model,

      message: ai.message,

      fallbackAvailable: ai.fallbackAvailable,

      setup: ai.configured ? null : 'Run SETUP_FREE_AI.bat or add GROQ_API_KEY to .env',

    },

  });

});



app.use('/api/auth', authRoutes);

app.use('/api/projects', projectRoutes);

app.use('/api/projects/:projectId/messages', messageRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/settings', settingsRoutes);

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

  res.status(500).json({ error: err.message || 'Internal server error' });

});



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


