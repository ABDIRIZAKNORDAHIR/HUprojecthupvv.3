import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, Send } from 'lucide-react';
import { api } from '../api/client';

function fmt(dt?: string | null) {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt);
  }
}

export function StudentClassAssignmentsPage() {
  const [assignments, setAssignments] = useState<Array<Record<string, unknown>>>([]);
  const [warning, setWarning] = useState('');
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [okMsg, setOkMsg] = useState('');

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
      const res = await api.submitClassAssignment(assignmentId, { content });
      setOkMsg(res.message);
      setContent('');
      setActiveId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading your class assignments…</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Assignments</h1>
        {className ? <p className="text-xs text-gray-400 mt-1">{className}</p> : null}
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
        <p className="text-sm text-gray-500">No class assignments yet.</p>
      )}

      {assignments.map((a) => {
        const id = Number(a.AssignmentId);
        const expired = Number(a.IsExpired) === 1 || Number(a.IsClosed) === 1;
        const submitted = Number(a.HasSubmitted) === 1;
        return (
          <div key={id} className={`rounded-xl border bg-white p-4 ${expired ? 'opacity-90' : ''}`}>
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900">{String(a.Title)}</p>
                <p className="text-xs text-gray-500 mt-1">Teacher: {String(a.TeacherName || '—')}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock size={12} /> Deadline: {fmt(String(a.DeadlineAt))}
                </p>
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
            {a.Instructions && (
              <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{String(a.Instructions)}</p>
            )}
            {submitted && a.MyContent && (
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                <p className="text-xs font-semibold text-gray-500 mb-1">Your submission</p>
                <p className="whitespace-pre-wrap">{String(a.MyContent)}</p>
              </div>
            )}

            {!expired && (
              <div className="mt-3">
                {activeId === id ? (
                  <div className="space-y-2">
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm min-h-[100px]"
                      placeholder="Write your assignment answer…"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={submitting || !content.trim()}
                        onClick={() => submit(id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        <Send size={12} />
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
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white"
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
          </div>
        );
      })}
    </div>
  );
}
