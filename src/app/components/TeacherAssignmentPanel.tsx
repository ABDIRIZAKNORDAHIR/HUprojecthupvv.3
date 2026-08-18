import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../api/client';
import { PdfReviewActions } from './PdfReviewActions';
import { ProgressRing } from './ProgressRing';
import { ReviewDecisionPanel, type ReviewDecision } from './ReviewDecisionPanel';
import { UserAvatar } from './UserAvatar';

type RequestReview = {
  summary?: string | null;
  qualityScore?: number | null;
  recommendedDecision?: string | null;
  decisionConfidence?: number | null;
  decisionReasoning?: string | null;
  decisionLabel?: string | null;
  whatProjectIsAbout?: string | null;
  whatShouldContain?: string[];
  featureSuggestions?: string[];
};

type AssignmentRequest = Record<string, unknown> & {
  ProjectId: number;
  review?: RequestReview | null;
};

function mapSuggested(decision?: string | null): ReviewDecision | null {
  if (decision === 'approve') return 'approved';
  if (decision === 'reject') return 'rejected';
  if (decision === 'request_changes' || decision === 'changes_requested') return 'changes_requested';
  return null;
}

function decisionTone(decision?: string | null) {
  if (decision === 'approve') return { bg: '#16A34A', wrap: 'border-green-200 bg-green-50', text: 'text-green-800' };
  if (decision === 'reject') return { bg: '#EF4444', wrap: 'border-red-200 bg-red-50', text: 'text-red-800' };
  return { bg: '#EAB308', wrap: 'border-amber-200 bg-amber-50', text: 'text-amber-800' };
}

export function TeacherAssignmentPanel() {
  const [requests, setRequests] = useState<AssignmentRequest[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const r = await api.getTeacherAssignmentRequests();
      setRequests(r.requests as AssignmentRequest[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const ensureReview = async (projectId: number) => {
    const current = requests.find((r) => Number(r.ProjectId) === projectId);
    if (current?.review?.recommendedDecision) return;
    setAnalyzingId(projectId);
    setError('');
    try {
      const result = await api.analyzeProjectAI(projectId);
      const a = result.analysis || {};
      setRequests((prev) =>
        prev.map((row) =>
          Number(row.ProjectId) === projectId
            ? {
                ...row,
                review: {
                  summary: String(a.summary || ''),
                  qualityScore: a.qualityScore != null ? Number(a.qualityScore) : null,
                  recommendedDecision: (a.recommendedDecision as string) || null,
                  decisionConfidence: a.decisionConfidence != null ? Number(a.decisionConfidence) : null,
                  decisionReasoning: (a.decisionReasoning as string) || null,
                  decisionLabel: (a.decisionLabel as string) || null,
                  whatProjectIsAbout: (a.whatProjectIsAbout as string) || null,
                  whatShouldContain: Array.isArray(a.whatShouldContain) ? (a.whatShouldContain as string[]) : [],
                  featureSuggestions: Array.isArray(a.featureSuggestions) ? (a.featureSuggestions as string[]) : [],
                },
              }
            : row,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare the review summary.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const openReview = async (projectId: number) => {
    setError('');
    setOpenId(projectId);
    await ensureReview(projectId);
  };

  const respond = async (projectId: number, decision: ReviewDecision, comment: string) => {
    setBusyId(projectId);
    setError('');
    try {
      await api.respondToAssignment(projectId, {
        action:
          decision === 'approved'
            ? 'accept'
            : decision === 'changes_requested'
              ? 'request_changes'
              : 'reject',
        rejectionReason: decision === 'rejected' ? comment : undefined,
        message: decision !== 'rejected' ? comment || undefined : undefined,
      });
      setOpenId(null);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not submit the decision.';
      setError(message);
      // Stale cards (already decided elsewhere) should disappear after refresh.
      if (/not found/i.test(message)) {
        setOpenId(null);
        await load();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return null;
  if (!requests.length) return null;

  return (
    <section className="teacher-request-panel rounded-xl border p-5 space-y-4">
      <div className="teacher-request-panel__head flex items-center gap-2">
        <span><Bell size={18} /></span>
        <h2 className="font-bold text-gray-900">Requests ({requests.length})</h2>
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {requests.map((r) => {
        const projectId = Number(r.ProjectId);
        const isOpen = openId === projectId;
        const review = r.review;
        const tone = decisionTone(review?.recommendedDecision);
        const suggested = mapSuggested(review?.recommendedDecision);

        return (
          <motion.div
            key={String(r.ProjectId)}
            className="teacher-request-card bg-white rounded-xl border overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                {r.StudentId ? (
                  <Link to={`/students/${Number(r.StudentId)}`} className="flex-shrink-0">
                    <UserAvatar
                      firstName={String(r.StudentFirstName || r.StudentName || '')}
                      lastName={String(r.StudentLastName || '')}
                      profileImageUrl={r.StudentProfileImageUrl ? String(r.StudentProfileImageUrl) : null}
                      role="student"
                      size="md"
                    />
                  </Link>
                ) : (
                  <UserAvatar
                    firstName={String(r.StudentFirstName || r.StudentName || '')}
                    lastName={String(r.StudentLastName || '')}
                    profileImageUrl={r.StudentProfileImageUrl ? String(r.StudentProfileImageUrl) : null}
                    role="student"
                    size="md"
                  />
                )}
                <div className="min-w-0 flex-1">
                <span className="font-mono text-xs text-teal-700 font-bold">{String(r.TeacherAssignedId)}</span>
                <h3 className="font-bold text-gray-900">{String(r.Title)}</h3>
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                  <GraduationCap size={14} /> {String(r.StudentName)} ({String(r.StudentUniversityId)}) · {String(r.StudentDepartment)}
                </p>
                {Boolean(r.Abstract) && <p className="text-sm text-gray-500 mt-2">{String(r.Abstract)}</p>}
                {Boolean(r.Description) && <p className="text-xs text-gray-400 mt-1">{String(r.Description)}</p>}
                {Boolean(r.AttachmentData) && (
                  <PdfReviewActions
                    name={String(r.AttachmentName || 'Project proposal.pdf')}
                    data={String(r.AttachmentData)}
                    label="Proposal PDF · open in a new tab to read"
                  />
                )}
                </div>
              </div>

              {!isOpen && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => void openReview(projectId)}
                    className="teacher-request-accept flex items-center gap-1 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                  >
                    Open review
                  </button>
                  <Link
                    to={`/projects/${r.ProjectId}`}
                    className="teacher-request-view px-4 py-2 rounded-lg border text-sm font-semibold"
                  >
                    Full project
                  </Link>
                </div>
              )}
            </div>

            {isOpen && (
              <div className="border-t border-border bg-gradient-to-br from-green-50/50 to-blue-50/50">
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span className="text-[13px] font-bold text-green-700">Review summary</span>
                    {review?.decisionLabel && (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ background: tone.bg }}
                      >
                        {review.decisionLabel}
                      </span>
                    )}
                    {review?.decisionConfidence != null && (
                      <span className="ml-auto text-xs font-semibold text-green-700">
                        {review.decisionConfidence}% confidence
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void ensureReview(projectId)}
                      disabled={analyzingId === projectId}
                      className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={analyzingId === projectId ? 'animate-spin' : ''} />
                      {analyzingId === projectId ? 'Analyzing…' : 'Refresh review'}
                    </button>
                  </div>

                  {analyzingId === projectId && !review ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 text-center text-sm text-gray-500">
                      Preparing the review summary…
                    </div>
                  ) : review ? (
                    <>
                      {review.whatProjectIsAbout && (
                        <div className="rounded-xl border border-green-100 bg-white p-3">
                          <p className="text-[11px] font-bold text-green-700 mb-1">What this project is about</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{review.whatProjectIsAbout}</p>
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        <ProgressRing
                          value={Number(review.qualityScore ?? 0)}
                          size={84}
                          label="Quality"
                        />
                        <div className={`flex-1 rounded-xl border p-3 ${tone.wrap}`}>
                          <p className={`text-[11px] font-bold uppercase tracking-wide ${tone.text}`}>Why</p>
                          <p className="mt-1 text-xs font-semibold text-gray-900 leading-relaxed">
                            {review.decisionReasoning || review.summary || 'No note yet.'}
                          </p>
                        </div>
                      </div>

                      {!!review.whatShouldContain?.length && (
                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                          <p className="text-[11px] font-bold text-gray-500 mb-1">What it should contain</p>
                          {review.whatShouldContain.slice(0, 5).map((item) => (
                            <p key={item} className="text-[11px] text-gray-700">• {item}</p>
                          ))}
                        </div>
                      )}

                      {!!review.featureSuggestions?.length && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                          <p className="text-[11px] font-bold text-blue-700 mb-1">Features to add</p>
                          {review.featureSuggestions.slice(0, 4).map((item) => (
                            <p key={item} className="text-[11px] text-blue-900">• {item}</p>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      No review summary yet. Use Refresh review, then decide once below.
                    </div>
                  )}
                </div>

                <div className="border-t border-border bg-white p-4 space-y-2">
                  <ReviewDecisionPanel
                    key={`${projectId}-${suggested || 'none'}`}
                    compact
                    allowChanges
                    busy={busyId === projectId}
                    suggested={suggested}
                    suggestedNote={review?.decisionReasoning || null}
                    onSubmit={(decision, comment) => respond(projectId, decision, comment)}
                  />
                  <button
                    type="button"
                    onClick={() => setOpenId(null)}
                    className="w-full text-xs font-semibold text-gray-500 py-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </section>
  );
}
