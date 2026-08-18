import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft, ArrowUpRight, CheckCircle2, Clock, FolderKanban,
  Inbox, TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router';
import { api, type Project } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { WaitingMark } from '../components/WaitingIcon';
import { PageHero } from '../components/PageHero';
import { HU_IMAGES } from '../config/appImages';

type FilterId = 'all' | 'active' | 'waiting' | 'done';

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'Everything' },
  { id: 'active', label: 'In progress' },
  { id: 'waiting', label: 'Awaiting review' },
  { id: 'done', label: 'Completed' },
];

const statusMeta: Record<string, {
  text: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
  waiting?: boolean;
  group: Exclude<FilterId, 'all'>;
}> = {
  assigned: { text: 'In progress', tone: 'info', group: 'active' },
  submitted: { text: 'Submitted — awaiting teacher', tone: 'warning', waiting: true, group: 'waiting' },
  under_review: { text: 'Under teacher review', tone: 'warning', waiting: true, group: 'waiting' },
  pending_teacher: { text: 'Waiting for teacher', tone: 'warning', waiting: true, group: 'waiting' },
  approved: { text: 'Approved', tone: 'success', group: 'done' },
  rejected: { text: 'Not approved', tone: 'danger', group: 'done' },
  changes_requested: { text: 'Changes requested', tone: 'danger', group: 'active' },
};

function progressFor(status: string): number {
  switch (status) {
    case 'approved': return 100;
    case 'rejected': return 100;
    case 'under_review':
    case 'submitted': return 72;
    case 'changes_requested': return 55;
    case 'pending_teacher': return 35;
    case 'assigned': return 28;
    default: return 20;
  }
}

export function StudentScoresPage() {
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');

  useEffect(() => {
    if (!user?.UserId) return;
    api.getStudentDashboard()
      .then(d => setProjects(d.projects))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user?.UserId]);

  const counts = useMemo(() => {
    let active = 0;
    let waiting = 0;
    let done = 0;
    let approved = 0;
    for (const p of projects) {
      const meta = statusMeta[p.Status] || statusMeta.assigned;
      if (meta.group === 'active') active += 1;
      else if (meta.group === 'waiting') waiting += 1;
      else done += 1;
      if (p.Status === 'approved') approved += 1;
    }
    return { active, waiting, done, approved };
  }, [projects]);

  const visible = useMemo(() => {
    if (filter === 'all') return projects;
    return projects.filter(p => (statusMeta[p.Status] || statusMeta.assigned).group === filter);
  }, [projects, filter]);

  return (
    <div className="progress-page p-4 sm:p-6 max-w-5xl mx-auto space-y-5 pb-mobile-nav">
      <Link to="/" className="progress-back">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <PageHero
        dense
        icon={TrendingUp}
        eyebrow="Academic progress"
        title="My project progress"
        subtitle="Track every submission from assignment to teacher decision — review notes appear when your supervisor shares them."
        image={HU_IMAGES.library}
      >
        <div className="hero-stat">
          <strong>{projects.length}</strong>
          <em>{projects.length === 1 ? 'Project' : 'Projects'}</em>
        </div>
      </PageHero>

      {error && <p className="progress-alert" role="alert">{error}</p>}

      {!loading && projects.length > 0 && (
        <>
          <section className="progress-summary" aria-label="Progress overview">
            <article>
              <span className="progress-summary__icon progress-summary__icon--active"><FolderKanban size={17} /></span>
              <div><strong>{counts.active}</strong><em>In progress</em></div>
            </article>
            <article>
              <span className="progress-summary__icon progress-summary__icon--wait"><Clock size={17} /></span>
              <div><strong>{counts.waiting}</strong><em>Awaiting review</em></div>
            </article>
            <article>
              <span className="progress-summary__icon progress-summary__icon--done"><CheckCircle2 size={17} /></span>
              <div><strong>{counts.approved}</strong><em>Approved</em></div>
            </article>
          </section>

          <div className="progress-filters" role="tablist" aria-label="Filter projects">
            {FILTERS.map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                className={`progress-filter${filter === tab.id ? ' is-active' : ''}`}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <div className="progress-loading">
          {[1, 2].map(i => <div key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="progress-empty">
          <span><Inbox size={26} /></span>
          <h2>No projects yet</h2>
          <p>Assign a topic to a teacher to start tracking progress and feedback here.</p>
          <Link to="/projects">
            Go to my projects <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="progress-empty">
          <span><FolderKanban size={26} /></span>
          <h2>Nothing in this view</h2>
          <p>Try another filter to see the rest of your projects.</p>
        </div>
      ) : (
        <div className="progress-grid">
          {visible.map((p, index) => {
            const meta = statusMeta[p.Status] || statusMeta.assigned;
            const pct = progressFor(p.Status);
            const dateLabel = p.SubmittedAt
              ? `Submitted ${new Date(p.SubmittedAt).toLocaleDateString()}`
              : `Assigned ${new Date(p.AssignedAt).toLocaleDateString()}`;

            return (
              <motion.article
                key={p.ProjectId}
                className={`progress-card progress-card--${meta.tone}`}
                initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.28), duration: 0.4 }}
              >
                <header className="progress-card__head">
                  <span className="progress-card__code">{p.TeacherAssignedId}</span>
                  <span className={`progress-card__badge progress-card__badge--${meta.tone}`}>
                    {meta.waiting && <WaitingMark size={12} />}
                    {meta.text}
                  </span>
                </header>

                <h2>{p.Title}</h2>

                <p className="progress-card__date">
                  <Clock size={13} /> {dateLabel}
                </p>

                <div className="progress-card__meter" aria-label={`Progress ${pct}%`}>
                  <div className="progress-card__meter-top">
                    <em>Completion</em>
                    <strong>{pct}%</strong>
                  </div>
                  <div className="progress-card__bar">
                    <motion.i
                      initial={reducedMotion ? undefined : { width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>

                <Link to={`/projects/${p.ProjectId}`} className="progress-card__action">
                  View project <ArrowUpRight size={14} />
                </Link>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
