import { useEffect, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowUpRight, BookOpen, CheckCircle2, FolderKanban,
  GraduationCap, Loader2, MessageSquare, Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { api, type Project } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import { PageHero } from '../components/PageHero';
import { HU_IMAGES } from '../config/appImages';

const statusMeta: Record<string, { label: string; tone: string }> = {
  approved: { label: 'Approved', tone: 'success' },
  assigned: { label: 'Assigned', tone: 'info' },
  submitted: { label: 'Submitted', tone: 'warning' },
  under_review: { label: 'Under review', tone: 'warning' },
  changes_requested: { label: 'Changes requested', tone: 'danger' },
  rejected: { label: 'Not approved', tone: 'danger' },
  pending_teacher: { label: 'Awaiting teacher', tone: 'warning' },
};

export function StudentTeacherPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState<number | null>(null);

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
  const teacherCount = new Set(withTeacher.map(p => p.TeacherUniversityId || p.TeacherName)).size;
  const approvedCount = withTeacher.filter(p => p.Status === 'approved').length;

  const openTeacherChat = async (project: Project) => {
    setOpeningId(project.ProjectId);
    setError('');
    try {
      const r = await api.createConversation({
        type: 'teacher_student',
        projectId: project.ProjectId,
        title: `${project.TeacherName} · ${project.Title}`,
      });
      navigate('/messages', { state: { openConversationId: r.conversationId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open teacher chat');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="teacher-directory p-4 sm:p-6 max-w-5xl mx-auto space-y-5 pb-mobile-nav">
      <PageHero
        dense
        icon={GraduationCap}
        eyebrow="Academic support"
        title="My teachers"
        subtitle="Connect with the supervisors guiding your projects, and keep every academic conversation in one place."
        image={HU_IMAGES.convocation}
      >
        <div className="hero-stat">
          <strong>{teacherCount}</strong>
          <em>{teacherCount === 1 ? 'Supervisor' : 'Supervisors'}</em>
        </div>
      </PageHero>

      {error && <p className="teacher-directory__error" role="alert">{error}</p>}

      {loading ? (
        <div className="teacher-directory__loading">
          {[1, 2].map(i => <div key={i} />)}
        </div>
      ) : withTeacher.length === 0 ? (
        <div className="teacher-directory__empty">
          <span><GraduationCap size={26} /></span>
          <h2>No teacher assigned yet</h2>
          <p>Assign a project to a supervisor to begin receiving guidance and feedback.</p>
          <Link to="/projects">
            View my projects <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <section className="teacher-directory__summary" aria-label="Teacher overview">
            <article>
              <span><Users size={17} /></span>
              <div><strong>{teacherCount}</strong><em>Active supervisors</em></div>
            </article>
            <article>
              <span><FolderKanban size={17} /></span>
              <div><strong>{withTeacher.length}</strong><em>Supervised projects</em></div>
            </article>
            <article>
              <span><CheckCircle2 size={17} /></span>
              <div><strong>{approvedCount}</strong><em>Approved projects</em></div>
            </article>
          </section>

          <div className="teacher-directory__list">
            {withTeacher.map((p, index) => {
              const status = statusMeta[p.Status] || {
                label: p.Status.replace(/_/g, ' '),
                tone: 'info',
              };
              const isOpening = openingId === p.ProjectId;

              return (
                <motion.article
                  key={p.ProjectId}
                  className="teacher-card"
                  initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.4 }}
                >
                  <div className="teacher-card__profile">
                    <UserAvatar
                      firstName={(p.TeacherName || '').split(' ')[0]}
                      lastName={(p.TeacherName || '').split(' ').slice(1).join(' ')}
                      profileImageUrl={p.TeacherProfileImageUrl}
                      role="teacher"
                      size="lg"
                    />
                    <div className="teacher-card__identity">
                      <span>Your supervisor</span>
                      <h2>{p.TeacherName}</h2>
                      <p>{p.TeacherUniversityId}</p>
                    </div>
                  </div>

                  <div className="teacher-card__project">
                    <span className="teacher-card__project-icon"><BookOpen size={17} /></span>
                    <div>
                      <em>Supervising project</em>
                      <strong>{p.Title}</strong>
                      <small>{p.TeacherAssignedId}</small>
                    </div>
                    <span className={`teacher-card__status teacher-card__status--${status.tone}`}>
                      {status.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openTeacherChat(p)}
                    disabled={isOpening}
                    className="teacher-card__chat"
                  >
                    {isOpening ? <Loader2 size={17} className="animate-spin" /> : <MessageSquare size={17} />}
                    <span>
                      <strong>{isOpening ? 'Opening conversation…' : 'Message supervisor'}</strong>
                      {!isOpening && <em>Continue in Messages</em>}
                    </span>
                    {!isOpening && <ArrowUpRight size={15} />}
                  </button>

                  <footer>
                    <MessageSquare size={13} />
                    Messages are saved with this project for clear academic follow-up.
                  </footer>
                </motion.article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
