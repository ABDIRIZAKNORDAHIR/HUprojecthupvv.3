import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Link2, MessageSquare, ChevronRight, GraduationCap } from 'lucide-react';
import { Link } from 'react-router';
import { api, type Project } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';

export function StudentTeacherPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!user?.UserId) return;
    setLoading(true);
    api.getProjects()
      .then(r => setProjects(r.projects))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user?.UserId]);

  useEffect(() => { load(); }, [load]);

  const withTeacher = projects.filter(p => p.TeacherName);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 pb-mobile-nav">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #2563EB, #16A34A)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={20} />
          <h1 className="text-xl font-extrabold">My Assigned Teacher</h1>
        </div>
        <p className="text-white/80 text-sm">
          Each project is linked to one teacher. Chat, share files, images, videos, or start a video call.
        </p>
      </motion.div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : withTeacher.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <GraduationCap size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-600">No teacher assigned yet</p>
          <Link to="/projects" className="text-green-600 text-sm font-semibold mt-2 inline-block">
            Assign a project to a teacher →
          </Link>
        </div>
      ) : (
        withTeacher.map(p => (
          <motion.div key={p.ProjectId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <UserAvatar
                firstName={(p.TeacherName || '').split(' ')[0]}
                lastName={(p.TeacherName || '').split(' ').slice(1).join(' ')}
                role="teacher"
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-bold text-blue-600">Your Teacher</p>
                <p className="font-bold text-lg">{p.TeacherName}</p>
                <p className="font-mono text-sm text-green-700">{p.TeacherUniversityId}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  Project: {p.TeacherAssignedId} — {p.Title}
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold capitalize bg-blue-50 text-blue-700">
                  {p.Status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Link to="/messages"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 whitespace-nowrap">
                  <MessageSquare size={16} /> Messages Hub
                </Link>
                <Link to={`/projects/${p.ProjectId}#chat`}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 whitespace-nowrap">
                  <MessageSquare size={16} /> Project Chat <ChevronRight size={14} />
                </Link>
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t text-xs text-gray-500 flex flex-wrap gap-3">
              <span>✓ Text messages</span>
              <span>✓ Project images</span>
              <span>✓ Videos & files</span>
              <span>✓ Video calls</span>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
