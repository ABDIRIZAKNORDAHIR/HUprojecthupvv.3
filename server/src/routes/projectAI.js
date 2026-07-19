import { Router } from 'express';
import { authMiddleware, attachUserDetails, requireRole } from '../middleware/auth.js';
import {
  runProjectAIAnalysis,
  getProjectAIChat,
  teacherAskProjectAI,
  isRealAIConfigured,
  getAIProviderInfo,
} from '../services/projectAIService.js';
import { assertTeacherOwnsProject } from '../services/projectContext.js';
import { query } from '../db.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware, attachUserDetails);

function enrichAnalysisRow(row) {
  if (!row) return null;
  let meta = {};
  if (row.AiMetadata) {
    try { meta = JSON.parse(row.AiMetadata); } catch { /* ignore */ }
  }
  return {
    ...row,
    KeyPoints: tryParseJson(row.KeyPoints),
    Objectives: tryParseJson(row.Objectives),
    MissingSections: tryParseJson(row.MissingSections),
    Suggestions: tryParseJson(row.Suggestions),
    GrammarIssues: tryParseJson(row.GrammarIssues),
    recommendedDecision: meta.recommendedDecision,
    decisionConfidence: meta.decisionConfidence,
    decisionReasoning: meta.decisionReasoning,
    decisionLabel: meta.decisionLabel,
    rejectionReasons: meta.rejectionReasons,
    whatProjectIsAbout: meta.whatProjectIsAbout,
    whatShouldContain: meta.whatShouldContain,
    featureSuggestions: meta.featureSuggestions,
    strengths: meta.strengths,
    aiProvider: meta.provider,
    aiModel: meta.model,
  };
}

function tryParseJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return val; }
}

router.get('/status', requireRole('teacher'), async (req, res) => {
  const info = getAIProviderInfo();
  res.json({
    configured: info.configured,
    provider: info.provider,
    model: info.model,
    message: info.message,
    fallbackAvailable: info.fallbackAvailable,
  });
});

router.post('/analyze', requireRole('teacher'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (!(await assertTeacherOwnsProject(req.user.userId, projectId))) {
      return res.status(403).json({ error: 'Not your project' });
    }
    const result = await runProjectAIAnalysis(projectId, { notifyTeacher: false });
    if (!result.ok) return res.status(result.code === 'AI_NOT_CONFIGURED' ? 503 : 500).json({
      ...result,
      message: result.error,
      hint: result.hint || null,
    });
    res.json({ analysis: result.analysis, provider: result.provider, model: result.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/chat', requireRole('teacher'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (!(await assertTeacherOwnsProject(req.user.userId, projectId))) {
      return res.status(403).json({ error: 'Not your project' });
    }
    const messages = await getProjectAIChat(projectId, req.user.userId);
    const info = getAIProviderInfo();
    res.json({ messages, configured: info.configured, provider: info.provider, model: info.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat', requireRole('teacher'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'Question is required' });

    if (!(await assertTeacherOwnsProject(req.user.userId, projectId))) {
      return res.status(403).json({ error: 'Not your project' });
    }

    const result = await teacherAskProjectAI(projectId, req.user.userId, question);
    if (!result.ok) return res.status(result.code === 'AI_NOT_CONFIGURED' ? 503 : 500).json({
      ...result,
      message: result.error,
      hint: result.hint || null,
    });

    res.json({ answer: result.answer, provider: result.provider, model: result.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/briefing', requireRole('teacher'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (!(await assertTeacherOwnsProject(req.user.userId, projectId))) {
      return res.status(403).json({ error: 'Not your project' });
    }
    const r = await query(
      `SELECT TOP 1 * FROM DocumentAnalyses WHERE ProjectId = @pid AND FileType = 'ai_real_analysis' ORDER BY AnalyzedAt DESC`,
      { pid: projectId }
    );
    const info = getAIProviderInfo();
    res.json({
      configured: info.configured,
      provider: info.provider,
      model: info.model,
      analysis: enrichAnalysisRow(r.recordset[0] || null),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
