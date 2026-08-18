import { motion, useReducedMotion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  Activity, BarChart3, CheckCircle2, Clock3, FileSpreadsheet,
  ShieldCheck, TrendingUp,
} from 'lucide-react';
import { ExportButtons } from './ExportButtons';
import {
  buildTeacherSummaryChartData,
  buildTeacherStatusChartData,
  buildTeacherAiScoreChartData,
  buildTeacherApprovalTrendData,
  type TeacherExportSummary,
} from '../utils/teacherExportCharts';
import type { Submission } from '../types';

interface TeacherExportPreviewProps {
  submissions: Submission[];
  summary: TeacherExportSummary;
  onExportExcel: () => void;
  onExportPdf: () => void;
  compact?: boolean;
}

export function TeacherExportPreview({
  submissions,
  summary,
  onExportExcel,
  onExportPdf,
  compact = false,
}: TeacherExportPreviewProps) {
  const reducedMotion = useReducedMotion();
  const summaryData = buildTeacherSummaryChartData(summary);
  const statusData = buildTeacherStatusChartData(submissions);
  const aiScoreData = buildTeacherAiScoreChartData(submissions);
  const trendData = buildTeacherApprovalTrendData(submissions).slice(-14);
  const hasSubmissions = submissions.length > 0;
  const activeStatusData = statusData.filter(d => d.count > 0);
  const approvalRate = summary.total ? Math.round((summary.approved / summary.total) * 100) : 0;
  const uniquenessRate = summary.total ? Math.round((summary.unique / summary.total) * 100) : 0;
  const kpis = [
    { label: 'Total submissions', value: summary.total, icon: FileSpreadsheet, tone: 'emerald' },
    { label: 'Awaiting review', value: summary.pending, icon: Clock3, tone: 'amber' },
    { label: 'Approval rate', value: `${approvalRate}%`, icon: CheckCircle2, tone: 'teal' },
    { label: 'High uniqueness', value: `${uniquenessRate}%`, icon: ShieldCheck, tone: 'blue' },
  ];
  const motionProps = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };
  const tooltipStyle = {
    border: '1px solid #dce9e3',
    borderRadius: 14,
    boxShadow: '0 14px 34px rgba(6,48,31,.12)',
    fontSize: 12,
  };

  return (
    <section className={`report-studio ${compact ? 'report-studio--compact' : ''}`}>
      <header className="report-studio__hero">
        <div className="report-studio__hero-copy">
          <span className="report-studio__eyebrow"><Activity size={13} /> Live report studio</span>
          <h2>Submission intelligence</h2>
          <p>
            A decision-ready view of reviews, originality and approval performance
            {summary.teacherName ? ` · ${summary.teacherName}` : ''}
          </p>
        </div>
        <div className="report-studio__actions">
          <span className="report-studio__fresh"><i /> Updated now</span>
          <ExportButtons label="Export report" variant="onDark" onExportExcel={onExportExcel} onExportPdf={onExportPdf} />
        </div>
      </header>

      {!hasSubmissions ? (
        <div className="report-studio__empty">
          <span><FileSpreadsheet size={30} /></span>
          <h3>Your report is ready for data</h3>
          <p>Charts and export insights appear automatically when students submit projects.</p>
        </div>
      ) : (
        <>
          <div className="report-studio__kpis">
            {kpis.map(({ label, value, icon: Icon, tone }, index) => (
              <motion.article
                key={label}
                {...motionProps}
                transition={{ duration: .4, delay: reducedMotion ? 0 : index * .05 }}
                className={`report-kpi report-kpi--${tone}`}
              >
                <span><Icon size={18} /></span>
                <div><strong>{value}</strong><p>{label}</p></div>
              </motion.article>
            ))}
          </div>

          <div className="report-studio__grid">
          <motion.div
            {...motionProps}
            className="report-chart"
          >
            <div className="report-chart__head">
              <div><span className="report-chart__icon"><BarChart3 size={16} /></span><div><h3>Review pipeline</h3><p>Submission volume by outcome</p></div></div>
              <em>Statistics</em>
            </div>
            <ResponsiveContainer width="100%" height={compact ? 210 : 250}>
              <BarChart data={summaryData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" stroke="#e7efeb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#698078', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#8aa097' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(16,185,129,.05)' }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="url(#reportBar)" maxBarSize={46} radius={[10, 10, 3, 3]} animationDuration={reducedMotion ? 0 : 900}>
                  {summaryData.map((entry, i) => (
                    <Cell key={i} fill={i === 0 ? '#f59e0b' : i === 2 ? '#0f766e' : 'url(#reportBar)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            {...motionProps}
            transition={{ delay: 0.05 }}
            className="report-chart"
          >
            <div className="report-chart__head">
              <div><span className="report-chart__icon report-chart__icon--teal"><Activity size={16} /></span><div><h3>Status distribution</h3><p>Live review workload</p></div></div>
              <em>Status</em>
            </div>
            <div className="report-donut">
            <ResponsiveContainer width="100%" height={compact ? 210 : 250}>
              <PieChart>
                <Pie
                  data={activeStatusData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={compact ? 58 : 68}
                  outerRadius={compact ? 82 : 96}
                  paddingAngle={4}
                  cornerRadius={8}
                  animationDuration={reducedMotion ? 0 : 900}
                >
                  {activeStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="report-donut__center"><strong>{summary.total}</strong><span>Total</span></div>
            </div>
            <div className="report-legend">
              {statusData.map(item => <span key={item.name}><i style={{ background: item.fill }} />{item.name}<strong>{item.count}</strong></span>)}
            </div>
          </motion.div>

          {!compact && (
            <>
              <motion.div
                {...motionProps}
                transition={{ delay: 0.1 }}
                className="report-chart"
              >
                <div className="report-chart__head">
                  <div><span className="report-chart__icon report-chart__icon--blue"><ShieldCheck size={16} /></span><div><h3>Originality confidence</h3><p>Uniqueness score distribution</p></div></div>
                  <em>Analysis</em>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={aiScoreData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 6" stroke="#e7efeb" vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#698078', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#8aa097' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#0f766e" maxBarSize={48} radius={[10, 10, 3, 3]} animationDuration={reducedMotion ? 0 : 900} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                {...motionProps}
                transition={{ delay: 0.15 }}
                className="report-chart"
              >
                <div className="report-chart__head">
                  <div><span className="report-chart__icon"><TrendingUp size={16} /></span><div><h3>Approval momentum</h3><p>Decision activity over 14 days</p></div></div>
                  <em>Trend</em>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData} margin={{ top: 16, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 6" stroke="#e7efeb" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#698078' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#8aa097' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="approvals" name="Approvals" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} animationDuration={reducedMotion ? 0 : 900} />
                    <Line type="monotone" dataKey="rejections" name="Rejections" stroke="#f97316" strokeWidth={2.5} strokeDasharray="6 4" dot={false} animationDuration={reducedMotion ? 0 : 900} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="report-line-key"><span><i /> Approvals</span><span><i /> Rejections</span></div>
              </motion.div>
            </>
          )}
        </div>
        </>
      )}
    </section>
  );
}
