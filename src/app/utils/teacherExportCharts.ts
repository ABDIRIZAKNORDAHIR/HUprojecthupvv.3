import type { Submission, SubmissionStatus } from '../types';
import { buildApprovalStats } from './teacherDashboardData';

export interface TeacherExportSummary {
  pending: number;
  unique: number;
  collisions: number;
  approved: number;
  total: number;
  teacherName: string;
}

/** KPI bar chart — mirrors the Statistics sheet in Excel/PDF */
export function buildTeacherSummaryChartData(
  summary: Pick<TeacherExportSummary, 'pending' | 'unique' | 'collisions' | 'approved'>
) {
  return [
    { name: 'Pending', count: summary.pending, fill: '#EF4444' },
    { name: 'Unique (>80%)', count: summary.unique, fill: '#16A34A' },
    { name: 'Collisions', count: summary.collisions, fill: '#EAB308' },
    { name: 'Approved', count: summary.approved, fill: '#2563EB' },
  ];
}

/** Status breakdown — exported in Status Breakdown sheet */
export function buildTeacherStatusChartData(submissions: Submission[]) {
  const counts: Record<SubmissionStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    changes_requested: 0,
  };
  for (const s of submissions) counts[s.status]++;

  return [
    { name: 'Pending', count: counts.pending, fill: '#EF4444' },
    { name: 'Approved', count: counts.approved, fill: '#16A34A' },
    { name: 'Rejected', count: counts.rejected, fill: '#DC2626' },
    { name: 'Changes Req.', count: counts.changes_requested, fill: '#2563EB' },
  ];
}

export function buildTeacherStatusExportRows(submissions: Submission[]) {
  return buildTeacherStatusChartData(submissions).map(d => [d.name, d.count]);
}

/** AI uniqueness score buckets — exported in AI Scores sheet */
export function buildTeacherAiScoreChartData(submissions: Submission[]) {
  const buckets = [
    { range: '0–50', min: 0, max: 50, count: 0 },
    { range: '51–70', min: 51, max: 70, count: 0 },
    { range: '71–80', min: 71, max: 80, count: 0 },
    { range: '81–100', min: 81, max: 100, count: 0 },
  ];
  for (const s of submissions) {
    const score = s.athena.uniqueness_score;
    const bucket = buckets.find(b => score >= b.min && score <= b.max);
    if (bucket) bucket.count++;
  }
  return buckets.map(b => ({ range: b.range, count: b.count }));
}

export function buildTeacherAiScoreExportRows(submissions: Submission[]) {
  return buildTeacherAiScoreChartData(submissions).map(d => [d.range, d.count]);
}

/** Re-export approval trend for charts aligned with export */
export function buildTeacherApprovalTrendData(submissions: Submission[]) {
  return buildApprovalStats(submissions);
}
