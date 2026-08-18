import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  ListChecks,
  Lock,
  ShieldAlert,
  SpellCheck,
  Target,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import type { DocumentAnalysis } from '../api/client';

const BULLET_RE = /^\s*(?:[-–—•*→▪]|\d+[.)])\s+/;
/** A short "Label: value" lead-in, which reads better as its own paragraph. */
const INLINE_LABEL_RE = /^([A-Z][\w ]{1,24}):\s+(\S.*)$/;

function parseList(val: string | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  const raw = String(val);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(v => String(v).trim()).filter(Boolean);
  } catch {
    // Not JSON — fall through and treat it as free text.
  }
  return raw
    .split(/\r?\n|;/)
    .map(s => s.replace(BULLET_RE, '').trim())
    .filter(Boolean);
}

type Block =
  | { kind: 'para'; text: string }
  | { kind: 'bullets'; items: string[] };

interface Section {
  title: string | null;
  blocks: Block[];
}

/**
 * The model returns one long string that mixes intro prose, "Heading:" labels
 * and dashed bullets. Split it back into sections so it can be laid out as
 * readable blocks instead of a wall of text.
 */
function parseSummary(raw: string): Section[] {
  const sections: Section[] = [];
  let current: Section = { title: null, blocks: [] };
  let para: string[] = [];
  let bullets: string[] = [];

  const flushPara = () => {
    if (para.length) {
      current.blocks.push({ kind: 'para', text: para.join(' ').trim() });
      para = [];
    }
  };
  const flushBullets = () => {
    if (bullets.length) {
      current.blocks.push({ kind: 'bullets', items: bullets });
      bullets = [];
    }
  };
  const closeSection = () => {
    flushPara();
    flushBullets();
    if (current.title || current.blocks.length) sections.push(current);
  };

  for (const line of String(raw || '').split(/\r?\n/)) {
    const text = line.trim();
    if (!text) {
      flushPara();
      flushBullets();
      continue;
    }
    const isHeading = text.endsWith(':') && text.length <= 90 && !BULLET_RE.test(text);
    if (isHeading) {
      closeSection();
      current = { title: text.replace(/[:\s]+$/, ''), blocks: [] };
      continue;
    }
    if (BULLET_RE.test(text)) {
      flushPara();
      bullets.push(text.replace(BULLET_RE, '').trim());
      continue;
    }
    flushBullets();
    const labelled = text.match(INLINE_LABEL_RE);
    if (labelled) {
      flushPara();
      current.blocks.push({ kind: 'para', text: `**${labelled[1]}:** ${labelled[2]}` });
      continue;
    }
    para.push(text);
  }
  closeSection();

  return sections;
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function scoreTone(score: number) {
  if (score >= 70) return { stroke: '#16a34a', text: 'text-green-700', chip: 'bg-green-100 text-green-800' };
  if (score >= 50) return { stroke: '#d97706', text: 'text-amber-700', chip: 'bg-amber-100 text-amber-800' };
  return { stroke: '#dc2626', text: 'text-red-700', chip: 'bg-red-100 text-red-800' };
}

function ScoreRing({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const score = Math.max(0, Math.min(100, Math.round(value)));
  const tone = scoreTone(score);
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * score) / 100;

  return (
    <div className="relative h-[46px] w-[46px] shrink-0" title={`Quality ${score}%`}>
      <svg viewBox="0 0 44 44" className="h-[46px] w-[46px] -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <motion.circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduced ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduced ? 0 : 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span className={`absolute inset-0 grid place-items-center text-[11px] font-bold ${tone.text}`}>
        {score}
      </span>
      <span className="sr-only">Quality score {score} out of 100</span>
    </div>
  );
}

function Bullets({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-gray-700">
          <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <span><RichText text={item} /></span>
        </li>
      ))}
    </ul>
  );
}

function BlockList({ blocks, dot }: { blocks: Block[]; dot: string }) {
  return (
    <div className="space-y-2">
      {blocks.map((block, i) =>
        block.kind === 'bullets' ? (
          <Bullets key={i} items={block.items} dot={dot} />
        ) : (
          <p key={i} className="text-[13px] leading-relaxed text-gray-700">
            <RichText text={block.text} />
          </p>
        ),
      )}
    </div>
  );
}

interface DetailGroup {
  id: string;
  label: string;
  items: string[];
  icon: typeof ListChecks;
  accent: string;
  dot: string;
}

function DetailAccordion({ group }: { group: DetailGroup }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const Icon = group.icon;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
      >
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${group.accent}`}>
          <Icon size={13} />
        </span>
        <span className="flex-1 text-[13px] font-semibold text-gray-800">{group.label}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
          {group.items.length}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          className="text-gray-400"
        >
          <ChevronDown size={15} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-3 py-2.5">
              <Bullets items={group.items} dot={group.dot} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DocumentAnalysisPanelProps {
  analysis: DocumentAnalysis;
  compact?: boolean;
  teacherOnly?: boolean;
}

export function DocumentAnalysisPanel({ analysis, compact, teacherOnly }: DocumentAnalysisPanelProps) {
  const reduced = useReducedMotion();

  const keyPoints = parseList(analysis.KeyPoints as string | string[]);
  const objectives = parseList(analysis.Objectives as string | string[]);
  const grammar = parseList(analysis.GrammarIssues as string | string[]);
  const missing = parseList(analysis.MissingSections as string | string[]);
  const suggestions = parseList(analysis.Suggestions as string | string[]);

  const score = Number(analysis.QualityScore ?? 0);
  const related = analysis.RelatedToProject === true || analysis.RelatedToProject === 1;

  const isProjectBrief =
    analysis.FileType === 'project_submission' ||
    analysis.FileType === 'ai_real_analysis' ||
    String(analysis.FileName || '').startsWith('Project submission') ||
    String(analysis.FileName || '').startsWith('AI Analysis');

  const sections = useMemo(() => parseSummary(String(analysis.Summary || '')), [analysis.Summary]);
  const overview = sections.filter(s => !s.title);
  const detailed = sections.filter(s => s.title);

  const groups: DetailGroup[] = [
    { id: 'missing', label: 'Missing sections', items: missing, icon: ShieldAlert, accent: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
    { id: 'suggestions', label: 'Recommended next steps', items: suggestions, icon: Target, accent: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
    { id: 'keyPoints', label: 'Key points', items: keyPoints, icon: ListChecks, accent: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
    { id: 'objectives', label: 'Student goals identified', items: objectives, icon: ClipboardCheck, accent: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
    { id: 'grammar', label: 'Grammar & style', items: grammar, icon: SpellCheck, accent: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  ].filter(g => g.items.length > 0);

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.28, ease: 'easeOut' }}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <header className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-green-600/10 text-green-700">
          <FileText size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-bold tracking-tight text-gray-900">
            {isProjectBrief ? 'Project briefing' : 'Document analysis'}
          </h4>
          <p className="truncate text-[11px] text-gray-500">{analysis.MainTopic || analysis.FileName}</p>
        </div>
        {(teacherOnly || isProjectBrief) && (
          <span className="hidden items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 sm:flex">
            <Lock size={10} /> Teacher only
          </span>
        )}
        {score > 0 && <ScoreRing value={score} />}
      </header>

      <div className={compact ? 'space-y-3 p-3' : 'space-y-4 p-4'}>
        {!isProjectBrief && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium ${
              related
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {related ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {related ? 'Related to the assigned project' : 'May not match the project topic — verify with the student'}
          </div>
        )}

        {overview.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">Overview</p>
            {overview.map((section, i) => (
              <BlockList key={i} blocks={section.blocks} dot="bg-gray-300" />
            ))}
          </div>
        )}

        {!compact && detailed.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {detailed.map((section, i) => (
              <motion.article
                key={i}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : i * 0.05 }}
                className="rounded-xl border border-gray-200 bg-white p-3"
              >
                <h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  {section.title}
                </h5>
                <BlockList blocks={section.blocks} dot="bg-green-400" />
              </motion.article>
            ))}
          </div>
        )}

        {!compact && groups.length > 0 && (
          <div className="space-y-2">
            {groups.map(group => (
              <DetailAccordion key={group.id} group={group} />
            ))}
          </div>
        )}

        {analysis.PlagiarismNote && (
          <p className="flex gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] leading-relaxed text-gray-600">
            <FileText size={13} className="mt-0.5 shrink-0" />
            {analysis.PlagiarismNote}
          </p>
        )}
      </div>
    </motion.section>
  );
}
