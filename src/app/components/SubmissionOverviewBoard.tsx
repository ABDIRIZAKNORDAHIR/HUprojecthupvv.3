import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, FileText, Search, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { UserAvatar } from './UserAvatar';
import { awaitsTeacherReview, stageLabel } from '../utils/mapSubmissions';
import type { Submission } from '../types';

interface SubmissionOverviewBoardProps {
  submissions: Submission[];
  limit?: number;
}

type SuggestedKey = 'approve' | 'request_changes' | 'reject' | 'none';

const suggestionMeta: Record<SuggestedKey, { label: string; bg: string; text: string; dot: string }> = {
  approve: { label: 'Looks ready', bg: '#F0FDF4', text: '#15803D', dot: '#16A34A' },
  request_changes: { label: 'Needs changes', bg: '#FEFCE8', text: '#A16207', dot: '#EAB308' },
  reject: { label: 'Weak proposal', bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' },
  none: { label: 'Not analysed', bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
};

function suggestionOf(s: Submission): SuggestedKey {
  const d = s.athena.realAI?.recommendedDecision;
  if (d === 'approve' || d === 'reject' || d === 'request_changes') return d;
  return 'none';
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function themeOf(s: Submission) {
  const source = s.athena.realAI?.whatProjectIsAbout || s.abstract || '';
  const firstSentence = source.split(/(?<=[.!?])\s/)[0] || source;
  return firstSentence.length > 180 ? `${firstSentence.slice(0, 180)}…` : firstSentence;
}

function scoreColor(score: number) {
  if (score >= 75) return '#16A34A';
  if (score >= 50) return '#EAB308';
  return '#EF4444';
}

export function SubmissionOverviewBoard({ submissions, limit }: SubmissionOverviewBoardProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | SuggestedKey>('all');

  const stats = useMemo(() => {
    const scores = submissions.map(s => s.athena.uniqueness_score).filter(n => n > 0);
    return {
      total: submissions.length,
      average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      ready: submissions.filter(s => suggestionOf(s) === 'approve').length,
      needsWork: submissions.filter(s => suggestionOf(s) === 'request_changes').length,
      weak: submissions.filter(s => suggestionOf(s) === 'reject').length,
    };
  }, [submissions]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = submissions.filter(s => {
      if (filter !== 'all' && suggestionOf(s) !== filter) return false;
      if (!term) return true;
      return (
        s.student_name.toLowerCase().includes(term) ||
        s.project_title.toLowerCase().includes(term) ||
        s.department.toLowerCase().includes(term) ||
        s.abstract.toLowerCase().includes(term)
      );
    });
    return limit ? rows.slice(0, limit) : rows;
  }, [submissions, search, filter, limit]);

  if (!submissions.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
        <FileText size={36} className="mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-semibold text-gray-700">Nothing waiting on you</p>
        <p className="mt-1 text-xs text-gray-400">
          Every project you received has a decision. New ones appear here as soon as a student sends them.
        </p>
      </div>
    );
  }

  const filters: Array<{ id: 'all' | SuggestedKey; label: string; count: number }> = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'approve', label: 'Looks ready', count: stats.ready },
    { id: 'request_changes', label: 'Needs changes', count: stats.needsWork },
    { id: 'reject', label: 'Weak', count: stats.weak },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Waiting', value: stats.total, color: '#0F766E' },
          { label: 'Average quality', value: `${stats.average}%`, color: scoreColor(stats.average) },
          { label: 'Looks ready', value: stats.ready, color: '#16A34A' },
          { label: 'Needs changes', value: stats.needsWork, color: '#EAB308' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-white p-3.5 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{card.label}</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {!limit && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student, HU ID, or project…"
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15"
            />
          </div>
          {filters.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                filter === f.id ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {visible.map((s, i) => {
          const key = suggestionOf(s);
          const meta = suggestionMeta[key] ?? suggestionMeta.none;
          const score = s.athena.uniqueness_score;
          const words = wordCount(s.abstract);
          const strengths = s.athena.realAI?.strengths?.slice(0, 3) || [];

          return (
            <motion.article
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="rounded-xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start gap-3">
                <UserAvatar
                  firstName={s.student_name.split(' ')[0]}
                  lastName={s.student_name.split(' ').slice(1).join(' ')}
                  profileImageUrl={s.student_photo}
                  role="student"
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">{s.project_title || 'Untitled project'}</h3>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      style={{ background: meta.bg, color: meta.text }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {s.student_id ? (
                      <Link to={`/students/${s.student_id}`} className="font-semibold text-teal-800 hover:underline">
                        {s.student_name}
                      </Link>
                    ) : s.student_name}
                    {' · '}<span className="font-mono font-semibold text-teal-700">{s.department}</span> · {s.submission_date}
                    {' · '}
                    <span className="font-semibold capitalize text-amber-700">{stageLabel(s.stage)}</span>
                  </p>
                </div>
                <Link
                  to={`/projects/${s.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-green-800"
                >
                  {awaitsTeacherReview(s) ? 'Open and decide' : 'Open project'} <ArrowRight size={13} />
                </Link>
              </div>

              <p className="mt-3 text-[13px] leading-relaxed text-gray-700">{themeOf(s) || 'No summary yet.'}</p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Quality</p>
                  <p className="text-sm font-bold" style={{ color: scoreColor(score) }}>{score}%</p>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: scoreColor(score) }}
                    />
                  </span>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Confidence</p>
                  <p className="text-sm font-bold text-gray-800">{s.athena.ai_confidence}%</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Abstract length</p>
                  <p className="text-sm font-bold text-gray-800">{words} words</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Project code</p>
                  <p className="font-mono text-xs font-bold text-teal-700">#{s.id}</p>
                </div>
              </div>

              {strengths.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <TrendingUp size={13} className="text-green-600" />
                  {strengths.map(item => (
                    <span key={item} className="rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-medium text-green-800">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </motion.article>
          );
        })}

        {visible.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white py-8 text-center text-sm text-gray-400">
            Nothing matches this filter.
          </p>
        )}
      </div>
    </div>
  );
}
