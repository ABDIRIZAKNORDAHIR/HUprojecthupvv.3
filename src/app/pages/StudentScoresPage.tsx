import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FolderKanban, ArrowLeft, Clock } from 'lucide-react';
import { Link } from 'react-router';
import { api, type Project } from '../api/client';
import { useAuth } from '../context/AuthContext';

const statusLabel: Record<string, { text: string; color: string; bg: string }> = {
  assigned: { text: 'In progress', color: '#2563EB', bg: '#EFF6FF' },
  submitted: { text: 'Submitted — awaiting teacher', color: '#EAB308', bg: '#FEFCE8' },
  under_review: { text: 'Under teacher review', color: '#EAB308', bg: '#FEFCE8' },
  approved: { text: 'Approved', color: '#16A34A', bg: '#F0FDF4' },
  rejected: { text: 'Rejected', color: '#EF4444', bg: '#FEF2F2' },
  changes_requested: { text: 'Changes requested', color: '#EA580C', bg: '#FFF7ED' },
  pending_teacher: { text: 'Waiting for teacher', color: '#7C3AED', bg: '#F5F3FF' },
};

export function StudentScoresPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.UserId) return;
    api.getStudentDashboard()
      .then(d => setProjects(d.projects))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user?.UserId]);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6 pb-24">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <FolderKanban className="text-green-600" /> My Project Progress
        </h1>
        <p className="text-sm text-gray-500">Track submission status — AI analysis is available to your teacher only</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {loading ? (
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <FolderKanban size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No projects yet.</p>
          <Link to="/projects" className="text-green-600 font-semibold text-sm mt-2 inline-block">Go to My Projects</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => {
            const cfg = statusLabel[p.Status] || statusLabel.assigned;
            return (
              <motion.div key={p.ProjectId} whileHover={{ scale: 1.01 }}
                className="bg-white rounded-xl border p-5 shadow-sm">
                <span className="font-mono text-xs font-bold text-green-700">{p.TeacherAssignedId}</span>
                <p className="font-semibold mt-1">{p.Title}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Clock size={12} />
                  {p.SubmittedAt ? `Submitted ${new Date(p.SubmittedAt).toLocaleDateString()}` : `Assigned ${new Date(p.AssignedAt).toLocaleDateString()}`}
                </p>
                <span className="inline-block mt-3 px-2.5 py-1 rounded-full text-xs font-bold capitalize"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.text}
                </span>
                <Link to={`/projects/${p.ProjectId}`} className="block text-blue-600 text-xs font-semibold mt-3">
                  View project →
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
