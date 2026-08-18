import { useEffect, useMemo, useState } from 'react';
import {
  Clock, Send, ClipboardPlus, Users, BookOpenCheck, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../api/client';
import { UserAvatar } from '../components/UserAvatar';

function fmt(dt?: string | null) {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt);
  }
}

export function TeacherClassAssignmentsPage() {
  const [classes, setClasses] = useState<Array<Record<string, unknown>>>([]);
  const [assignments, setAssignments] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    title: '',
    instructions: '',
    className: 'BIT 9',
    studyMode: '',
    deadlineHours: '10',
    deadlineAt: '',
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const classOptions = useMemo(() => {
    const names = new Set<string>();
    const rows = Array.isArray(classes) ? classes : [];
    for (const c of rows) {
      if (c.ClassName) names.add(String(c.ClassName));
    }
    if (!names.size) ['BIT 9', 'BIT 8', 'BIT 7'].forEach((n) => names.add(n));
    return [...names].sort();
  }, [classes]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [c, a] = await Promise.all([
        api.getClassAssignmentClasses(),
        api.getTeacherClassAssignments(),
      ]);
      setClasses(Array.isArray(c.classes) ? c.classes : []);
      setAssignments(Array.isArray(a.assignments) ? a.assignments : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setMessage('');
    try {
      const payload: {
        title: string;
        instructions: string;
        className: string;
        studyMode?: string;
        deadlineHours?: number;
        deadlineAt?: string;
      } = {
        title: form.title.trim(),
        instructions: form.instructions.trim(),
        className: form.className.trim(),
      };
      if (form.studyMode) payload.studyMode = form.studyMode;
      if (form.deadlineAt) payload.deadlineAt = new Date(form.deadlineAt).toISOString();
      else payload.deadlineHours = Number(form.deadlineHours) || 10;

      const res = await api.createClassAssignment(payload);
      setMessage(res.message);
      setForm((f) => ({ ...f, title: '', instructions: '' }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send assignment');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading class assignments…</div>;
  }

  const totalTargets = assignments.reduce((sum, item) => sum + Number(item.TargetCount || 0), 0);
  const totalSubmissions = assignments.reduce((sum, item) => sum + Number(item.SubmissionCount || 0), 0);
  const openAssignments = assignments.filter(item => Number(item.IsClosed) !== 1).length;

  return (
    <div className="teacher-assignment-page dashboard-canvas space-y-6 pb-mobile-nav">
      <div className="dashboard-command-hero teacher-assignment-hero">
        <div>
          <span className="dashboard-eyebrow"><BookOpenCheck size={14} /> Teaching command center</span>
          <h1>Class assignments</h1>
          <p>Create structured work, target the right class, monitor deadlines, and review files from one place.</p>
        </div>
        <div className="dashboard-hero-actions">
          <div><strong>{openAssignments}</strong><span>Open</span></div>
          <div><strong>{totalSubmissions}/{totalTargets}</strong><span>Received</span></div>
        </div>
      </div>

      <form onSubmit={send} className="assignment-composer teacher-assignment-composer space-y-5">
        <div className="teacher-assignment-composer__head">
          <span><ClipboardPlus size={21} /></span>
          <div>
            <h2 className="font-extrabold text-lg">Create an assignment</h2>
            <p className="text-xs text-gray-500">Students receive it immediately after publishing.</p>
          </div>
          <span className="teacher-assignment-composer__step">Draft workspace</span>
        </div>
        <div className="teacher-form-field">
          <label className="text-xs font-semibold text-gray-600">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
            placeholder="Week 3 Lab — Database Design"
          />
        </div>
        <div className="teacher-form-field">
          <label className="text-xs font-semibold text-gray-600">Instructions</label>
          <textarea
            value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm min-h-[90px]"
            placeholder="What students must do…"
          />
        </div>
        <div className="teacher-assignment-composer__grid">
          <div className="teacher-form-field">
            <label className="text-xs font-semibold text-gray-600">Class</label>
            <input
              list="class-options"
              required
              value={form.className}
              onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
              placeholder="BIT 9"
            />
            <datalist id="class-options">
              {classOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="teacher-form-field">
            <label className="text-xs font-semibold text-gray-600">Study mode (optional)</label>
            <select
              value={form.studyMode}
              onChange={(e) => setForm((f) => ({ ...f, studyMode: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
            >
              <option value="">All (full-time + part-time)</option>
              <option value="full_time">Full-time only</option>
              <option value="part_time">Part-time only</option>
            </select>
          </div>
          <div className="teacher-form-field">
            <label className="text-xs font-semibold text-gray-600">Deadline in hours</label>
            <input
              type="number"
              min={1}
              value={form.deadlineHours}
              onChange={(e) => setForm((f) => ({ ...f, deadlineHours: e.target.value, deadlineAt: '' }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
              disabled={!!form.deadlineAt}
            />
          </div>
        </div>
        <div className="teacher-form-field">
          <label className="text-xs font-semibold text-gray-600">Or exact deadline (optional)</label>
          <input
            type="datetime-local"
            value={form.deadlineAt}
            onChange={(e) => setForm((f) => ({ ...f, deadlineAt: e.target.value }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
          />
        </div>
        <div className="teacher-quick-deadlines">
          <span className="text-xs font-semibold text-gray-500">Quick deadline:</span>
          {[{ label: 'Tomorrow', hours: '24' }, { label: '3 days', hours: '72' }, { label: '1 week', hours: '168' }].map(option => (
            <button
              key={option.hours}
              type="button"
              onClick={() => setForm(f => ({ ...f, deadlineHours: option.hours, deadlineAt: '' }))}
              className={form.deadlineHours === option.hours && !form.deadlineAt ? 'is-active' : ''}
            >
              {option.label}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {message && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{message}</p>}
        <button
          type="submit"
          disabled={sending}
          className="teacher-publish-button inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50"
        >
          <Send size={14} />
          {sending ? 'Sending…' : 'Send to class'}
        </button>
      </form>

      <section className="teacher-published space-y-3">
        <div className="teacher-published__head">
          <div>
            <h2 className="font-extrabold text-lg">Published assignments</h2>
            <p className="teacher-published__sub">Open a class to review PDFs, marks, and students who have not submitted.</p>
          </div>
          <span className="text-xs font-semibold text-gray-500">{assignments.length} total</span>
        </div>
        {assignments.length === 0 && (
          <div className="teacher-published__empty">
            <ClipboardPlus size={24} />
            <strong>No assignments published</strong>
            <p>Your first class assignment will appear here.</p>
          </div>
        )}
        {assignments.map((a) => {
          const id = Number(a.AssignmentId);
          const closed = Number(a.IsClosed) === 1;
          const submitted = Number(a.SubmissionCount || 0);
          const target = Number(a.TargetCount || 0);
          const graded = Number(a.GradedCount || 0);
          const percent = Math.min(100, Math.round((submitted / Math.max(1, target)) * 100));
          const recent = Array.isArray(a.RecentSubmitters)
            ? (a.RecentSubmitters as Array<Record<string, unknown>>)
            : [];
          const extra = Math.max(0, submitted - recent.length);
          return (
            <article key={id} className={`teacher-assignment-card${closed ? ' is-closed' : ''}`}>
              <div className="teacher-assignment-card__body">
                <div className="teacher-assignment-card__copy">
                  <div className="teacher-assignment-card__tags">
                    <span className="teacher-assignment-card__class">
                      Class {String(a.ClassName)}
                      {a.StudyMode ? ` · ${String(a.StudyMode).replace('_', '-')}` : ' · all modes'}
                    </span>
                    <span className={`teacher-assignment-card__status${closed ? ' is-closed' : ''}`}>
                      {closed ? 'Closed' : 'Open'}
                    </span>
                  </div>
                  <h3>{String(a.Title)}</h3>
                  <p>
                    <Clock size={13} /> Deadline {fmt(String(a.DeadlineAt))}
                    {closed ? ' · no further submissions' : ''}
                  </p>
                </div>
                <Link to={`/class-assignments/${id}`} className="teacher-view-submissions">
                  <Users size={15} />
                  Review class
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="teacher-assignment-card__foot">
                <div className="teacher-assignment-card__people">
                  {recent.length === 0 ? (
                    <span className="teacher-assignment-card__empty-people">Waiting for the first submission</span>
                  ) : (
                    <div className="avatar-stack">
                      {recent.map((student) => (
                        <UserAvatar
                          key={String(student.StudentId)}
                          firstName={String(student.FirstName || '')}
                          lastName={String(student.LastName || '')}
                          profileImageUrl={student.ProfileImageUrl ? String(student.ProfileImageUrl) : null}
                          role="student"
                          size="sm"
                        />
                      ))}
                      {extra > 0 && <span className="avatar-stack__more">+{extra}</span>}
                    </div>
                  )}
                </div>
                <div className="teacher-assignment-card__meter">
                  <div className="teacher-assignment-card__counts">
                    <strong>{submitted}/{target || '—'}</strong>
                    <span>submitted</span>
                    <em>
                      <CheckCircle2 size={12} /> {graded} marked
                    </em>
                  </div>
                  <div className="teacher-assignment-card__bar" aria-hidden="true">
                    <i style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
