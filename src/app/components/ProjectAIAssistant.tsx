import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, RefreshCw, Bot, User, BrainCircuit } from 'lucide-react';
import { api, type DocumentAnalysis } from '../api/client';
import { DocumentAnalysisPanel } from './DocumentAnalysisPanel';

interface ChatMsg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface ProjectAIAssistantProps {
  projectId: number;
  onAnalysisUpdated?: () => void;
}

function providerLabel(provider?: string | null) {
  if (provider === 'groq') return 'Groq (free Llama AI)';
  if (provider === 'ollama') return 'Ollama (local)';
  if (provider === 'gemini') return 'Google Gemini';
  if (provider === 'openai') return 'OpenAI ChatGPT';
  return 'Real AI';
}

function decisionStyle(decision?: string) {
  if (decision === 'approve') return { bg: '#F0FDF4', border: '#16A34A', text: '#15803d' };
  if (decision === 'reject') return { bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C' };
  return { bg: '#FEFCE8', border: '#EAB308', text: '#A16207' };
}

export function ProjectAIAssistant({ projectId, onAnalysisUpdated }: ProjectAIAssistantProps) {
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
        const a = briefing.analysis as Record<string, unknown>;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BrainCircuit size={18} className="text-green-600" />
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">Athena AI</h3>
            {configured && provider && (
              <p className="text-[11px] text-gray-400">{providerLabel(provider)}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={analyzing || !configured}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw size={14} className={analyzing ? 'animate-spin' : ''} />
          {analyzing ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {!configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          AI not configured
        </div>
      )}

      {configured && decision?.decisionLabel && (
        <div className="rounded-xl border p-4" style={{ background: ds.bg, borderColor: ds.border }}>
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles size={16} style={{ color: ds.text }} />
            <span className="text-sm font-bold" style={{ color: ds.text }}>
              {decision.decisionLabel}
            </span>
            {decision.decisionConfidence != null && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/80" style={{ color: ds.text }}>
                {decision.decisionConfidence}%
              </span>
            )}
          </div>
          {decision.decisionReasoning && (
            <p className="text-sm mt-2 text-gray-700 leading-relaxed">{decision.decisionReasoning}</p>
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

      {configured && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50/80">
            <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Bot size={16} className="text-green-600" />
              Ask
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto p-4 space-y-3 bg-gray-50/40">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">—</p>
            )}
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && <Bot size={14} className="text-green-600 shrink-0 mt-1" />}
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
              placeholder="Ask…"
              className="flex-1 px-3 py-2 rounded-lg border text-sm"
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
