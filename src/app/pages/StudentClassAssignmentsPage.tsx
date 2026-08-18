import { useEffect, useRef, useState } from 'react';
import {
  Clock, AlertTriangle, Send, UploadCloud, FileText, X, CheckCircle2,
  ClipboardList, Award, Star, MessageSquare,
} from 'lucide-react';
import { api } from '../api/client';

function fmt(dt?: string | null) {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt);
  }
}

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const ACCEPTED_FILES = '.pdf,.docx,.xlsx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain';

function timeRemaining(deadline: unknown) {
  const ms = new Date(String(deadline)).getTime() - Date.now();
  if (ms <= 0) return 'Deadline passed';
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) return `${hours}h ${Math.floor((ms % 3_600_000) / 60_000)}m remaining`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`;
}

export function StudentClassAssignmentsPage() {
  const [assignments, setAssignments] = useState<Array<Record<string, unknown>>>([]);
  const [warning, setWarning] = useState('');
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; data: string; size: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [okMsg, setOkMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getStudentClassAssignments();
      setAssignments(res.assignments);
      setWarning(res.warning || '');
      setClassName(res.className || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (assignmentId: number) => {
    setSubmitting(true);
    setError('');
    setOkMsg('');
    try {
      const res = await api.submitClassAssignment(assignmentId, {
        content,
        ...(attachment ? { attachmentName: attachment.name, attachmentData: attachment.data } : {}),
      });
      setOkMsg(res.message);
      setContent('');
      setAttachment(null);
      setActiveId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const pickFile = (file?: File) => {
    if (!file) return;
    setError('');
    if (file.size > MAX_FILE_BYTES) {
      setError('File is too large. The current secure upload limit is 3 MB.');
      return;
    }
    const allowed = file.type === 'application/pdf'
      || file.type === 'text/plain'
      || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (!allowed) {
      setError('Only PDF, DOCX, XLSX, and TXT files are accepted.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: file.name, data: String(reader.result), size: file.size });
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading your class assignments…</div>;
  }

  return (
    <div className="student-assignment-page dashboard-canvas space-y-6 pb-mobile-nav">
      <div className="dashboard-command-hero student-assignment-hero">
        <div>
          <span className="dashboard-eyebrow"><ClipboardList size={14} /> Learning workspace</span>
          <h1>Class assignments</h1>
          <p>{className ? `${className} · ` : ''}Review deadlines, upload your work, and track every submission.</p>
        </div>
        <div className="dashboard-hero-stat student-open-task-stat">
          <strong>{assignments.filter(a => Number(a.HasSubmitted) !== 1 && Number(a.IsExpired) !== 1).length}</strong>
          <span>Open tasks</span>
        </div>
      </div>

      {warning && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {warning}
        </div>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {okMsg && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{okMsg}</p>}

      {assignments.length === 0 && !warning && (
        <div className="student-assignment-empty">
          <ClipboardList size={26} />
          <strong>Your task list is clear</strong>
          <p>New assignments from your teacher will appear here.</p>
        </div>
      )}

      {assignments.map((a) => {
        const id = Number(a.AssignmentId);
        const expired = Number(a.IsExpired) === 1 || Number(a.IsClosed) === 1;
        const submitted = Number(a.HasSubmitted) === 1;
        return (
          <article key={id} className={`assignment-card student-assignment-card ${expired ? 'assignment-card--closed' : ''}`}>
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900">{String(a.Title)}</p>
                <p className="text-xs text-gray-500 mt-1">Teacher: {String(a.TeacherName || '—')}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock size={12} /> Deadline: {fmt(String(a.DeadlineAt))}
                </p>
                {!expired && <p className="text-xs font-bold text-emerald-700 mt-1">{timeRemaining(a.DeadlineAt)}</p>}
              </div>
              <div className="text-xs font-semibold">
                {expired ? (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">Time over</span>
                ) : submitted ? (
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">Submitted</span>
                ) : (
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">Open</span>
                )}
              </div>
            </div>
            {Boolean(a.Instructions) && (
              <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{String(a.Instructions)}</p>
            )}
            {submitted && Boolean(a.MyContent) && (
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                <p className="text-xs font-semibold text-gray-500 mb-1">Your submission</p>
                <p className="whitespace-pre-wrap">{String(a.MyContent)}</p>
              </div>
            )}
            {submitted && Boolean(a.MyAttachmentName) && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                <FileText size={15} /> {String(a.MyAttachmentName)}
              </div>
            )}

            {a.Score != null && (
              <div className="student-grade-card">
                <span><Award size={22} /></span>
                <div className="student-grade-card__score">
                  <strong>{Math.min(100, Number(a.Score) + Number(a.BonusPoints || 0))}</strong>
                  <em>/100</em>
                </div>
                <div className="student-grade-card__detail">
                  <h3>Your mark</h3>
                  <p>
                    Base mark {Number(a.Score)}
                    {Number(a.BonusPoints || 0) > 0 && <> · <Star size={12} /> +{Number(a.BonusPoints)} bonus</>}
                  </p>
                </div>
                {Boolean(a.TeacherFeedback) && (
                  <blockquote><MessageSquare size={14} /> {String(a.TeacherFeedback)}</blockquote>
                )}
              </div>
            )}

            {!expired && (
              <div className="mt-3">
                {activeId === id ? (
                  <div className="student-submission-composer space-y-3 rounded-2xl border p-4">
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm min-h-[100px]"
                      placeholder="Write your answer, notes, or a short message for your teacher…"
                    />
                    <input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPTED_FILES}
                      className="hidden"
                      onChange={(e) => pickFile(e.target.files?.[0])}
                    />
                    {attachment ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <FileText size={20} className="shrink-0 text-red-600" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{attachment.name}</p>
                            <p className="text-xs text-gray-500">{(attachment.size / 1024 / 1024).toFixed(2)} MB · ready</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment" className="rounded-lg p-2 hover:bg-gray-100">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                      className="student-upload-zone flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-white px-4 py-5 text-sm font-bold"
                      >
                        <UploadCloud size={20} /> Attach PDF, DOCX, XLSX, or TXT
                        <span className="text-xs font-normal text-gray-500">(max 3 MB)</span>
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={submitting || (!content.trim() && !attachment)}
                        onClick={() => submit(id)}
                        className="student-submit-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50"
                      >
                        {submitted ? <CheckCircle2 size={14} /> : <Send size={14} />}
                        {submitting ? 'Submitting…' : submitted ? 'Update submission' : 'Submit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveId(null)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(id);
                      setContent(String(a.MyContent || ''));
                      setAttachment(null);
                    }}
                    className="student-submit-button text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                  >
                    {submitted ? 'Edit submission' : 'Submit work'}
                  </button>
                )}
              </div>
            )}

            {expired && !submitted && (
              <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Time is over. You can no longer send this assignment.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
