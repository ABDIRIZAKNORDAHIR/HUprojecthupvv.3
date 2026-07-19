import { Sparkles, AlertTriangle, CheckCircle2, FileText, Lock } from 'lucide-react';

import type { DocumentAnalysis } from '../api/client';



function parseList(val: string | string[] | undefined): string[] {

  if (!val) return [];

  if (Array.isArray(val)) return val;

  try { return JSON.parse(val); } catch { return [String(val)]; }

}



function renderSummaryText(text: string) {

  return text.split(/\n+/).filter(Boolean).map((para, i) => {

    const parts = para.split(/(\*\*[^*]+\*\*)/g);

    return (

      <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">

        {parts.map((part, j) =>

          part.startsWith('**') && part.endsWith('**')

            ? <strong key={j}>{part.slice(2, -2)}</strong>

            : part

        )}

      </p>

    );

  });

}



interface DocumentAnalysisPanelProps {

  analysis: DocumentAnalysis;

  compact?: boolean;

  teacherOnly?: boolean;

}



export function DocumentAnalysisPanel({ analysis, compact, teacherOnly }: DocumentAnalysisPanelProps) {

  const keyPoints = parseList(analysis.KeyPoints as string | string[]);

  const objectives = parseList(analysis.Objectives as string | string[]);

  const grammar = parseList(analysis.GrammarIssues as string | string[]);

  const missing = parseList(analysis.MissingSections as string | string[]);

  const suggestions = parseList(analysis.Suggestions as string | string[]);

  const score = Number(analysis.QualityScore ?? 0);

  const related = analysis.RelatedToProject === true || analysis.RelatedToProject === 1;

  const isProjectBrief = analysis.FileType === 'project_submission'
    || analysis.FileType === 'ai_real_analysis'
    || String(analysis.FileName || '').startsWith('Project submission')
    || String(analysis.FileName || '').startsWith('AI Analysis');



  return (

    <div className={`rounded-xl border ${isProjectBrief ? 'border-green-200 bg-green-50/80' : 'border-gray-200 bg-white'} ${compact ? 'p-3' : 'p-4'}`}>

      <div className="flex items-start gap-2 mb-3">

        <Sparkles size={18} className={isProjectBrief ? 'text-green-600' : 'text-green-600 flex-shrink-0 mt-0.5'} />

        <div className="flex-1 min-w-0">

          <h4 className="font-bold text-sm text-gray-900">

            {isProjectBrief ? 'Briefing' : 'Analysis'}

          </h4>

          <p className="text-xs text-gray-500">{analysis.FileName}</p>

        </div>

        {(teacherOnly || isProjectBrief) && (

          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800 shrink-0">

            <Lock size={10} /> Teacher only

          </span>

        )}

        {score > 0 && (

          <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${

            score >= 70 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'

          }`}>

            Quality {score}%

          </span>

        )}

      </div>



      {analysis.Summary && (

        <div className="mb-3">

          <p className="text-xs font-semibold text-gray-600 mb-1">

            {isProjectBrief ? 'AI briefing' : 'Summary'}

          </p>

          <div className="rounded-lg bg-white/70 border border-white px-3 py-2">

            {renderSummaryText(analysis.Summary)}

          </div>

        </div>

      )}



      {analysis.MainTopic && (

        <p className="text-xs mb-3"><span className="font-semibold text-gray-600">Main topic:</span> {analysis.MainTopic}</p>

      )}



      {!isProjectBrief && (

        <div className={`flex items-center gap-2 mb-3 text-xs ${related ? 'text-green-700' : 'text-amber-700'}`}>

          {related ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}

          {related ? 'Related to assigned project' : 'May not match project topic — verify with teacher'}

        </div>

      )}



      {!compact && keyPoints.length > 0 && (

        <div className="mb-3">

          <p className="text-xs font-semibold text-gray-600 mb-1">Key points</p>

          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">

            {keyPoints.map((p, i) => <li key={i}>{p}</li>)}

          </ul>

        </div>

      )}



      {!compact && objectives.length > 0 && (

        <div className="mb-3">

          <p className="text-xs font-semibold text-gray-600 mb-1">Student goals identified</p>

          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">

            {objectives.map((p, i) => <li key={i}>{p}</li>)}

          </ul>

        </div>

      )}



      {grammar.length > 0 && (

        <div className="mb-2">

          <p className="text-xs font-semibold text-gray-600 mb-1">Grammar & style</p>

          {grammar.map((g, i) => <p key={i} className="text-xs text-amber-800">• {g}</p>)}

        </div>

      )}



      {missing.length > 0 && (

        <div className="mb-2">

          <p className="text-xs font-semibold text-gray-600 mb-1">Missing sections</p>

          <p className="text-xs text-red-700">{missing.join(', ')}</p>

        </div>

      )}



      {analysis.PlagiarismNote && (

        <p className="text-xs text-gray-600 mb-2 flex gap-1"><FileText size={12} className="flex-shrink-0 mt-0.5" />{analysis.PlagiarismNote}</p>

      )}



      {suggestions.length > 0 && (

        <div className="mt-2 pt-2 border-t border-purple-100">

          <p className="text-xs font-semibold text-purple-700 mb-1">Recommendations for you</p>

          {suggestions.map((s, i) => <p key={i} className="text-xs text-gray-700">→ {s}</p>)}

        </div>

      )}

    </div>

  );

}


