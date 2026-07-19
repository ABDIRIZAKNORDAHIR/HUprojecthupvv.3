import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AdminBadge } from '../components/ChatMessage';

export function StudentFeedbackPage() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.UserId) return;
    api.getStudentDashboard()
      .then(d => setFeedback(d.feedback))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.UserId]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-24">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <MessageSquare className="text-blue-600" /> Teacher Feedback
        </h1>
        <p className="text-sm text-gray-500">Messages and review feedback from your teachers</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No feedback yet. Open a project and chat with your teacher.</p>
          <Link to="/projects" className="text-green-600 font-semibold text-sm mt-2 inline-block">Go to My Projects</Link>
        </div>
      ) : (
        feedback.map((f, idx) => {
          const feedbackType = String(f.FeedbackType || 'message');
          const key = f.MessageId != null ? String(f.MessageId) : `fb-${idx}`;
          const isEvaluation = feedbackType === 'evaluation';
          return (
          <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-green-700 font-bold">{String(f.TeacherAssignedId)}</span>
              <span className="text-xs text-gray-400">{new Date(String(f.SentAt)).toLocaleString()}</span>
            </div>
            <p className="font-semibold text-sm">{String(f.ProjectTitle)}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {isEvaluation && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                  Grade: {f.Grade != null ? String(f.Grade) : '—'}/100
                </span>
              )}
              {String(f.SenderRole) === 'admin' ? (
                <AdminBadge />
              ) : (
                <p className="text-xs text-gray-500">From {String(f.SenderName)} ({String(f.SenderRole)})</p>
              )}
            </div>
            <p className="text-sm mt-3 text-gray-700 leading-relaxed">{String(f.Content)}</p>
            <Link to={isEvaluation ? `/projects/${f.ProjectId}` : `/messages`}
              className="text-blue-600 text-xs font-semibold mt-3 inline-block">
              {isEvaluation ? 'View project →' : 'Open messages →'}
            </Link>
          </motion.div>
        );})
      )}
    </div>
  );
}
