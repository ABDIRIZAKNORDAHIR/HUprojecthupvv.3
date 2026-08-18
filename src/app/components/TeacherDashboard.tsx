import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  ClipboardList, CheckCircle2,
  Presentation, MessageSquare, Users, CalendarPlus
} from "lucide-react";
import { Link } from "react-router";
import { KPICard } from "./KPICard";
import { SubmissionOverviewBoard } from "./SubmissionOverviewBoard";
import { SubmissionBrowser } from "./SubmissionBrowser";
import { SubmissionsTable } from "./SubmissionsTable";
import { api, type TeacherStudent } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { mapApiRowToSubmission, awaitsTeacherReview, byArrival } from "../utils/mapSubmissions";
import {
  buildActivityFeed, buildApprovalStats, buildTopKeywords,
  buildPresentations, buildRecentFeedback,
} from "../utils/teacherDashboardData";
import { TeacherAssignmentPanel } from "./TeacherAssignmentPanel";
import { ExportButtons } from "./ExportButtons";
import { TeacherExportPreview } from "./TeacherExportPreview";
import { PageHero } from "./PageHero";
import { UserAvatar } from "./UserAvatar";
import { WaitingBadge, WaitingMark } from "./WaitingIcon";
import { HU_IMAGES } from "../config/appImages";
import { formatUniversityId } from "../utils/universityId";
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
  const [roster, setRoster] = useState<TeacherStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueMode, setQueueMode] = useState<'browse' | 'list'>('browse');
  const [queueFilter, setQueueFilter] = useState<'waiting' | 'all'>('waiting');

  const load = useCallback(async () => {
    if (!user?.UserId) return;
    setLoading(true);
    try {
      const [res, people] = await Promise.all([
        api.getSubmissionsList(),
        api.getTeacherStudents().catch(() => ({ students: [] as TeacherStudent[] })),
      ]);
      setSubmissions(res.submissions.map(mapApiRowToSubmission));
      setRoster(people.students);
    } catch (e) {
      console.error(e);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.UserId]);

  useEffect(() => { load(); }, [load]);

  // Oldest arrival first, so the queue opens on the very first project received.
  const arrived = [...submissions].sort(byArrival);
  const pending = arrived.filter(awaitsTeacherReview);
  // Never show an empty queue when the teacher has history to look through.
  const queueItems = queueFilter === 'waiting' && pending.length > 0 ? pending : arrived;
  const uniqueCount = submissions.filter(s => s.athena.uniqueness_score > 80).length;
  const approvedWeek = submissions.filter(s => s.status === "approved").length;

  const activityFeed = buildActivityFeed(submissions);
  const approvalStats = buildApprovalStats(submissions);
  const topKeywords = buildTopKeywords(submissions);
  const presentations = buildPresentations(submissions);
  const recentFeedback = buildRecentFeedback(submissions);
  const athenaTip = pending.length ? `${pending.length} in queue` : '';

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const exportSummary = {
    pending: pending.length,
    unique: uniqueCount,
    collisions: 0,
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
      <div className="dashboard-canvas max-w-5xl space-y-6 pb-mobile-nav">
        <PageHero
          dense
          icon={ClipboardList}
          eyebrow="Academic review"
          title="Review queue"
          subtitle="Browse each project from the first one, then open it to decide."
          image={HU_IMAGES.library}
        >
          <div className="hero-stat">
            <WaitingBadge>{pending.length} waiting</WaitingBadge>
          </div>
        </PageHero>

        {arrived.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(['browse', 'list'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setQueueMode(mode)}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-colors ${
                  queueMode === mode ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mode === 'browse' ? 'Browse one by one' : 'List view'}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={() => setQueueFilter('waiting')}
              disabled={pending.length === 0}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-40 ${
                queueFilter === 'waiting' && pending.length > 0
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Waiting ({pending.length})
            </button>
            <button
              type="button"
              onClick={() => setQueueFilter('all')}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-colors ${
                queueFilter === 'all' || pending.length === 0
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All projects ({arrived.length})
            </button>
          </div>
        )}

        {queueMode === 'browse'
          ? <SubmissionBrowser submissions={queueItems} />
          : <SubmissionOverviewBoard submissions={queueItems} />}
      </div>
    );
  }

  if (activeView === "submissions") {
    return (
      <div className="dashboard-canvas space-y-6 pb-mobile-nav">
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
      <div className="dashboard-canvas space-y-6 pb-mobile-nav">
        <TeacherExportPreview
          submissions={submissions}
          summary={exportSummary}
          onExportExcel={() => exportTeacherReport('excel')}
          onExportPdf={() => exportTeacherReport('pdf')}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-canvas space-y-6 pb-mobile-nav">
      <PageHero
        icon={Presentation}
        eyebrow="Supervisor workspace"
        title={`${greeting}, ${user?.FirstName || 'Supervisor'}`}
        subtitle={`${dateStr} · Review progress, guide student teams and move strong projects toward approval.`}
        image={HU_IMAGES.teamWork}
      >
        <div className="teacher-hero-actions">
          {athenaTip ? (
            <div className="teacher-hero-insight">
              <ClipboardList size={14} />
              <div><strong>{athenaTip}</strong><span>Needs your attention</span></div>
            </div>
          ) : null}
          <ExportButtons
            variant="onDark"
            label="Export"
            onExportExcel={() => exportTeacherReport('excel')}
            onExportPdf={() => exportTeacherReport('pdf')}
          />
        </div>
      </PageHero>
      <TeacherAssignmentPanel />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/class-assignments" className="assignment-card flex items-center gap-3 !p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-teal-700"><CalendarPlus size={20} /></span>
          <div><p className="font-bold text-sm">Create assignment</p><p className="text-xs text-gray-500">Publish work to a class</p></div>
        </Link>
        <Link to="/submissions" className="assignment-card flex items-center gap-3 !p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-700">
            {pending.length ? <WaitingMark size={20} /> : <ClipboardList size={20} />}
          </span>
          <div>
            <p className="font-bold text-sm">Review submissions</p>
            {pending.length
              ? <WaitingBadge size={11} className="mt-1">{pending.length} student{pending.length === 1 ? '' : 's'} waiting</WaitingBadge>
              : <p className="text-xs text-gray-500">Nothing waiting right now</p>}
          </div>
        </Link>
        <Link to="/messages" className="assignment-card flex items-center gap-3 !p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><MessageSquare size={20} /></span>
          <div><p className="font-bold text-sm">Student messages</p><p className="text-xs text-gray-500">Open conversations</p></div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-1 bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col items-center text-center">
          <UserAvatar
            firstName={user?.FirstName}
            lastName={user?.LastName}
            profileImageUrl={user?.ProfileImageUrl}
            role="teacher"
            size="lg"
            className="mb-3"
          />
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{user?.FirstName} {user?.LastName}</p>
          <p className="font-mono text-xs font-bold text-teal-700 mt-1">{user?.UniversityId}</p>
          <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{user?.Department || 'Faculty'}</p>
        </motion.div>
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICard title="Waiting for review" value={pending.length} icon={WaitingMark} iconColor="#B45309" iconBg="#FFF7E6" index={0} />
          <KPICard title="Unique" value={uniqueCount} icon={CheckCircle2} iconColor="#0891B2" iconBg="#ECFEFF" index={1} />
          <KPICard title="Approved" value={approvedWeek} icon={CheckCircle2} iconColor="#0F766E" iconBg="#F0FDFA" index={2} />
        </div>
      </div>

      {roster.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between bg-gradient-to-r from-cyan-50 to-teal-50">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-cyan-700" />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>My Students</h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{roster.length}</span>
            </div>
            <Link to="/students" className="text-xs font-bold text-teal-700 hover:underline">See all</Link>
          </div>
          <div className="divide-y">
            {roster.slice(0, 8).map(student => (
              <Link
                key={student.UserId}
                to={`/students/${student.UserId}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
              >
                <UserAvatar
                  firstName={student.FirstName}
                  lastName={student.LastName}
                  profileImageUrl={student.ProfileImageUrl}
                  role="student"
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{student.FirstName} {student.LastName}</p>
                  <p className="font-mono text-xs font-bold text-teal-700">{formatUniversityId(student.UniversityId)}</p>
                </div>
                <div className="hidden sm:flex flex-wrap gap-1 justify-end">
                  {student.barometers.uniqueness != null && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">Uniqueness {student.barometers.uniqueness}</span>
                  )}
                  {student.barometers.projectMark != null && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Mark {student.barometers.projectMark}</span>
                  )}
                </div>
              </Link>
            ))}
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

      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-cyan-600" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Waiting for review</h2>
            <WaitingBadge size={11}>{pending.length} waiting</WaitingBadge>
          </div>
          <Link to="/ai-queue" className="text-xs font-bold text-green-700 hover:underline">See all</Link>
        </div>
        <SubmissionOverviewBoard submissions={pending} limit={3} />
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
              <Line type="monotone" dataKey="approvals" stroke="#0F766E" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rejections" stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-border">
            <p style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>Top Keywords</p>
            <div className="flex flex-wrap gap-2">
              {topKeywords.map(kw => (
                <span key={kw.keyword} className="px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                  {kw.keyword} <span className="text-cyan-700 font-bold">{kw.count}</span>
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
                className="p-3 rounded-xl border border-border hover:border-cyan-200 transition-colors">
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.project}</p>
                <p style={{ fontSize: 11, color: "#64748B" }}>{p.student} · {p.date} · {p.time} · {p.room}</p>
                <span className="dashboard-live-pill mt-2"><i /> Scheduled</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Recent Feedback</h2>
          <div className="space-y-3">
            {recentFeedback.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No recent feedback yet — graded work will appear here</p>
            ) : recentFeedback.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{f.student} — {f.project}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 bg-cyan-50 px-2 py-0.5 rounded-full">Review note</span>
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
