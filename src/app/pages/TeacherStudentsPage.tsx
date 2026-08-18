import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft, BookOpen, FolderKanban, Gauge, GraduationCap, Mail, MessageSquare, Phone, Search, Users,
} from 'lucide-react';
import { api, type TeacherStudent } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import { PageHero } from '../components/PageHero';
import { HU_IMAGES } from '../config/appImages';
import { formatUniversityId } from '../utils/universityId';
import { stageLabel } from '../utils/mapSubmissions';

function Meter({
  label, value, hint, invert,
}: { label: string; value: number | null; hint: string; invert?: boolean }) {
  const shown = value == null ? '—' : `${value}`;
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={`student-meter${invert ? ' student-meter--invert' : ''}`}>
      <div className="student-meter__top">
        <em>{label}</em>
        <strong>{shown}{value == null ? '' : '%'}</strong>
      </div>
      <div className="student-meter__track" aria-hidden>
        <i style={{ width: `${width}%` }} />
      </div>
      <span>{hint}</span>
    </div>
  );
}

function studyLabel(mode?: string | null) {
  if (mode === 'part_time') return 'Part-time';
  if (mode === 'full_time') return 'Full-time';
  return mode || null;
}

export function TeacherStudentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { studentId } = useParams();
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!user?.UserId) return;
    setLoading(true);
    api.getTeacherStudents()
      .then(r => setStudents(r.students))
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load students'))
      .finally(() => setLoading(false));
  }, [user?.UserId]);

  const selected = useMemo(
    () => students.find(s => String(s.UserId) === String(studentId)) || null,
    [students, studentId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const hay = [
        s.FirstName, s.LastName, s.UniversityId, s.Email, s.Department, s.ClassName, s.Phone,
      ].map((v) => String(v || '').toLowerCase()).join(' ');
      return hay.includes(q);
    });
  }, [students, query]);

  const openChat = async (student: TeacherStudent) => {
    const projectId = student.projects[0]?.ProjectId;
    if (!projectId) {
      navigate('/messages');
      return;
    }
    try {
      const r = await api.createConversation({
        type: 'teacher_student',
        projectId,
        title: `${student.FirstName} ${student.LastName}`,
      });
      navigate('/messages', { state: { openConversationId: r.conversationId } });
    } catch {
      navigate('/messages');
    }
  };

  if (studentId && loading) {
    return (
      <div className="student-roster p-4 sm:p-6 max-w-5xl mx-auto space-y-4 pb-mobile-nav">
        <div className="h-36 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (studentId && !loading && !selected) {
    return (
      <div className="student-roster p-4 sm:p-6 max-w-5xl mx-auto space-y-4 pb-mobile-nav">
        <button type="button" className="student-roster__back" onClick={() => navigate('/students')}>
          <ArrowLeft size={16} /> All students
        </button>
        <p className="rounded-xl border bg-white px-5 py-8 text-center text-sm text-gray-500">
          This student is not on your roster.
        </p>
      </div>
    );
  }

  if (selected) {
    const b = selected.barometers;
    return (
      <div className="student-roster p-4 sm:p-6 max-w-5xl mx-auto space-y-5 pb-mobile-nav">
        <button type="button" className="student-roster__back" onClick={() => navigate('/students')}>
          <ArrowLeft size={16} /> All students
        </button>

        <section className="student-dossier">
          <div className="student-dossier__identity">
            <UserAvatar
              firstName={selected.FirstName}
              lastName={selected.LastName}
              profileImageUrl={selected.ProfileImageUrl}
              role="student"
              size="xl"
            />
            <div>
              <p className="student-dossier__kicker">Assigned student</p>
              <h1>{selected.FirstName} {selected.LastName}</h1>
              <p className="font-mono text-sm font-bold text-teal-700">{formatUniversityId(selected.UniversityId)}</p>
              <div className="student-dossier__facts">
                {selected.ClassName && <span><GraduationCap size={13} /> Class {selected.ClassName}</span>}
                {studyLabel(selected.StudyMode) && <span>{studyLabel(selected.StudyMode)}</span>}
                {selected.Department && <span><BookOpen size={13} /> {selected.Department}</span>}
                {selected.viaProjects && <span>Assigned you a project</span>}
                {selected.viaClass && <span>Class work</span>}
              </div>
            </div>
          </div>

          <div className="student-dossier__contact">
            <div><Mail size={14} /> {selected.Email}</div>
            {selected.Phone && <div><Phone size={14} /> {selected.Phone}</div>}
            {selected.ContactInfo && <p>{selected.ContactInfo}</p>}
            {selected.Bio && (
              <div>
                <em>About</em>
                <p>{selected.Bio}</p>
              </div>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white"
              onClick={() => openChat(selected)}
            >
              <MessageSquare size={14} /> Message
            </button>
          </div>
        </section>

        <section className="student-dossier__meters">
          <h2><Gauge size={16} /> Academic barometers</h2>
          <p>Scores from the projects this student assigned to you, plus class work you have marked.</p>
          <div className="student-dossier__meter-grid">
            <Meter label="Uniqueness" value={b.uniqueness} hint="Originality of their project work" />
            <Meter label="Quality" value={b.quality} hint="Document analysis quality score" />
            <Meter label="Similarity" value={b.similarity} hint="Overlap with other work — lower is better" invert />
            <Meter label="Project mark" value={b.projectMark} hint="Latest mark you released on a project" />
            <Meter label="Class mark" value={b.assignmentMark} hint="Average of graded class assignments" />
          </div>
        </section>

        <section className="student-dossier__projects">
          <h2><FolderKanban size={16} /> Projects assigned to you</h2>
          {selected.projects.length === 0 ? (
            <p className="text-sm text-gray-500">No projects yet.</p>
          ) : (
            <ul>
              {selected.projects.map(project => (
                <li key={project.ProjectId}>
                  <Link to={`/projects/${project.ProjectId}`}>
                    <strong>{project.Title}</strong>
                    <span>{stageLabel(project.Status)}</span>
                    <em>
                      {[
                        project.UniquenessScore != null ? `Uniqueness ${Math.round(project.UniquenessScore)}` : null,
                        project.Grade != null ? `Mark ${Math.round(project.Grade)}` : null,
                      ].filter(Boolean).join(' · ') || 'Open project'}
                    </em>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="student-roster p-4 sm:p-6 max-w-5xl mx-auto space-y-5 pb-mobile-nav">
      <PageHero
        dense
        icon={Users}
        eyebrow="Your supervision"
        title="My students"
        subtitle="Everyone who assigned a project to you, plus students in classes you teach. Open a student to see their photo, details, and academic barometers."
        image={HU_IMAGES.heroStudents}
      >
        <div className="hero-stat">
          <strong>{students.length}</strong>
          <em>{students.length === 1 ? 'Student' : 'Students'}</em>
        </div>
      </PageHero>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <label className="student-roster__search">
        <Search size={15} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, HU ID, class, or department"
        />
      </label>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border bg-white px-5 py-8 text-center text-sm text-gray-500">
          {students.length === 0
            ? 'No students have assigned a project to you, and no class work is on your roster yet.'
            : 'No students match that search.'}
        </p>
      ) : (
        <ul className="student-roster__list">
          {filtered.map((student, index) => (
            <motion.li
              key={student.UserId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <button type="button" className="student-roster__card" onClick={() => navigate(`/students/${student.UserId}`)}>
                <UserAvatar
                  firstName={student.FirstName}
                  lastName={student.LastName}
                  profileImageUrl={student.ProfileImageUrl}
                  role="student"
                  size="lg"
                />
                <div className="student-roster__copy">
                  <strong>{student.FirstName} {student.LastName}</strong>
                  <span className="font-mono">{formatUniversityId(student.UniversityId)}</span>
                  <em>
                    {[student.ClassName && `Class ${student.ClassName}`, student.Department, `${student.projectCount} project${student.projectCount === 1 ? '' : 's'}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </em>
                </div>
                <div className="student-roster__pills">
                  {student.barometers.uniqueness != null && <span>Uniqueness {student.barometers.uniqueness}</span>}
                  {student.barometers.projectMark != null && <span>Mark {student.barometers.projectMark}</span>}
                  {student.barometers.assignmentMark != null && <span>Class {student.barometers.assignmentMark}</span>}
                </div>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
