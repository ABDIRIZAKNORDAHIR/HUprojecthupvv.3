import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  MessageSquare, Trophy, BarChart3, FolderKanban, Mail, ChevronRight, Award, GraduationCap, Users, ClipboardList,
} from 'lucide-react';
import { Link } from 'react-router';
import { api, type Project } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PageHero } from '../components/PageHero';
import { APP_IMAGES } from '../config/appImages';
import { KPICard } from '../components/KPICard';
import { QuickActionTile } from '../components/QuickActionTile';
import { ProgressRing } from '../components/ProgressRing';
import { GlassCard } from '../components/GlassCard';

const statusLabel: Record<string, { text: string; color: string; bg: string }> = {
  assigned: { text: 'In progress', color: '#2563EB', bg: '#EFF6FF' },
  submitted: { text: 'Awaiting teacher', color: '#EAB308', bg: '#FEFCE8' },
  under_review: { text: 'Under review', color: '#EAB308', bg: '#FEFCE8' },
  approved: { text: 'Approved', color: '#168055', bg: '#F0FDF4' },
  rejected: { text: 'Rejected', color: '#EF4444', bg: '#FEF2F2' },
  changes_requested: { text: 'Changes requested', color: '#EA580C', bg: '#FFF7ED' },
  pending_teacher: { text: 'Waiting for teacher', color: '#7C3AED', bg: '#F5F3FF' },
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

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto space-y-6 pb-24">
      <PageHero
        title={user?.FirstName || 'Student'}
        subtitle={user?.UniversityId}
        image={APP_IMAGES.studentsStudy}
      >
        {!loading && projects.length > 0 && (
          <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
            <ProgressRing value={overallProgress} size={48} strokeWidth={5} color="#ffffff" />
            <p className="text-white text-lg font-extrabold tabular-nums">{overallProgress}%</p>
          </div>
        )}
      </PageHero>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard title="Projects" value={loading ? '…' : stats.totalProjects} icon={FolderKanban} iconColor="#2563EB" iconBg="#EFF6FF" index={0} />
        <KPICard title="Active" value={loading ? '…' : stats.active} icon={BarChart3} iconColor="#16A34A" iconBg="#F0FDF4" index={1} />
        <KPICard title="Invites" value={loading ? '…' : inviteCount} icon={Mail} iconColor="#EAB308" iconBg="#FEFCE8" index={2} />
        <KPICard title="In review" value={loading ? '…' : stats.pendingReview} icon={Trophy} iconColor="#7C3AED" iconBg="#F5F3FF" index={3} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickActionTile to="/projects" title="Projects" icon={FolderKanban} gradient="linear-gradient(135deg, #16A34A, #22C55E)" accent="#16A34A" index={0} />
        <QuickActionTile to="/class-assignments" title="Assignments" icon={ClipboardList} gradient="linear-gradient(135deg, #0F766E, #14B8A6)" accent="#0F766E" index={1} />
        <QuickActionTile to="/my-teacher" title="Teacher" icon={GraduationCap} gradient="linear-gradient(135deg, #1D4ED8, #3B82F6)" accent="#1D4ED8" index={2} />
        <QuickActionTile to="/team" title="Team" icon={Users} gradient="linear-gradient(135deg, #334155, #64748B)" accent="#334155" index={3} />
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
                const cfg = statusLabel[p.Status] || statusLabel.assigned;
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 hidden sm:inline"
                      style={{ background: cfg.bg, color: cfg.color }}>
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
