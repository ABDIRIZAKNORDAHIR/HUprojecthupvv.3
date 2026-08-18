import { useState } from 'react';
import { AlertCircle, Check, Edit3, Send, X } from 'lucide-react';
import { motion } from 'motion/react';

export type ReviewDecision = 'approved' | 'changes_requested' | 'rejected';

interface ReviewDecisionPanelProps {
  allowChanges?: boolean;
  busy?: boolean;
  compact?: boolean;
  /** Outcome proposed by the automated review; pre-selected so the teacher confirms once. */
  suggested?: ReviewDecision | null;
  /** Reasoning behind the suggestion, used to pre-fill the comment. */
  suggestedNote?: string | null;
  onSubmit: (decision: ReviewDecision, comment: string) => Promise<void> | void;
}

const choices = [
  { id: 'approved' as const, label: 'Approve', icon: Check, active: 'border-green-500 bg-green-50 text-green-800' },
  { id: 'changes_requested' as const, label: 'Request changes', icon: Edit3, active: 'border-amber-500 bg-amber-50 text-amber-800' },
  { id: 'rejected' as const, label: 'Reject', icon: X, active: 'border-red-500 bg-red-50 text-red-800' },
];

const outcomeWord: Record<ReviewDecision, string> = {
  approved: 'approving',
  changes_requested: 'requesting changes',
  rejected: 'rejecting',
};

export function ReviewDecisionPanel({
  allowChanges = true,
  busy = false,
  compact = false,
  suggested = null,
  suggestedNote = null,
  onSubmit,
}: ReviewDecisionPanelProps) {
  const startDecision: ReviewDecision = suggested ?? 'approved';
  const startComment = suggested && suggested !== 'approved' ? (suggestedNote?.trim() ?? '') : '';
  const [decision, setDecision] = useState<ReviewDecision>(startDecision);
  const [comment, setComment] = useState(startComment);
  const [error, setError] = useState('');

  const available = allowChanges ? choices : choices.filter(choice => choice.id !== 'changes_requested');
  const requiresComment = decision !== 'approved';

  const submit = async () => {
    if (requiresComment && !comment.trim()) {
      setError(decision === 'rejected'
        ? 'Explain why you are rejecting this project.'
        : 'Tell the student what must be changed.');
      return;
    }
    setError('');
    await onSubmit(decision, comment.trim());
    setComment(startComment);
    setDecision(startDecision);
  };

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white ${compact ? 'p-3' : 'p-4'} shadow-sm`}>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900">Make a decision</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          {suggested
            ? `The review suggests ${outcomeWord[suggested]} — it is already selected with its note. Change it if you disagree, then submit once.`
            : 'Choose one outcome, add one comment, then submit once.'}
        </p>
      </div>

      <div className={`grid gap-2 ${available.length === 3 ? 'sm:grid-cols-3' : 'grid-cols-2'}`}>
        {available.map(choice => {
          const Icon = choice.icon;
          const selected = decision === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => {
                setDecision(choice.id);
                setError('');
              }}
              aria-pressed={selected}
              className={`relative flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                selected ? choice.active : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} />
              {choice.label}
              {suggested === choice.id && (
                <span className="absolute -top-2 right-2 rounded-full bg-gray-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Suggested
                </span>
              )}
            </button>
          );
        })}
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-semibold text-gray-700">
          Comment {requiresComment ? <em className="not-italic text-red-600">*</em> : <span className="font-normal text-gray-400">(optional)</span>}
        </span>
        <textarea
          value={comment}
          onChange={event => {
            setComment(event.target.value);
            setError('');
          }}
          rows={compact ? 2 : 3}
          maxLength={1500}
          placeholder={
            decision === 'approved'
              ? 'Add a short note for the student…'
              : decision === 'rejected'
                ? 'Explain clearly why this project cannot be accepted…'
                : 'List the changes the student needs to make…'
          }
          className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/15"
        />
      </label>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-700">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={submit}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-green-800 disabled:opacity-50"
      >
        <Send size={14} />
        {busy ? 'Submitting decision…' : 'Submit decision'}
      </motion.button>
    </div>
  );
}
