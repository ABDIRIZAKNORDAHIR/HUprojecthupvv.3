import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Lightbulb, RefreshCw, Send, User, XCircle } from 'lucide-react';
import { api, type DocumentAnalysis } from '../api/client';
import { DocumentAnalysisPanel } from './DocumentAnalysisPanel';
import { ReviewDecisionPanel, type ReviewDecision } from './ReviewDecisionPanel';

interface ChatMsg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface ProjectAIAssistantProps {
  projectId: number;
  onAnalysisUpdated?: () => void;
  /** When the teacher may decide, the decision controls live in this same card. */
  review?: {
    busy: boolean;
    onSubmit: (decision: ReviewDecision, comment: string) => Promise<void> | void;
  };
}

function providerLabel(provider?: string | null) {
  if (provider === 'groq') return 'Groq';
  if (provider === 'ollama') return 'Ollama (local)';
  if (provider === 'gemini') return 'Google Gemini';
  if (provider === 'openai') return 'OpenAI ChatGPT';
  return 'Analysis engine';
}

function decisionStyle(decision?: string) {
  if (decision === 'approve') {
    return { icon: CheckCircle2, wrap: 'border-green-200 bg-green-50', text: 'text-green-800', bar: 'bg-green-500' };
  }
  if (decision === 'reject') {
    return { icon: XCircle, wrap: 'border-red-200 bg-red-50', text: 'text-red-800', bar: 'bg-red-500' };
  }
  return { icon: AlertTriangle, wrap: 'border-amber-200 bg-amber-50', text: 'text-amber-800', bar: 'bg-amber-500' };
}

export function ProjectAIAssistant({ projectId, onAnalysisUpdated, review }: ProjectAIAssistantProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [decision, setDecision] = useState<{
    recommendedDecision?: string;
    decisionConfidence?: number;
    decisionReasoning?: string;
    decisionLabel?: string;
    whatProjectIsAbout?: string;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);

  const applyAnalysisResult = (a: Record<string, unknown>, resultProvider?: string, resultModel?: string) => {
    setAnalysis({
      FileType: 'ai_real_analysis',
      FileName: 'AI Analysis',
      Summary: String(a.summary || ''),
      MainTopic: String(a.mainTopic || ''),
      KeyPoints: a.keyPoints as string[],
      Objectives: a.objectives as string[],
      QualityScore: Number(a.qualityScore) || 0,
      RelatedToProject: 1,
      GrammarIssues: a.grammarIssues as string[],
      MissingSections: a.missingSections as string[],
      PlagiarismNote: String(a.plagiarismNote || ''),
      Suggestions: a.suggestions as string[],
    });
    setDecision({
      recommendedDecision: a.recommendedDecision as string,
      decisionConfidence: Number(a.decisionConfidence),
      decisionReasoning: a.decisionReasoning as string,
      decisionLabel: a.decisionLabel as string,
      whatProjectIsAbout: a.whatProjectIsAbout as string,
    });
    if (resultProvider) setProvider(resultProvider);
    if (resultModel) setModel(resultModel);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [status, briefing, chat] = await Promise.all([
        api.getProjectAIStatus(projectId),
        api.getProjectAIBriefing(projectId),
        api.getProjectAIChat(projectId),
      ]);
      setConfigured(status.configured);
      setProvider(status.provider || briefing.provider || null);
      setModel(status.model || briefing.model || null);
      setAnalysis(briefing.analysis);
      if (briefing.analysis) {
        const a = briefing.analysis as unknown as Record<string, unknown>;
        setDecision({
          recommendedDecision: a.recommendedDecision as string | undefined,
          decisionConfidence: Number(a.decisionConfidence) || undefined,
          decisionReasoning: a.decisionReasoning as string | undefined,
          decisionLabel: a.decisionLabel as string | undefined,
          whatProjectIsAbout: a.whatProjectIsAbout as string | undefined,
        });
      } else {
        setDecision(null);
      }
      setMessages(chat.messages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt,
      })));

      // Auto-run analysis when teacher opens a project with no briefing yet
      if (status.configured && !briefing.analysis) {
        setLoading(false);
        setAnalyzing(true);
        try {
          const result = await api.analyzeProjectAI(projectId);
          if (result.analysis) {
            applyAnalysisResult(
              result.analysis,
              result.provider ? String(result.provider) : undefined,
              result.model ? String(result.model) : undefined,
            );
            onAnalysisUpdated?.();
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Auto-analysis failed — click Re-analyze');
        } finally {
          setAnalyzing(false);
        }
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load AI assistant');
    } finally {
      setLoading(false);
    }
  };

  // Reinitialize the assistant when navigating to a different project.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [projectId]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const result = await api.analyzeProjectAI(projectId);
      if (result.analysis) {
        applyAnalysisResult(
          result.analysis,
          result.provider ? String(result.provider) : undefined,
          result.model ? String(result.model) : undefined,
        );
      }
      onAnalysisUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const ask = async () => {
    if (!question.trim() || asking) return;
    setAsking(true);
    setError('');
    const q = question.trim();
    setQuestion('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: q }]);
    try {
      const result = await api.askProjectAI(projectId, q);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: result.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get AI answer');
      setMessages(prev => prev.filter(m => m.content !== q || m.role !== 'user'));
      setQuestion(q);
    } finally {
      setAsking(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  const ds = decisionStyle(decision?.recommendedDecision);
  const DecisionIcon = ds.icon;
  const suggestedDecision: ReviewDecision | null = decision?.recommendedDecision
    ? decision.recommendedDecision === 'approve'
      ? 'approved'
      : decision.recommendedDecision === 'reject'
        ? 'rejected'
        : 'changes_requested'
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-green-600/10 text-green-700">
            <ClipboardCheck size={17} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold tracking-tight text-gray-900">
              {review ? 'Project review' : 'Project review assistant'}
            </h3>
            {configured && provider && (
              <p className="truncate text-[11px] text-gray-400">
                {providerLabel(provider)}{model ? ` · ${model}` : ''}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={analyzing || !configured}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={analyzing ? 'animate-spin' : ''} />
          {analyzing ? 'Analyzing…' : 'Re-analyze'}
        </button>
      </div>
      {!configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Assistant not configured
        </div>
      )}

      {configured && decision?.decisionLabel && (
        <div className={`rounded-2xl border p-4 ${ds.wrap}`}>
          <div className="flex items-start gap-2.5">
            <DecisionIcon size={17} className={`mt-0.5 shrink-0 ${ds.text}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-[11px] font-bold uppercase tracking-wide ${ds.text}`}>
                Suggested action — advisory only
              </p>
              <p className="text-sm font-bold text-gray-900">{decision.decisionLabel}</p>
            </div>
            {decision.decisionConfidence != null && (
              <div className="w-24 shrink-0 text-right">
                <p className={`text-[11px] font-bold ${ds.text}`}>{decision.decisionConfidence}% confidence</p>
                <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-white/80">
                  <span
                    className={`block h-full rounded-full ${ds.bar}`}
                    style={{ width: `${Math.max(0, Math.min(100, decision.decisionConfidence))}%` }}
                  />
                </span>
              </div>
            )}
          </div>
          {decision.decisionReasoning && (
            <p className="mt-2.5 border-t border-black/5 pt-2.5 text-[13px] leading-relaxed text-gray-700">
              {decision.decisionReasoning}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {analysis ? (
        <DocumentAnalysisPanel analysis={analysis} teacherOnly />
      ) : configured ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 text-center text-sm text-gray-400">
          {analyzing ? 'Analyzing…' : 'No briefing'}
        </div>
      ) : null}

      {review && (
        <ReviewDecisionPanel
          key={decision?.recommendedDecision ?? 'none'}
          busy={review.busy}
          suggested={suggestedDecision}
          suggestedNote={decision?.decisionReasoning ?? null}
          onSubmit={review.onSubmit}
        />
      )}

      {configured && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Lightbulb size={16} className="text-green-600" />
              Ask about this project
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Answers are advisory notes for you — students never see this thread.
            </p>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto bg-gray-50/40 p-4">
            {messages.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-[13px] font-semibold text-gray-500">No questions yet</p>
                <p className="mt-1 text-[12px] text-gray-400">
                  Try “What is missing from this abstract?” or “Is the scope realistic?”
                </p>
              </div>
            )}
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && <Lightbulb size={14} className="text-green-600 shrink-0 mt-1" />}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-green-700 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'user' && <User size={14} className="text-green-700 shrink-0 mt-1" />}
              </div>
            ))}
            <div ref={chatEnd} />
          </div>

          <div className="p-3 border-t flex gap-2">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && ask()}
              placeholder="Ask a question about this project…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              disabled={asking}
            />
            <button
              type="button"
              onClick={ask}
              disabled={asking || !question.trim()}
              className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
            >
              <Send size={14} />
              {asking ? '…' : 'Ask'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
