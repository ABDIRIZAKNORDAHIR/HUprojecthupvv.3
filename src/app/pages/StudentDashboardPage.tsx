import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  MessageSquare, Trophy, BarChart3, FolderKanban, Mail, ChevronRight, Award, GraduationCap, Users, ClipboardList,
  Eye, CheckCircle2,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router';
import { api, type Project } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PageHero } from '../components/PageHero';
import { HU_IMAGES } from '../config/appImages';
import { KPICard } from '../components/KPICard';
import { QuickActionTile } from '../components/QuickActionTile';
import { ProgressRing } from '../components/ProgressRing';
import { GlassCard } from '../components/GlassCard';
import { WaitingMark } from '../components/WaitingIcon';

const statusLabel: Record<string, { text: string; color: string; bg: string; waiting?: boolean }> = {
  assigned: { text: 'In progress', color: '#2563EB', bg: '#EFF6FF' },
  submitted: { text: 'Awaiting teacher', color: '#B45309', bg: '#FFF7E6', waiting: true },
  under_review: { text: 'Under review', color: '#B45309', bg: '#FFF7E6', waiting: true },
  approved: { text: 'Approved', color: '#168055', bg: '#F0FDF4' },
  rejected: { text: 'Rejected', color: '#EF4444', bg: '#FEF2F2' },
  changes_requested: { text: 'Changes requested', color: '#EA580C', bg: '#FFF7ED' },
  pending_teacher: { text: 'Waiting for teacher', color: '#B45309', bg: '#FFF7E6', waiting: true },
};

function progressPercent(status: string): number {
  const map: Record<string, number> = {
    pending_teacher: 15,
    assigned: 40,
    changes_requested: 50,
    submitted: 70,
    under_review: 85,
    approved: 100,
    rejected: 30,
  };
  return map[status] ?? 25;
}

export function StudentDashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [inviteCount, setInviteCount] = useState(0);
  const [feedback, setFeedback] = useState<Array<Record<string, unknown>>>([]);
  const [achievements, setAchievements] = useState<Array<{ id: string; title: string; desc: string; earned: boolean }>>([]);
  const [stats, setStats] = useState({ totalProjects: 0, active: 0, approved: 0, pendingReview: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.UserId) return;
    setLoading(true);
    setError('');
    try {
      const [dash, inv] = await Promise.all([api.getStudentDashboard(), api.getInvitations()]);
      setProjects(dash.projects);
      setFeedback(dash.feedback);
      setAchievements(dash.achievements);
      setStats(dash.stats);
      setInviteCount(inv.invitations.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.UserId]);

  useEffect(() => { load(); }, [load]);

  const overallProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + progressPercent(p.Status), 0) / projects.length)
    : 0;
  const progressData = [
    { name: 'Active', value: stats.active, color: '#16A34A' },
    { name: 'In review', value: stats.pendingReview, color: '#84CC16' },
    { name: 'Approved', value: stats.approved, color: '#166534' },
    {
      name: 'Other',
      value: Math.max(0, stats.totalProjects - stats.active - stats.pendingReview - stats.approved),
      color: '#DDEBE5',
    },
  ].filter(item => item.value > 0);

  return (
    <div className="dashboard-canvas space-y-6 pb-mobile-nav">
      <PageHero
        icon={GraduationCap}
        eyebrow="Student workspace"
        title={`Welcome back, ${user?.FirstName || 'Student'}`}
        subtitle={`${user?.UniversityId || 'Student workspace'} · Keep your team, submissions and supervisor feedback visible in one place.`}
        image={HU_IMAGES.library}
      >
        {!loading && projects.length > 0 && (
          <div className="hero-stat flex items-center gap-3 text-left">
            <ProgressRing value={overallProgress} size={48} strokeWidth={5} color="#ffffff" />
            <div>
              <strong>{overallProgress}%</strong>
              <em>Overall progress</em>
            </div>
          </div>
        )}
      </PageHero>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4">
        <KPICard title="Projects" value={loading ? '…' : stats.totalProjects} icon={FolderKanban} iconColor="#166534" iconBg="#F0FDF4" index={0} />
        <KPICard title="Active" value={loading ? '…' : stats.active} icon={BarChart3} iconColor="#65A30D" iconBg="#F7FEE7" index={1} />
        <KPICard title="Invites" value={loading ? '…' : inviteCount} icon={Mail} iconColor="#EAB308" iconBg="#FEFCE8" index={2} />
        <KPICard title="Waiting on teacher" value={loading ? '…' : stats.pendingReview} icon={WaitingMark} iconColor="#B45309" iconBg="#FFF7E6" index={3} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickActionTile to="/projects" title="Projects" icon={FolderKanban} gradient="linear-gradient(135deg, #16A34A, #22C55E)" accent="#16A34A" index={0} />
        <QuickActionTile to="/class-assignments" title="Assignments" icon={ClipboardList} gradient="linear-gradient(135deg, #65A30D, #84CC16)" accent="#65A30D" index={1} />
        <QuickActionTile to="/my-teacher" title="Teacher" icon={GraduationCap} gradient="linear-gradient(135deg, #0F2D5C, #1E4E88)" accent="#0F2D5C" index={2} />
        <QuickActionTile to="/team" title="Team" icon={Users} gradient="linear-gradient(135deg, #166534, #16A34A)" accent="#166534" index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="dashboard-section-card lg:col-span-2 p-0" delay={0.06}>
          <div className="dashboard-section-card__head">
            <div>
              <span className="dashboard-section-card__eyebrow"><Eye size={13} /> Project visibility</span>
              <h2 className="mt-1">Your academic workspace at a glance</h2>
            </div>
            <span className="dashboard-live-pill"><i /> Synced now</span>
          </div>
          <div className="student-visibility-grid">
            <div className="student-visibility-chart">
              {progressData.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={progressData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={4}>
                      {progressData.map(item => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="student-empty-ring"><Eye size={22} /></div>
              )}
              <div className="student-visibility-chart__value"><strong>{overallProgress}%</strong><span>overall</span></div>
            </div>
            <div className="student-visibility-summary">
              <article><span><FolderKanban size={15} /></span><div><em>Projects visible</em><strong>{stats.totalProjects}</strong></div></article>
              <article className="is-waiting"><span><WaitingMark size={15} /></span><div><em>Awaiting review</em><strong>{stats.pendingReview}</strong></div></article>
              <article><span><CheckCircle2 size={15} /></span><div><em>Approved</em><strong>{stats.approved}</strong></div></article>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="dashboard-section-card student-next-card p-0" delay={0.1}>
          <div className="dashboard-section-card__head">
            <div>
              <span className="dashboard-section-card__eyebrow">Next step</span>
              <h2 className="mt-1">Keep the project moving</h2>
            </div>
          </div>
          <div className="student-next-card__body">
            <span className={`student-next-card__icon${stats.pendingReview > 0 ? ' is-waiting' : ''}`}>
              {stats.pendingReview > 0 ? <WaitingMark size={20} /> : <ClipboardList size={20} />}
            </span>
            <strong>{stats.pendingReview > 0 ? 'Waiting for supervisor feedback' : 'Review your active milestones'}</strong>
            <p>{stats.pendingReview > 0
              ? `${stats.pendingReview} project${stats.pendingReview === 1 ? ' is' : 's are'} currently with your supervisor.`
              : 'Open your project workspace and complete the next assigned task.'}</p>
            <Link to="/projects">Open projects <ChevronRight size={14} /></Link>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project progress — advanced cards */}
        <GlassCard className="lg:col-span-2 p-5" delay={0.1}>
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-green-600" /> Progress
          </h3>
          {projects.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400">No projects</p>
              <Link to="/projects" className="inline-block mt-3 text-sm font-semibold text-green-600 hover:underline">
                New project
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map(p => {
                const cfg = statusLabel[p.Status] || statusLabel.assigned || { text: 'In progress', color: '#2563EB', bg: '#EFF6FF' };
                const pct = progressPercent(p.Status);
                return (
                  <Link
                    key={p.ProjectId}
                    to={`/projects/${p.ProjectId}`}
                    className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition-all group"
                  >
                    <ProgressRing value={pct} size={44} strokeWidth={4} color={cfg.color} />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-[10px] font-bold text-green-700">{p.TeacherAssignedId}</span>
                      <p className="text-sm font-semibold truncate group-hover:text-green-800">{p.Title}</p>
                      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: cfg.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 hidden sm:inline-flex items-center gap-1"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.waiting && <WaitingMark size={11} />}
                      {cfg.text}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Achievements */}
        <GlassCard className="p-5" delay={0.15}>
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Award size={16} className="text-yellow-600" /> Achievements
          </h3>
          <div className="space-y-2">
            {achievements.map(a => (
              <div
                key={a.id}
                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  a.earned ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gray-50 border-gray-100 opacity-55'
                }`}
              >
                <Trophy size={18} className={a.earned ? 'text-yellow-500 shrink-0 mt-0.5' : 'text-gray-300 shrink-0 mt-0.5'} />
                <div>
                  <p className="font-semibold text-sm">{a.title}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Feedback */}
      <GlassCard className="overflow-hidden" delay={0.2}>
        <div className="px-5 py-3 border-b border-gray-100 font-bold text-sm flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <span className="flex items-center gap-2"><MessageSquare size={15} className="text-blue-600" /> Feedback</span>
          <Link to="/feedback" className="text-green-600 text-xs font-semibold hover:underline">All</Link>
        </div>
        {feedback.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No feedback</p>
        ) : (
          feedback.slice(0, 4).map(f => (
            <div key={String(f.MessageId ?? f.ProjectTitle)} className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
              <p className="text-xs font-bold text-gray-500">{String(f.SenderName)} · {String(f.ProjectTitle)}</p>
              <p className="text-sm mt-1 text-gray-700 line-clamp-2">{String(f.Content)}</p>
            </div>
          ))
        )}
      </GlassCard>

      {!loading && projects.length > 5 && (
        <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b font-bold text-sm bg-gray-50">All Projects</div>
          {projects.slice(5, 10).map(p => (
            <Link key={p.ProjectId} to={`/projects/${p.ProjectId}`}
              className="flex items-center justify-between px-5 py-3 border-b hover:bg-gray-50 transition-colors">
              <div>
                <span className="font-mono text-xs text-green-700 font-bold">{p.TeacherAssignedId}</span>
                <p className="font-semibold text-sm">{p.Title}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
