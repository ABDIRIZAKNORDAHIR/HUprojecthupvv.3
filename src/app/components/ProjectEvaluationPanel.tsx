import { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Send } from 'lucide-react';
import { api } from '../api/client';

interface ProjectEvaluationPanelProps {
  projectId: number;
  studentId?: number;
  onSubmitted?: () => void;
}

export function ProjectEvaluationPanel({ projectId, studentId, onSubmitted }: ProjectEvaluationPanelProps) {
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!feedback.trim()) { setError('Feedback is required'); return; }
    setSaving(true);
    setError('');
    try {
      await api.submitProjectEvaluation(projectId, {
        studentId,
        grade: grade ? Number(grade) : undefined,
        feedback: feedback.trim(),
        remarks: remarks.trim() || undefined,
      });
      setDone(true);
      setFeedback('');
      setRemarks('');
      setGrade('');
      onSubmitted?.();
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit evaluation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap size={18} className="text-blue-600" />
        <h3 className="font-bold text-sm">Project Evaluation & Grade</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Provide feedback and a grade. The student receives a notification and the evaluation is saved in chat history.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-gray-500">Grade (%)</label>
          <input type="number" min={0} max={100} value={grade} onChange={e => setGrade(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 85" />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-500">Feedback *</label>
        <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4}
          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm resize-none"
          placeholder="Assessment comments for the student..." />
      </div>
      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-500">Remarks (optional)</label>
        <input value={remarks} onChange={e => setRemarks(e.target.value)}
          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Internal notes" />
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {done && <p className="text-xs text-green-600 mb-2">Evaluation sent — student notified.</p>}
      <motion.button whileTap={{ scale: 0.98 }} onClick={submit} disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
        <Send size={14} /> {saving ? 'Sending...' : 'Submit Evaluation'}
      </motion.button>
    </div>
  );
}
