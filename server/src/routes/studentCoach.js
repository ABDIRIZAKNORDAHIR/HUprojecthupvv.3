import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, attachUserDetails, requireRole } from '../middleware/auth.js';
import { coachStudent, scoreTopicOriginality } from '../services/studentCoach.js';
import { getAIProviderInfo, isRealAIConfigured } from '../services/aiEngine.js';

const router = Router();
router.use(authMiddleware, attachUserDetails, requireRole('student'));

router.get('/status', (_req, res) => {
  const info = getAIProviderInfo();
  res.json({
    configured: isRealAIConfigured(),
    provider: info.provider,
    model: info.model,
    message: info.message,
    mode: isRealAIConfigured() ? 'llm' : 'local-coach',
  });
});

router.post('/advise', async (req, res) => {
  try {
    const { title, abstract, question, history } = req.body || {};
    const result = await coachStudent({
      title: title || '',
      abstract: abstract || '',
      question: question || '',
      history: Array.isArray(history) ? history : [],
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/originality', async (req, res) => {
  try {
    const { title, abstract } = req.body || {};
    if (!title?.trim() && !abstract?.trim()) {
      return res.status(400).json({ error: 'Title or abstract required' });
    }
    const others = await query(
      `SELECT ProjectId, TeacherAssignedId, Title, Abstract FROM Projects
       WHERE Status NOT IN ('rejected') ORDER BY ProjectId DESC`,
    );
    const score = scoreTopicOriginality(title, abstract, (others.recordset || []).slice(0, 200));
    res.json({ ...score, engine: 'athena-embeddings-v1' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
