import type { Submission } from '../types';

const STOP_WORDS = new Set(['the', 'a', 'an', 'for', 'and', 'or', 'of', 'in', 'to', 'with', 'based', 'using', 'project']);

export function buildActivityFeed(submissions: Submission[]) {
  return submissions.slice(0, 6).map(s => ({
    id: s.id,
    type: s.athena.active_collisions.length ? 'flag' as const : s.status === 'approved' ? 'approve' as const : 'submit' as const,
    text:
      s.status === 'pending'
        ? `${s.student_name} submitted "${s.project_title}" for review`
        : `${s.student_name}'s "${s.project_title}" was ${s.status.replace('_', ' ')}`,
    time: s.submission_date,
  }));
}

export function buildApprovalStats(submissions: Submission[]) {
  const byDay = new Map<string, { day: string; approvals: number; rejections: number }>();
  for (const s of submissions) {
    const day = s.submission_date || '—';
    if (!byDay.has(day)) byDay.set(day, { day, approvals: 0, rejections: 0 });
    const entry = byDay.get(day)!;
    if (s.status === 'approved') entry.approvals++;
    else if (s.status === 'rejected') entry.rejections++;
  }
  const rows = [...byDay.values()];
  return rows.length ? rows.slice(-14) : [{ day: 'No data', approvals: 0, rejections: 0 }];
}

export function buildTopKeywords(submissions: Submission[]) {
  const words = new Map<string, number>();
  for (const s of submissions) {
    for (const w of `${s.project_title} ${s.abstract}`.toLowerCase().split(/\W+/)) {
      if (w.length > 3 && !STOP_WORDS.has(w)) words.set(w, (words.get(w) || 0) + 1);
    }
  }
  const ranked = [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return ranked.length ? ranked.map(([keyword, count]) => ({ keyword, count })) : [{ keyword: 'No submissions yet', count: 0 }];
}

export function buildPresentations(submissions: Submission[]) {
  return submissions
    .filter(s => s.status === 'pending' || s.status === 'approved' || s.status === 'changes_requested')
    .slice(0, 4)
    .map(s => ({
      id: s.id,
      project: s.project_title,
      student: s.student_name,
      date: s.submission_date,
      time: 'Scheduled',
      room: 'Review queue',
    }));
}

export function buildRecentFeedback(submissions: Submission[]) {
  return submissions
    .filter(s => s.athena.ai_suggestion && s.athena.ai_suggestion !== 'Review submission')
    .slice(0, 4)
    .map(s => ({
      id: s.id,
      student: s.student_name,
      project: s.project_title,
      text: s.athena.ai_suggestion,
      time: s.submission_date,
    }));
}

export function buildAthenaTip(pending: number, collisions: number) {
  if (pending > 0) return `${pending} submission(s) awaiting review — prioritize items with collision alerts.`;
  if (collisions > 0) return `${collisions} collision alert(s) detected. Compare similar projects before approving.`;
  return 'All caught up — no pending submissions in your queue.';
}
