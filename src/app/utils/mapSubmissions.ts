import type { Submission, CollisionAlert, SubmissionStatus } from '../types';

type ApiRow = Record<string, unknown>;

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '??';
}

function parseReasons(raw: unknown): string[] {
  if (!raw) return ['Topic too similar to existing project', 'Low originality score'];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed.map(String) : [String(raw)];
  } catch {
    return [String(raw)];
  }
}

function parseAiMetadata(raw: unknown) {
  if (!raw) return null;
  try {
    return JSON.parse(String(raw)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseJsonList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed.map(String) : [String(raw)];
  } catch {
    return [String(raw)];
  }
}

function mapStatus(status: unknown): SubmissionStatus {
  const s = String(status || 'pending');
  if (s === 'submitted' || s === 'under_review' || s === 'pending_teacher' || s === 'assigned') return 'pending';
  if (s === 'approved' || s === 'rejected' || s === 'changes_requested') return s;
  return 'pending';
}

function decisionLabel(decision: unknown): string {
  const s = String(decision || '').toLowerCase();
  if (s === 'approve') return 'APPROVE';
  if (s === 'reject') return 'REJECT';
  return 'REQUEST CHANGES';
}

export function mapApiRowToSubmission(row: ApiRow): Submission {
  const name = String(row.StudentName || 'Unknown');
  const similarity = Number(row.SimilarityPercent) || 0;
  const similarId = row.SimilarProjectAssignedId ? String(row.SimilarProjectAssignedId) : '';
  const meta = parseAiMetadata(row.AiMetadata);
  const hasRealAI = Boolean(meta || row.AiSummary);

  const aiQuality = Number(row.AiQualityScore) || Number(meta?.decisionConfidence) || 0;
  const aiConfidence = Number(meta?.decisionConfidence) || aiQuality || Number(row.AIConfidence) || 0;
  const recommendedDecision = meta?.recommendedDecision as string | undefined;
  const decisionReasoning = String(meta?.decisionReasoning || '');
  const whatAbout = String(meta?.whatProjectIsAbout || row.AiSummary || '').slice(0, 500);
  const featureSuggestions = parseJsonList(meta?.featureSuggestions || row.AiSuggestions);
  const rejectionReasons = parseReasons(meta?.rejectionReasons || row.RejectionReasons);

  const aiSuggestion = hasRealAI && recommendedDecision
    ? `${decisionLabel(recommendedDecision)} — ${decisionReasoning || whatAbout.slice(0, 180)}`
    : String(row.AISuggestion || 'Review submission');

  return {
    id: String(row.ProjectId),
    student_name: name,
    student_avatar: initials(name),
    department: String(row.StudentUniversityId || ''),
    project_title: String(row.Title || ''),
    abstract: String(row.Abstract || ''),
    submission_date: row.SubmissionTime || row.SubmittedAt
      ? new Date(String(row.SubmissionTime || row.SubmittedAt)).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })
      : '—',
    status: mapStatus(row.Status),
    athena: {
      uniqueness_score: hasRealAI ? (aiQuality || Number(row.UniquenessScore) || 0) : (Number(row.UniquenessScore) || 0),
      ai_confidence: aiConfidence,
      historical_matches: [],
      active_collisions: similarity >= 60 && similarId
        ? [{ student_name: similarId, similarity, project_title: similarId }]
        : [],
      ai_suggestion: aiSuggestion,
      suggested_differentiators: featureSuggestions.slice(0, 5),
      rejection_reasons: rejectionReasons,
      realAI: hasRealAI ? {
        hasRealAI: true,
        whatProjectIsAbout: String(meta?.whatProjectIsAbout || row.AiSummary || ''),
        recommendedDecision: recommendedDecision as 'approve' | 'reject' | 'request_changes' | undefined,
        decisionConfidence: aiConfidence,
        decisionReasoning,
        decisionLabel: String(meta?.decisionLabel || decisionLabel(recommendedDecision)),
        whatShouldContain: parseJsonList(meta?.whatShouldContain || row.AiObjectives),
        featureSuggestions,
        strengths: parseJsonList(meta?.strengths),
        provider: String(meta?.provider || ''),
        model: String(meta?.model || ''),
        analyzedAt: row.AiAnalyzedAt ? String(row.AiAnalyzedAt) : undefined,
      } : undefined,
    },
  };
}

export function buildCollisionsFromSubmissions(submissions: Submission[]): CollisionAlert[] {
  const byPair = new Map<string, CollisionAlert>();

  for (const s of submissions) {
    for (const c of s.athena.active_collisions) {
      if (c.similarity < 60) continue;
      const key = [s.project_title, c.project_title || c.student_name].sort().join('::');
      const existing = byPair.get(key);
      const student = {
        name: s.student_name,
        avatar: s.student_avatar,
        project: s.project_title,
        abstract: s.abstract,
      };
      if (existing) {
        if (!existing.students.some(st => st.name === student.name)) {
          existing.students.push(student);
        }
      } else {
        byPair.set(key, {
          id: key,
          students: [student],
          similarity: c.similarity,
          common_keywords: [],
          ai_resolution: s.athena.ai_suggestion,
        });
      }
    }
  }

  return [...byPair.values()];
}
