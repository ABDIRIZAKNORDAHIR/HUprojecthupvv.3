import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Hash,
  Layers,
  ListChecks,
  Sparkle,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router';
import { ProgressRing } from './ProgressRing';
import { UserAvatar } from './UserAvatar';
import { awaitsTeacherReview, stageLabel } from '../utils/mapSubmissions';
import type { Submission } from '../types';

interface SubmissionBrowserProps {
  submissions: Submission[];
}

const statusMeta = {
  approve: { label: 'Looks ready', bg: '#F0FDF4', text: '#15803D', dot: '#16A34A' },
  request_changes: { label: 'Needs changes', bg: '#FEFCE8', text: '#A16207', dot: '#EAB308' },
  reject: { label: 'Weak proposal', bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' },
  none: { label: 'Not analysed', bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
} as const;

type StatusKey = keyof typeof statusMeta;

function statusOf(s: Submission): StatusKey {
  const d = s.athena.realAI?.recommendedDecision;
  if (d === 'approve' || d === 'reject' || d === 'request_changes') return d;
  return 'none';
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function SubmissionBrowser({ submissions }: SubmissionBrowserProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const total = submissions.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const current = submissions[safeIndex];

  const go = useMemo(
    () => (next: number) => {
      setDirection(next > safeIndex ? 1 : -1);
      setIndex(Math.max(0, Math.min(next, total - 1)));
    },
    [safeIndex, total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') go(safeIndex + 1);
      if (e.key === 'ArrowLeft') go(safeIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, safeIndex]);

  if (!current) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
        <FileText size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-semibold text-gray-700">Nothing waiting on you</p>
        <p className="mt-1 text-xs text-gray-400">
          Every project you received has a decision. New ones appear here the moment a student sends them,
          oldest first.
        </p>
      </div>
    );
  }

  const meta = statusMeta[statusOf(current)] ?? statusMeta.none;
  const realAI = current.athena.realAI;
  const about = realAI?.whatProjectIsAbout || current.abstract || 'No summary yet.';
  const words = wordCount(current.abstract);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-gray-500">
          Project {safeIndex + 1} of {total}
        </span>
        <div className="flex flex-1 gap-1">
          {submissions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to project ${i + 1}`}
              onClick={() => go(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === safeIndex ? 28 : 10,
                background: i === safeIndex ? '#16A34A' : i < safeIndex ? '#86EFAC' : '#E2E8F0',
              }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(safeIndex - 1)}
            disabled={safeIndex === 0}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-white transition-colors hover:bg-gray-50 disabled:opacity-30"
            aria-label="Previous project"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => go(safeIndex + 1)}
            disabled={safeIndex >= total - 1}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-white transition-colors hover:bg-gray-50 disabled:opacity-30"
            aria-label="Next project"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.article
            key={current.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-start gap-3 border-b border-border bg-gradient-to-r from-green-50/70 to-blue-50/50 p-5">
              <UserAvatar
                firstName={current.student_name.split(' ')[0]}
                lastName={current.student_name.split(' ').slice(1).join(' ')}
                profileImageUrl={current.student_photo}
                role="student"
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">
                    {current.project_title || 'Untitled project'}
                  </h3>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{ background: meta.bg, color: meta.text }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />
                    {meta.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {current.student_id ? (
                    <Link to={`/students/${current.student_id}`} className="font-semibold text-teal-800 hover:underline">
                      {current.student_name}
                    </Link>
                  ) : current.student_name}
                  {' · '}<span className="font-mono font-semibold text-teal-700">{current.department}</span>
                  {' · '}
                  <span className="font-semibold capitalize text-amber-700">{stageLabel(current.stage)}</span>
                </p>
              </div>
              <Link
                to={`/projects/${current.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-green-800"
              >
                {awaitsTeacherReview(current) ? 'Open and decide' : 'Open project'} <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-start gap-5">
                <ProgressRing value={current.athena.uniqueness_score} size={96} label="Quality" />
                <div className="min-w-[240px] flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-green-700">
                    What this project is about
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-700">{about}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { icon: TrendingUp, label: 'Confidence', value: `${current.athena.ai_confidence}%` },
                  { icon: Layers, label: 'Abstract length', value: `${words} words` },
                  { icon: Hash, label: 'Project code', value: `#${current.id}` },
                  { icon: CalendarDays, label: 'Arrived', value: current.submission_date },
                ].map((cell, i) => {
                  const Icon = cell.icon;
                  return (
                    <motion.div
                      key={cell.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 + i * 0.05 }}
                      className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2"
                    >
                      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        <Icon size={11} /> {cell.label}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-gray-800">{cell.value}</p>
                    </motion.div>
                  );
                })}
              </div>

              {realAI?.decisionReasoning && (
                <div className="rounded-xl border p-3" style={{ background: meta.bg, borderColor: `${meta.dot}40` }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: meta.text }}>Why</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-800">{realAI.decisionReasoning}</p>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                {!!realAI?.strengths?.length && (
                  <div className="rounded-xl border border-green-100 bg-green-50/60 p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-green-700">
                      <Sparkle size={12} /> Strengths
                    </p>
                    {realAI.strengths.slice(0, 4).map(item => (
                      <p key={item} className="text-[11px] text-green-900">• {item}</p>
                    ))}
                  </div>
                )}
                {!!realAI?.whatShouldContain?.length && (
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                      <ListChecks size={12} /> What it should contain
                    </p>
                    {realAI.whatShouldContain.slice(0, 4).map(item => (
                      <p key={item} className="text-[11px] text-gray-700">• {item}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {submissions.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(i)}
            className={`min-w-[150px] shrink-0 rounded-xl border px-3 py-2 text-left transition-colors ${
              i === safeIndex ? 'border-green-500 bg-green-50' : 'border-border bg-white hover:bg-gray-50'
            }`}
          >
            <p className="truncate text-[11px] font-bold text-gray-900">{s.project_title || 'Untitled'}</p>
            <p className="truncate text-[10px] text-gray-500">{s.student_name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
