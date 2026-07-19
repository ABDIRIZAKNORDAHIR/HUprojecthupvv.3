import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Sparkles, AlertTriangle, CheckCircle2, ClipboardList,
  Presentation, MessageSquare, Edit3, Trash2, Download, Users
} from "lucide-react";
import { KPICard } from "./KPICard";
import { SwipeReviewCard } from "./SwipeReviewCard";
import { CollisionsPanel } from "./CollisionsPanel";
import { SubmissionsTable } from "./SubmissionsTable";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { mapApiRowToSubmission, buildCollisionsFromSubmissions } from "../utils/mapSubmissions";
import {
  buildActivityFeed, buildApprovalStats, buildTopKeywords,
  buildPresentations, buildRecentFeedback,
} from "../utils/teacherDashboardData";
import { TeacherAssignmentPanel } from "./TeacherAssignmentPanel";
import { ExportButtons } from "./ExportButtons";
import { TeacherExportPreview } from "./TeacherExportPreview";
import { buildTeacherReportSections, buildTeacherExportMeta } from "../utils/teacherExport";
import { exportMultiSheetExcel, exportMultiSectionPdf } from "../utils/exportReport";
import type { Submission } from "../types";
import type { ViewId } from "../types";

interface TeacherDashboardProps {
  activeView: ViewId;
}

export function TeacherDashboard({ activeView }: TeacherDashboardProps) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.UserId) return;
    setLoading(true);
    try {
      const res = await api.getSubmissionsList();
      setSubmissions(res.submissions.map(mapApiRowToSubmission));
    } catch (e) {
      console.error(e);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.UserId]);

  useEffect(() => { load(); }, [load]);

  const pending = submissions.filter(s => s.status === "pending");
  const uniqueCount = submissions.filter(s => s.athena.uniqueness_score > 80).length;
  const collisionAlerts = buildCollisionsFromSubmissions(submissions);
  const collisionCount = collisionAlerts.length;
  const approvedWeek = submissions.filter(s => s.status === "approved").length;

  const activityFeed = buildActivityFeed(submissions);
  const approvalStats = buildApprovalStats(submissions);
  const topKeywords = buildTopKeywords(submissions);
  const presentations = buildPresentations(submissions);
  const recentFeedback = buildRecentFeedback(submissions);
  const athenaTip = pending.length
    ? `${pending.length} in queue`
    : collisionCount > 0
      ? `${collisionCount} collisions`
      : '';

  const myStudents = submissions.reduce((acc, s) => {
    if (!acc.some(x => x.id === s.department && x.name === s.student_name)) {
      acc.push({ name: s.student_name, id: s.department, project: s.project_title, status: s.status });
    }
    return acc;
  }, [] as Array<{ name: string; id: string; project: string; status: string }>);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const initials = `${user?.FirstName?.[0] || ''}${user?.LastName?.[0] || ''}`;

  const handleApprove = async (id: string) => {
    await api.reviewProject(Number(id), { action: 'approved' });
    load();
  };
  const handleReject = async (id: string, reason: string) => {
    await api.reviewProject(Number(id), { action: 'rejected', rejectionReason: reason });
    load();
  };
  const handleChanges = async (id: string) => {
    await api.reviewProject(Number(id), { action: 'changes_requested', message: 'Please revise your submission.' });
    load();
  };

  const exportSummary = {
    pending: pending.length,
    unique: uniqueCount,
    collisions: collisionCount,
    approved: approvedWeek,
    total: submissions.length,
    teacherName: `${user?.FirstName || ''} ${user?.LastName || ''}`.trim(),
  };

  const exportTeacherReport = (format: 'excel' | 'pdf') => {
    const sections = buildTeacherReportSections(submissions, exportSummary);
    const meta = buildTeacherExportMeta(exportSummary, submissions);
    const stamp = new Date().toISOString().slice(0, 10);
    const title = 'Hormuud ProjectHub — Teacher Report & Statistics';
    if (format === 'excel') {
      exportMultiSheetExcel(`Hormuud-ProjectHub-Teacher-Report-${stamp}`, sections, meta);
    } else {
      exportMultiSectionPdf(title, sections, `Hormuud-Teacher-Report-${stamp}.pdf`, meta);
    }
  };

  if (loading && submissions.length === 0) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (activeView === "ai-queue") {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <TeacherAssignmentPanel />
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="text-green-600" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>AI Review Queue</h1>
          </div>
          <p style={{ fontSize: 14, color: "#64748B" }}>{pending.length} submissions awaiting your review</p>
        </div>
        <SwipeReviewCard submissions={pending} onApprove={handleApprove} onReject={handleReject} onRequestChanges={handleChanges} />
      </div>
    );
  }

  if (activeView === "submissions") {
    return (
      <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto space-y-6 pb-mobile-nav">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>All Submissions</h1>
        </div>
        <TeacherExportPreview
          submissions={submissions}
          summary={exportSummary}
          onExportExcel={() => exportTeacherReport('excel')}
          onExportPdf={() => exportTeacherReport('pdf')}
        />
        <SubmissionsTable data={submissions} />
      </div>
    );
  }

  if (activeView === "analytics") {
    return (
      <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto space-y-6 pb-mobile-nav">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden p-6"
          style={{ background: "linear-gradient(135deg, #0F2D5C 0%, #168055 100%)" }}>
          <h1 style={{ color: "white", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>Reports</h1>
        </motion.div>
        <TeacherExportPreview
          submissions={submissions}
          summary={exportSummary}
          onExportExcel={() => exportTeacherReport('excel')}
          onExportPdf={() => exportTeacherReport('pdf')}
        />
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Submissions</h2>
          </div>
          <SubmissionsTable data={submissions} />
        </div>
      </div>
    );
  }

  if (activeView === "collisions") {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-yellow-600" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Collision Alerts</h1>
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">{collisionCount}</span>
        </div>
        <CollisionsPanel collisions={collisionAlerts} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto pb-24 md:pb-6">
      <TeacherAssignmentPanel />
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
        style={{ background: "linear-gradient(135deg, #0F2D5C 0%, #168055 100%)" }}>
        <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between gap-4">
          <div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{greeting}</p>
          <h1 style={{ color: "white", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>
            {user?.FirstName} {user?.LastName}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 4 }}>{dateStr}</p>
          {athenaTip ? (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
              <Sparkles size={12} className="text-emerald-200" />
              <span style={{ color: "white", fontSize: 12, fontWeight: 600 }}>{athenaTip}</span>
            </div>
          ) : null}
          </div>
          <ExportButtons
            variant="onDark"
            label="Export"
            onExportExcel={() => exportTeacherReport('excel')}
            onExportPdf={() => exportTeacherReport('pdf')}
          />
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-1 bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-3"
            style={{ background: "linear-gradient(135deg, #0F2D5C, #168055)" }}>
            {initials}
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{user?.FirstName} {user?.LastName}</p>
          <p className="font-mono text-xs font-bold text-green-700 mt-1">{user?.UniversityId}</p>
          <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{user?.Department || 'Faculty'}</p>
        </motion.div>
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Queue" value={pending.length} icon={ClipboardList} iconColor="#EF4444" iconBg="#FEF2F2" index={0} />
          <KPICard title="Unique" value={uniqueCount} icon={Sparkles} iconColor="#16A34A" iconBg="#F0FDF4" index={1} />
          <KPICard title="Collisions" value={collisionCount} icon={AlertTriangle} iconColor="#EAB308" iconBg="#FEFCE8" index={2} />
          <KPICard title="Approved" value={approvedWeek} icon={CheckCircle2} iconColor="#2563EB" iconBg="#EFF6FF" index={3} />
        </div>
      </div>

      {myStudents.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2 bg-gradient-to-r from-blue-50 to-green-50">
            <Users size={18} className="text-blue-600" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>My Students</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{myStudents.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  {['Student', 'HU ID', 'Project', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myStudents.map(st => (
                  <tr key={`${st.id}-${st.name}`} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold">{st.name}</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-green-700">{st.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{st.project}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 capitalize">{st.status.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TeacherExportPreview
        compact
        submissions={submissions}
        summary={exportSummary}
        onExportExcel={() => exportTeacherReport('excel')}
        onExportPdf={() => exportTeacherReport('pdf')}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-green-600" />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>AI Review Queue</h2>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">{pending.length}</span>
            </div>
          </div>
          <SwipeReviewCard submissions={pending.slice(0, 4)} onApprove={handleApprove} onReject={handleReject} onRequestChanges={handleChanges} />
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-yellow-600" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Collision Alerts</h2>
          </div>
          <CollisionsPanel collisions={collisionAlerts} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Student Activity Feed</h2>
          <div className="space-y-3">
            {activityFeed.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No student activity yet</p>
            ) : activityFeed.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: a.type === "flag" ? "#EAB308" : a.type === "approve" ? "#16A34A" : "#2563EB" }} />
                <div className="flex-1">
                  <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{a.text}</p>
                  <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{a.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Approval Statistics</h2>
          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>Approvals vs rejections over 30 days</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={approvalStats.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="approvals" stroke="#16A34A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rejections" stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-border">
            <p style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>Top Keywords</p>
            <div className="flex flex-wrap gap-2">
              {topKeywords.map(kw => (
                <span key={kw.keyword} className="px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                  {kw.keyword} <span className="text-green-600 font-bold">{kw.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Upcoming Presentations</h2>
            <Presentation size={16} className="text-gray-400" />
          </div>
          <div className="space-y-3">
            {presentations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No scheduled presentations</p>
            ) : presentations.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}
                className="p-3 rounded-xl border border-border hover:border-blue-200 transition-colors">
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.project}</p>
                <p style={{ fontSize: 11, color: "#64748B" }}>{p.student} · {p.date} · {p.time} · {p.room}</p>
                <div className="flex gap-2 mt-2">
                  <button className="flex items-center gap-1 text-xs font-semibold text-blue-600"><Download size={12} /> Materials</button>
                  <button className="flex items-center gap-1 text-xs font-semibold text-green-600"><MessageSquare size={12} /> Feedback</button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Recent Feedback</h2>
          <div className="space-y-3">
            {recentFeedback.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No AI feedback yet — submissions will appear here</p>
            ) : recentFeedback.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{f.student} — {f.project}</span>
                  <div className="flex gap-1">
                    <button className="p-1 rounded hover:bg-gray-100 text-gray-400"><Edit3 size={12} /></button>
                    <button className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>{f.text}</p>
                <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>{f.time}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
