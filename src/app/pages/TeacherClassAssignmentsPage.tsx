import { useEffect, useMemo, useState } from 'react';
import { Clock, Send } from 'lucide-react';
import { api } from '../api/client';

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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [subs, setSubs] = useState<Array<Record<string, unknown>>>([]);

  const classOptions = useMemo(() => {
    const names = new Set<string>();
    for (const c of classes) {
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
      setClasses(c.classes);
      setAssignments(a.assignments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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

  const openSubs = async (id: number) => {
    setSelectedId(id);
    try {
      const res = await api.getClassAssignmentSubmissions(id);
      setSubs(res.submissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading class assignments…</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Class assignments</h1>
      </div>

      <form onSubmit={send} className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
        <h2 className="font-bold text-sm">New</h2>
        <div>
          <label className="text-xs font-semibold text-gray-600">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
            placeholder="Week 3 Lab — Database Design"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Instructions</label>
          <textarea
            value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm min-h-[90px]"
            placeholder="What students must do…"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
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
          <div>
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
          <div>
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
        <div>
          <label className="text-xs font-semibold text-gray-600">Or exact deadline (optional)</label>
          <input
            type="datetime-local"
            value={form.deadlineAt}
            onChange={(e) => setForm((f) => ({ ...f, deadlineAt: e.target.value }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {message && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{message}</p>}
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          <Send size={14} />
          {sending ? 'Sending…' : 'Send to class'}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="font-bold text-sm">Sent</h2>
        {assignments.length === 0 && (
          <p className="text-sm text-gray-400">None</p>
        )}
        {assignments.map((a) => {
          const id = Number(a.AssignmentId);
          const closed = Number(a.IsClosed) === 1;
          return (
            <div key={id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{String(a.Title)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Class {String(a.ClassName)}
                    {a.StudyMode ? ` · ${String(a.StudyMode).replace('_', '-')}` : ' · all modes'}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Clock size={12} /> Deadline: {fmt(String(a.DeadlineAt))}
                    {closed ? ' · CLOSED' : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Submissions: {Number(a.SubmissionCount || 0)} / {Number(a.TargetCount || 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openSubs(id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                >
                  View submissions
                </button>
              </div>
              {selectedId === id && (
                <div className="mt-3 border-t pt-3 space-y-2">
                  {subs.length === 0 && <p className="text-xs text-gray-500">No submissions yet.</p>}
                  {subs.map((s) => (
                    <div key={String(s.SubmissionId)} className="rounded-lg bg-gray-50 p-3 text-sm">
                      <p className="font-semibold">
                        {String(s.FirstName)} {String(s.LastName)} · {String(s.UniversityId)}
                      </p>
                      <p className="text-xs text-gray-500">{fmt(String(s.SubmittedAt))}</p>
                      <p className="mt-1 whitespace-pre-wrap text-gray-700">{String(s.Content)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
