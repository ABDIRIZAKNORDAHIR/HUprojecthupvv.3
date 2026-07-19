import type { ReportSection, ExportReportMeta, ExportChartBlock } from './exportReport';
import type { Submission } from '../types';
import { APP_BRAND_NAME, UNIVERSITY_NAME } from '../config/appImages';
import {
  buildTeacherSummaryChartData,
  buildTeacherStatusChartData,
  buildTeacherAiScoreChartData,
  buildTeacherApprovalTrendData,
  buildTeacherStatusExportRows,
  buildTeacherAiScoreExportRows,
  type TeacherExportSummary,
} from './teacherExportCharts';

export function buildTeacherReportSections(
  submissions: Submission[],
  summary: { pending: number; unique: number; collisions: number; approved: number; teacherName: string }
): ReportSection[] {
  const summaryRows: unknown[][] = [
    ['Teacher', summary.teacherName],
    ['Pending AI Review', summary.pending],
    ['Unique Projects (>80%)', summary.unique],
    ['Collision Alerts', summary.collisions],
    ['Approved Projects', summary.approved],
    ['Total Submissions', submissions.length],
    ['Report Generated', new Date().toLocaleString()],
  ];

  const statusRows = buildTeacherStatusExportRows(submissions);
  const aiScoreRows = buildTeacherAiScoreExportRows(submissions);

  const submissionRows = submissions.map(s => [
    s.student_name,
    s.project_title,
    s.athena.uniqueness_score,
    s.athena.ai_confidence,
    s.status.replace(/_/g, ' '),
    s.submission_date,
    s.athena.ai_suggestion,
  ]);

  return [
    { sheetName: 'Statistics', headers: ['Metric', 'Value'], rows: summaryRows },
    { sheetName: 'Status Breakdown', headers: ['Status', 'Count'], rows: statusRows },
    { sheetName: 'AI Scores', headers: ['Score Range', 'Count'], rows: aiScoreRows },
    {
      sheetName: 'Submissions',
      headers: ['Student', 'Project', 'AI Score', 'Confidence', 'Status', 'Date', 'AI Suggestion'],
      rows: submissionRows.length ? submissionRows : [['—', 'No submissions', '—', '—', '—', '—', '—']],
    },
  ];
}

export function buildTeacherExportCharts(
  summary: TeacherExportSummary,
  submissions: Submission[]
): ExportChartBlock[] {
  const summaryData = buildTeacherSummaryChartData(summary);
  const statusData = buildTeacherStatusChartData(submissions);
  const aiScoreData = buildTeacherAiScoreChartData(submissions);
  const trendData = buildTeacherApprovalTrendData(submissions).slice(-14);

  return [
    {
      title: 'Summary Statistics',
      subtitle: `${summary.total} total submissions`,
      type: 'bar',
      barData: summaryData.map(d => ({ label: d.name, value: d.count, color: d.fill })),
    },
    {
      title: 'Submissions by Status',
      type: 'pie',
      barData: statusData.map(d => ({ label: d.name, value: d.count, color: d.fill })),
    },
    {
      title: 'AI Uniqueness Scores',
      subtitle: 'Distribution of AI analysis scores',
      type: 'bar',
      barData: aiScoreData.map(d => ({ label: d.range, value: d.count, color: '#7C3AED' })),
    },
    {
      title: 'Approval Trend',
      subtitle: 'Last 14 days',
      type: 'line',
      lineSeries: [
        {
          key: 'approvals',
          label: 'Approvals',
          color: '#16A34A',
          points: trendData.map(d => ({ x: d.day, y: d.approvals })),
        },
        {
          key: 'rejections',
          label: 'Rejections',
          color: '#EF4444',
          points: trendData.map(d => ({ x: d.day, y: d.rejections })),
        },
      ],
    },
  ];
}

export function buildTeacherExportMeta(summary: TeacherExportSummary, submissions: Submission[]): ExportReportMeta {
  return {
    reportType: 'teacher',
    organization: UNIVERSITY_NAME,
    teacherName: summary.teacherName,
    subtitle: `${APP_BRAND_NAME} · Teacher review & AI analytics`,
    charts: buildTeacherExportCharts(summary, submissions),
  };
}

export type { TeacherExportSummary };
