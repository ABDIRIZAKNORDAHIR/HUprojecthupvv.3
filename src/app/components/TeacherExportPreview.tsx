import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { BarChart3, FileSpreadsheet, TrendingUp } from 'lucide-react';
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
  const summaryData = buildTeacherSummaryChartData(summary);
  const statusData = buildTeacherStatusChartData(submissions);
  const aiScoreData = buildTeacherAiScoreChartData(submissions);
  const trendData = buildTeacherApprovalTrendData(submissions).slice(-14);
  const hasSubmissions = submissions.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-600" />
            <h2 style={{ fontSize: compact ? 15 : 18, fontWeight: 800, color: '#111827' }}>
              Export Report Preview
            </h2>
          </div>
          <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            Charts below match the data in your Excel and PDF export
            {summary.teacherName ? ` · ${summary.teacherName}` : ''}
          </p>
        </div>
        <ExportButtons
          label="Download report"
          onExportExcel={onExportExcel}
          onExportPdf={onExportPdf}
        />
      </div>

      {!hasSubmissions ? (
        <div className="bg-white rounded-xl border border-dashed border-border p-8 text-center">
          <FileSpreadsheet size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 font-medium">No submissions yet — charts will appear when students submit projects.</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${compact ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-border shadow-sm p-5"
          >
            <h3 className="font-bold text-sm mb-1 flex items-center gap-2 text-gray-800">
              <BarChart3 size={14} className="text-blue-600" /> Summary Statistics
            </h3>
            <p className="text-xs text-gray-400 mb-3">Sheet: Statistics · {summary.total} total submissions</p>
            <ResponsiveContainer width="100%" height={compact ? 180 : 220}>
              <BarChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {summaryData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-xl border border-border shadow-sm p-5"
          >
            <h3 className="font-bold text-sm mb-1 text-gray-800">Submissions by Status</h3>
            <p className="text-xs text-gray-400 mb-3">Sheet: Status Breakdown</p>
            <ResponsiveContainer width="100%" height={compact ? 180 : 220}>
              <PieChart>
                <Pie
                  data={statusData.filter(d => d.count > 0)}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={compact ? 65 : 75}
                  label={({ name, count }) => `${name}: ${count}`}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {!compact && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl border border-border shadow-sm p-5"
              >
                <h3 className="font-bold text-sm mb-1 text-gray-800">AI Uniqueness Scores</h3>
                <p className="text-xs text-gray-400 mb-3">Sheet: AI Scores · distribution of Athena scores</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={aiScoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-xl border border-border shadow-sm p-5"
              >
                <h3 className="font-bold text-sm mb-1 flex items-center gap-2 text-gray-800">
                  <TrendingUp size={14} className="text-green-600" /> Approval Trend
                </h3>
                <p className="text-xs text-gray-400 mb-3">Sheet: Submissions · approvals vs rejections by date</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="approvals" name="Approvals" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="rejections" name="Rejections" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            </>
          )}
        </div>
      )}

      {hasSubmissions && (
        <div className="bg-blue-50/60 rounded-xl border border-blue-100 px-4 py-3">
          <p className="text-xs text-blue-800">
            <strong>Professional export includes:</strong> Hormuud ProjectHub logo &amp; branding,
            summary/status/AI/trend charts, styled Excel sheets (Cover + Charts + data),
            and full submissions with scores and AI suggestions.
          </p>
        </div>
      )}
    </div>
  );
}
