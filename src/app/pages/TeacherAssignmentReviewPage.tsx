import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  AlertCircle, ArrowLeft, Award, CheckCircle2, Clock, MessageSquare, Save, Search, Users, X,
} from 'lucide-react';
import { api } from '../api/client';
import { PdfReviewActions } from '../components/PdfReviewActions';
import { UserAvatar } from '../components/UserAvatar';

function fmt(dt?: string | null) {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt);
  }
}

const GRADE_BANDS = [
  { min: 90, label: 'Excellent', grade: 'A', tone: 'excellent' },
  { min: 80, label: 'Very good', grade: 'B', tone: 'good' },
  { min: 70, label: 'Good', grade: 'C', tone: 'good' },
  { min: 60, label: 'Satisfactory', grade: 'D', tone: 'fair' },
  { min: 50, label: 'Pass', grade: 'E', tone: 'fair' },
  { min: 0, label: 'Needs improvement', grade: 'F', tone: 'weak' },
];

function gradeBand(total: number) {
  return GRADE_BANDS.find((band) => total >= band.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

const QUICK_FEEDBACK = [
  'Excellent work — clear structure and complete requirements.',
  'Good effort. Strengthen the analysis and add references.',
  'Incomplete submission. Review the instructions and resubmit next time.',
];

export function TeacherAssignmentReviewPage() {
  const { assignmentId } = useParams();
  const id = Number(assignmentId);
  const [assignment, setAssignment] = useState<Record<string, unknown> | null>(null);
  const [subs, setSubs] = useState<Array<Record<string, unknown>>>([]);
  const [awaiting, setAwaiting] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: '', bonusPoints: '0', feedback: '' });
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradeMessage, setGradeMessage] = useState('');
  const [gradeError, setGradeError] = useState('');
  const [subSearch, setSubSearch] = useState('');
  const [subFilter, setSubFilter] = useState<'all' | 'pending' | 'marked'>('all');

  const load = useCallback(async () => {
    if (!Number.isFinite(id) || id < 1) {
      setError('This assignment was not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.getClassAssignmentSubmissions(id);
      setAssignment(res.assignment);
      setSubs(Array.isArray(res.submissions) ? res.submissions : []);
      setAwaiting(Array.isArray(res.awaiting) ? res.awaiting : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load submissions');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const openGrade = (submission: Record<string, unknown>) => {
    setGradingId(Number(submission.SubmissionId));
    setGradeForm({
      score: submission.Score == null ? '' : String(submission.Score),
      bonusPoints: submission.BonusPoints == null ? '0' : String(submission.BonusPoints),
      feedback: String(submission.TeacherFeedback || ''),
    });
    setGradeMessage('');
    setGradeError('');
  };

  const adjustBonus = (delta: number) => {
    setGradeForm((current) => {
      const next = Math.min(20, Math.max(0, Number(current.bonusPoints || 0) + delta));
      return { ...current, bonusPoints: String(next) };
    });
  };

  const saveGrade = async () => {
    if (!gradingId) return;
    const score = Number(gradeForm.score);
    const bonusPoints = Number(gradeForm.bonusPoints || 0);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setGradeError('Mark must be a number between 0 and 100.');
      return;
    }
    if (!Number.isFinite(bonusPoints) || bonusPoints < 0 || bonusPoints > 20) {
      setGradeError('Bonus must be between 0 and 20 points.');
      return;
    }
    setSavingGrade(true);
    setGradeError('');
    try {
      const res = await api.gradeClassAssignmentSubmission(gradingId, {
        score,
        bonusPoints,
        feedback: gradeForm.feedback.trim(),
      });
      setSubs((current) => current.map((item) => Number(item.SubmissionId) === gradingId
        ? {
            ...item,
            Score: res.grade.score,
            BonusPoints: res.grade.bonusPoints,
            TeacherFeedback: res.grade.feedback,
            GradedAt: new Date().toISOString(),
          }
        : item));
      setGradeMessage(res.message);
      setGradingId(null);
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : 'Could not save this mark');
    } finally {
      setSavingGrade(false);
    }
  };

  const markedCount = subs.filter((s) => s.Score != null).length;
  const averageMark = markedCount
    ? Math.round(
        subs
          .filter((s) => s.Score != null)
          .reduce((sum, s) => sum + Math.min(100, Number(s.Score) + Number(s.BonusPoints || 0)), 0) / markedCount,
      )
    : null;

  const visibleSubs = useMemo(() => subs.filter((s) => {
    if (subFilter === 'marked' && s.Score == null) return false;
    if (subFilter === 'pending' && s.Score != null) return false;
    const q = subSearch.trim().toLowerCase();
    if (!q) return true;
    return `${s.FirstName} ${s.LastName} ${s.UniversityId}`.toLowerCase().includes(q);
  }), [subs, subFilter, subSearch]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading submissions…</div>;
  }

  return (
    <div className="teacher-assignment-page dashboard-canvas space-y-5 pb-mobile-nav">
      <Link to="/class-assignments" className="student-roster__back">
        <ArrowLeft size={16} /> Published assignments
      </Link>

      <div className="dashboard-command-hero teacher-assignment-hero">
        <div>
          <span className="dashboard-eyebrow"><Users size={14} /> Submission review</span>
          <h1>{assignment ? String(assignment.Title) : 'Assignment'}</h1>
          <p>
            Class {assignment ? String(assignment.ClassName) : '—'}
            {assignment?.StudyMode ? ` · ${String(assignment.StudyMode).replace('_', '-')}` : ' · all modes'}
            {' · '}
            <Clock size={12} className="inline" /> Deadline {fmt(assignment ? String(assignment.DeadlineAt) : null)}
            {Number(assignment?.IsClosed) === 1 ? ' · CLOSED' : ''}
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <div><strong>{subs.length}</strong><span>Received</span></div>
          <div><strong>{awaiting.length}</strong><span>Missing</span></div>
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="review-board review-board--page">
        <header className="review-board__head">
          <div>
            <span className="review-board__eyebrow">Marking workspace</span>
            <h3>Student submissions</h3>
          </div>
          <div className="review-board__stats">
            <div><strong>{subs.length}</strong><span>Received</span></div>
            <div><strong>{markedCount}</strong><span>Marked</span></div>
            <div><strong>{subs.length - markedCount}</strong><span>Awaiting</span></div>
            <div><strong>{averageMark == null ? '—' : `${averageMark}`}</strong><span>Average</span></div>
          </div>
        </header>

        {subs.length > 0 && (
          <div className="review-board__toolbar">
            <div className="review-board__search">
              <Search size={14} />
              <input
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                placeholder="Search by student name or HU ID…"
              />
              {subSearch && (
                <button type="button" onClick={() => setSubSearch('')} aria-label="Clear search">
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="review-board__filters">
              {([
                ['all', 'All'],
                ['pending', 'Awaiting mark'],
                ['marked', 'Marked'],
              ] as Array<['all' | 'pending' | 'marked', string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSubFilter(value)}
                  className={subFilter === value ? 'is-active' : ''}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {gradeMessage && (
          <p className="review-board__flash"><CheckCircle2 size={14} /> {gradeMessage}</p>
        )}

        {subs.length === 0 && (
          <p className="review-board__empty">No submissions yet for this assignment.</p>
        )}
        {subs.length > 0 && visibleSubs.length === 0 && (
          <p className="review-board__empty">No students match this filter.</p>
        )}

        {visibleSubs.map((s) => {
          const submissionId = Number(s.SubmissionId);
          const isGrading = gradingId === submissionId;
          const marked = s.Score != null;
          const total = marked ? Math.min(100, Number(s.Score) + Number(s.BonusPoints || 0)) : 0;
          const band = gradeBand(total);
          const draftTotal = Math.min(100, Number(gradeForm.score || 0) + Number(gradeForm.bonusPoints || 0));
          const draftBand = gradeBand(draftTotal);
          const hasFile = Number(s.HasAttachment) === 1 || Boolean(s.AttachmentData);

          return (
            <article key={submissionId} className={`review-row${isGrading ? ' review-row--active' : ''}`}>
              <div className="review-row__head">
                {s.StudentId ? (
                  <Link to={`/students/${Number(s.StudentId)}`} className="review-row__avatar-link">
                    <UserAvatar
                      firstName={String(s.FirstName || '')}
                      lastName={String(s.LastName || '')}
                      profileImageUrl={s.ProfileImageUrl ? String(s.ProfileImageUrl) : null}
                      role="student"
                      size="md"
                    />
                  </Link>
                ) : (
                  <span className="review-row__avatar">?</span>
                )}
                <div className="review-row__identity">
                  {s.StudentId ? (
                    <Link to={`/students/${Number(s.StudentId)}`} className="review-row__name">
                      <strong>{String(s.FirstName)} {String(s.LastName)}</strong>
                    </Link>
                  ) : (
                    <strong>{String(s.FirstName)} {String(s.LastName)}</strong>
                  )}
                  <p>{String(s.UniversityId)} · submitted {fmt(String(s.SubmittedAt))}</p>
                </div>
                {marked ? (
                  <span className={`review-row__mark review-row__mark--${band.tone}`}>
                    <strong>{total}</strong>
                    <em>/100 · {band.grade}</em>
                  </span>
                ) : (
                  <span className="review-row__pending">
                    <AlertCircle size={13} /> Awaiting mark
                  </span>
                )}
              </div>

              {Boolean(s.Content) && (
                <p className="review-row__text">{String(s.Content)}</p>
              )}

              {hasFile && (
                <PdfReviewActions
                  name={String(s.AttachmentName || 'Student assignment.pdf')}
                  loadFile={() => api.getClassAssignmentSubmissionFile(submissionId)}
                  label="Assignment PDF · opens in a new tab"
                />
              )}

              {marked && !isGrading && (
                <div className="review-row__result">
                  <span><Award size={17} /></span>
                  <div>
                    <strong>{band.label} · {total}/100</strong>
                    <p>
                      Base {Number(s.Score)}
                      {Number(s.BonusPoints || 0) > 0 ? ` · bonus +${Number(s.BonusPoints)}` : ' · no bonus'}
                      {s.GradedAt ? ` · marked ${fmt(String(s.GradedAt))}` : ''}
                    </p>
                    {Boolean(s.TeacherFeedback) && <q>{String(s.TeacherFeedback)}</q>}
                  </div>
                  <button type="button" onClick={() => openGrade(s)}>Revise mark</button>
                </div>
              )}

              {!marked && !isGrading && (
                <button type="button" className="teacher-start-grading" onClick={() => openGrade(s)}>
                  <MessageSquare size={14} /> Give mark and feedback
                </button>
              )}

              {isGrading && (
                <div className="grade-panel">
                  <header className="grade-panel__head">
                    <span><Award size={17} /></span>
                    <div>
                      <strong>Marking {String(s.FirstName)} {String(s.LastName)}</strong>
                      <p>The result and your feedback reach the student immediately.</p>
                    </div>
                    <button type="button" onClick={() => setGradingId(null)} aria-label="Close marking panel">
                      <X size={15} />
                    </button>
                  </header>

                  <div className="grade-panel__grid">
                    <div className="grade-panel__field">
                      <label htmlFor={`score-${submissionId}`}>Mark out of 100</label>
                      <input
                        id={`score-${submissionId}`}
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        value={gradeForm.score}
                        onChange={(e) => setGradeForm((c) => ({ ...c, score: e.target.value }))}
                        placeholder="0–100"
                      />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={Number(gradeForm.score || 0)}
                        onChange={(e) => setGradeForm((c) => ({ ...c, score: e.target.value }))}
                        aria-label="Mark slider"
                      />
                      <div className="grade-panel__chips">
                        {[50, 60, 70, 80, 90, 100].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setGradeForm((c) => ({ ...c, score: String(value) }))}
                            className={Number(gradeForm.score) === value ? 'is-active' : ''}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grade-panel__field">
                      <label>Bonus points</label>
                      <div className="grade-panel__stepper">
                        <button type="button" onClick={() => adjustBonus(-1)} aria-label="Decrease bonus">−</button>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step="0.5"
                          value={gradeForm.bonusPoints}
                          onChange={(e) => setGradeForm((c) => ({ ...c, bonusPoints: e.target.value }))}
                        />
                        <button type="button" onClick={() => adjustBonus(1)} aria-label="Increase bonus">+</button>
                      </div>
                      <p className="grade-panel__hint">Extra credit for outstanding work. Maximum 20.</p>
                    </div>

                    <div className={`grade-panel__result grade-panel__result--${draftBand.tone}`}>
                      <span>Final mark</span>
                      <strong>{draftTotal}</strong>
                      <em>{draftBand.label} · {draftBand.grade}</em>
                    </div>
                  </div>

                  <div className="grade-panel__feedback">
                    <label htmlFor={`feedback-${submissionId}`}>Feedback to the student</label>
                    <textarea
                      id={`feedback-${submissionId}`}
                      maxLength={4000}
                      value={gradeForm.feedback}
                      onChange={(e) => setGradeForm((c) => ({ ...c, feedback: e.target.value }))}
                      placeholder="Explain what was done well and what should improve…"
                    />
                    <div className="grade-panel__chips grade-panel__chips--wide">
                      {QUICK_FEEDBACK.map((phrase) => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => setGradeForm((c) => ({ ...c, feedback: phrase }))}
                        >
                          {phrase.split(' ').slice(0, 3).join(' ')}…
                        </button>
                      ))}
                      <span className="grade-panel__count">{gradeForm.feedback.length}/4000</span>
                    </div>
                  </div>

                  {gradeError && (
                    <p className="grade-panel__error"><AlertCircle size={14} /> {gradeError}</p>
                  )}

                  <div className="grade-panel__actions">
                    <button
                      type="button"
                      onClick={() => void saveGrade()}
                      disabled={savingGrade || gradeForm.score === ''}
                    >
                      <Save size={14} /> {savingGrade ? 'Saving…' : 'Save and send mark'}
                    </button>
                    <button type="button" onClick={() => setGradingId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {awaiting.length > 0 && (
          <div className="review-awaiting">
            <h3>Not submitted yet ({awaiting.length})</h3>
            <ul>
              {awaiting.map((student) => (
                <li key={String(student.StudentId)}>
                  <Link to={`/students/${Number(student.StudentId)}`}>
                    <UserAvatar
                      firstName={String(student.FirstName || '')}
                      lastName={String(student.LastName || '')}
                      profileImageUrl={student.ProfileImageUrl ? String(student.ProfileImageUrl) : null}
                      role="student"
                      size="sm"
                    />
                    <span>
                      <strong>{String(student.FirstName)} {String(student.LastName)}</strong>
                      <em>{String(student.UniversityId)}</em>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
