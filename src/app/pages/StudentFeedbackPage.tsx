import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MessageSquare, ArrowLeft, Award, Inbox, ArrowUpRight, Star } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AdminBadge } from '../components/ChatMessage';
import { PageHero } from '../components/PageHero';
import { HU_IMAGES } from '../config/appImages';

type FeedbackItem = Record<string, unknown>;
type FilterId = 'all' | 'evaluation' | 'message';

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'Everything' },
  { id: 'evaluation', label: 'Grades' },
  { id: 'message', label: 'Messages' },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/** "3 hours ago" style label, falling back to a plain date for older items. */
function relativeTime(value: string): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(value).toLocaleDateString();
}

function gradeTone(score: number): 'strong' | 'good' | 'fair' | 'weak' {
  if (score >= 85) return 'strong';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'weak';
}

export function StudentFeedbackPage() {
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');

  useEffect(() => {
    if (!user?.UserId) return;
    api.getStudentDashboard()
      .then(d => setFeedback(d.feedback))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.UserId]);

  const graded = useMemo(
    () => feedback.filter(f => String(f.FeedbackType || '') === 'evaluation'),
    [feedback],
  );

  const averageGrade = useMemo(() => {
    const scores = graded
      .map(f => Number(f.Grade))
      .filter(n => Number.isFinite(n));
    if (!scores.length) return null;
    return Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length);
  }, [graded]);

  const visible = useMemo(() => {
    if (filter === 'all') return feedback;
    return feedback.filter(f => {
      const type = String(f.FeedbackType || 'message');
      return filter === 'evaluation' ? type === 'evaluation' : type !== 'evaluation';
    });
  }, [feedback, filter]);

  return (
    <div className="feedback-page p-4 sm:p-6 max-w-4xl mx-auto space-y-5 pb-mobile-nav">
      <Link to="/" className="feedback-back">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <PageHero
        dense
        icon={Star}
        eyebrow="Supervisor feedback"
        title="Teacher feedback"
        subtitle="Grades, review notes, and messages your supervisors have sent you."
        image={HU_IMAGES.library}
      >
        <div className="hero-stat">
          <strong>{feedback.length}</strong>
          <em>Items received</em>
        </div>
      </PageHero>

      {error && <p className="feedback-alert" role="alert">{error}</p>}

      <div className="feedback-summary">
        <article>
          <span className="feedback-summary__icon feedback-summary__icon--grade"><Award size={17} /></span>
          <div><strong>{graded.length}</strong><em>Graded reviews</em></div>
        </article>
        <article>
          <span className="feedback-summary__icon feedback-summary__icon--msg"><MessageSquare size={17} /></span>
          <div><strong>{feedback.length - graded.length}</strong><em>Written notes</em></div>
        </article>
        <article>
          <span className="feedback-summary__icon feedback-summary__icon--avg"><Star size={17} /></span>
          <div>
            <strong>{averageGrade == null ? '—' : `${averageGrade}%`}</strong>
            <em>Average grade</em>
          </div>
        </article>
      </div>

      <div className="feedback-filters" role="tablist" aria-label="Filter feedback">
        {FILTERS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            className={`feedback-filter${filter === tab.id ? ' is-active' : ''}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="feedback-skeleton" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="feedback-empty">
          <span><Inbox size={26} /></span>
          <h2>{feedback.length === 0 ? 'No feedback yet' : 'Nothing in this view'}</h2>
          <p>
            {feedback.length === 0
              ? 'Once a supervisor reviews your work, their grade and notes appear here.'
              : 'Try another filter to see the rest of your feedback.'}
          </p>
          {feedback.length === 0 && (
            <Link to="/projects" className="feedback-empty__cta">Go to my projects</Link>
          )}
        </div>
      ) : (
        <div className="feedback-list">
          {visible.map((f, idx) => {
            const type = String(f.FeedbackType || 'message');
            const isEvaluation = type === 'evaluation';
            const key = f.MessageId != null ? String(f.MessageId) : `fb-${idx}`;
            const sender = String(f.SenderName || 'Supervisor');
            const score = Number(f.Grade);
            const hasScore = isEvaluation && Number.isFinite(score);
            const sentAt = String(f.SentAt);

            return (
              <motion.article
                key={key}
                className={`feedback-card feedback-card--${isEvaluation ? 'grade' : 'note'}`}
                initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.3), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <header className="feedback-card__head">
                  <span className="feedback-card__avatar">{initialsOf(sender)}</span>
                  <div className="feedback-card__who">
                    <strong>{sender}</strong>
                    {String(f.SenderRole) === 'admin'
                      ? <AdminBadge />
                      : <em>{String(f.SenderRole || 'teacher')}</em>}
                  </div>
                  <time dateTime={sentAt} title={new Date(sentAt).toLocaleString()}>
                    {relativeTime(sentAt)}
                  </time>
                </header>

                <div className="feedback-card__project">
                  <p>{String(f.ProjectTitle)}</p>
                  <span className="feedback-card__code">{String(f.TeacherAssignedId)}</span>
                </div>

                {hasScore && (
                  <div className={`feedback-score feedback-score--${gradeTone(score)}`}>
                    <strong>{score}</strong>
                    <span>/ 100</span>
                    <div className="feedback-score__bar">
                      <motion.i
                        initial={reducedMotion ? undefined : { width: 0 }}
                        animate={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                        transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>
                )}

                <blockquote className="feedback-card__body">{String(f.Content)}</blockquote>

                <Link
                  to={isEvaluation ? `/projects/${f.ProjectId}` : '/messages'}
                  className="feedback-card__action"
                >
                  {isEvaluation ? 'View project' : 'Open messages'}
                  <ArrowUpRight size={14} />
                </Link>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
