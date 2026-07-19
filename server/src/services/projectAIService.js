import { query } from '../db.js';
import { buildProjectContext } from './projectContext.js';
import {
  analyzeProjectWithRealAI,
  askTeacherAboutProject,
  isRealAIConfigured,
  getAIProviderInfo,
} from './aiEngine.js';
import { notifyTeacherProjectBriefing } from './notify.js';

function buildAiMetadata(analysis, provider, model) {
  return JSON.stringify({
    recommendedDecision: analysis.recommendedDecision,
    decisionConfidence: analysis.decisionConfidence,
    decisionReasoning: analysis.decisionReasoning,
    decisionLabel: analysis.decisionLabel,
    rejectionReasons: analysis.rejectionReasons,
    improvementsBeforeAccept: analysis.improvementsBeforeAccept,
    whatProjectIsAbout: analysis.whatProjectIsAbout,
    whatShouldContain: analysis.whatShouldContain,
    studentProvided: analysis.studentProvided,
    featureSuggestions: analysis.featureSuggestions,
    strengths: analysis.strengths,
    provider,
    model,
    analyzedAt: new Date().toISOString(),
  });
}

export async function runProjectAIAnalysis(projectId, { notifyTeacher = true } = {}) {
  const ctx = await buildProjectContext(projectId);
  if (!ctx) return { ok: false, error: 'Project not found' };

  const result = await analyzeProjectWithRealAI(ctx);
  if (!result.ok) return result;

  const a = result.analysis;
  const provider = result.provider || getAIProviderInfo().provider;
  const model = result.model || getAIProviderInfo().model;
  const metadata = buildAiMetadata(a, provider, model);

  await query(
    `DELETE FROM DocumentAnalyses WHERE ProjectId = @pid AND FileType IN ('project_submission', 'ai_real_analysis')`,
    { pid: projectId }
  );

  await query(
    `INSERT INTO DocumentAnalyses (ProjectId, FileName, FileType, Summary, MainTopic, KeyPoints, Objectives,
       QualityScore, RelatedToProject, GrammarIssues, MissingSections, PlagiarismNote, Suggestions, AiMetadata)
     VALUES (@pid, @fileName, 'ai_real_analysis', @summary, @mainTopic, @keyPoints, @objectives,
       @qualityScore, 1, @grammar, @missing, @plagiarism, @suggestions, @metadata)`,
    {
      pid: projectId,
      fileName: `AI Analysis: ${ctx.title}`,
      summary: a.summary,
      mainTopic: a.mainTopic,
      keyPoints: JSON.stringify(a.keyPoints),
      objectives: JSON.stringify(a.objectives),
      qualityScore: a.qualityScore,
      grammar: JSON.stringify(a.grammarIssues),
      missing: JSON.stringify(a.missingSections),
      plagiarism: a.plagiarismNote,
      suggestions: JSON.stringify(a.suggestions),
      metadata,
    }
  );

  if (notifyTeacher && ctx.teacherId) {
    await notifyTeacherProjectBriefing({
      teacherId: ctx.teacherId,
      studentName: ctx.studentName || 'Student',
      projectTitle: ctx.title,
      projectId,
      summaryPreview: a.whatProjectIsAbout || a.summary,
    });
  }

  return { ok: true, analysis: a, provider, model };
}

export async function ensureProjectsHaveAIAnalysis(projectIds) {
  if (!isRealAIConfigured() || !projectIds?.length) return;

  const unique = [...new Set(projectIds.map(Number).filter(Boolean))];
  for (const projectId of unique.slice(0, 8)) {
    const existing = await query(
      `SELECT TOP 1 DocumentAnalysisId FROM DocumentAnalyses
       WHERE ProjectId = @pid AND FileType = 'ai_real_analysis'`,
      { pid: projectId }
    );
    if (!existing.recordset.length) {
      runProjectAIAnalysis(projectId, { notifyTeacher: false }).catch(err => {
        console.warn(`[AI] Background analysis failed for project ${projectId}:`, err.message);
      });
    }
  }
}

export async function getProjectAIChat(projectId, teacherId) {
  const r = await query(
    `SELECT MessageId AS id, Role AS role, Content AS content, CreatedAt AS createdAt
     FROM ProjectAIChatMessages WHERE ProjectId = @pid AND TeacherId = @tid ORDER BY CreatedAt ASC`,
    { pid: projectId, tid: teacherId }
  );
  return r.recordset;
}

export async function teacherAskProjectAI(projectId, teacherId, question) {
  const ctx = await buildProjectContext(projectId);
  if (!ctx) return { ok: false, error: 'Project not found' };

  const history = await getProjectAIChat(projectId, teacherId);
  const answer = await askTeacherAboutProject(
    ctx,
    history.map(h => ({ role: h.role, content: h.content })),
    question.trim()
  );
  if (!answer.ok) return answer;

  await query(
    `INSERT INTO ProjectAIChatMessages (ProjectId, TeacherId, Role, Content) VALUES (@pid, @tid, 'user', @q)`,
    { pid: projectId, tid: teacherId, q: question.trim() }
  );
  await query(
    `INSERT INTO ProjectAIChatMessages (ProjectId, TeacherId, Role, Content) VALUES (@pid, @tid, 'assistant', @a)`,
    { pid: projectId, tid: teacherId, a: answer.content }
  );

  return {
    ok: true,
    answer: answer.content,
    provider: answer.provider,
    model: answer.model,
  };
}

export { isRealAIConfigured, getAIProviderInfo };
