import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Bot, Send, Loader2, Sparkles, ShieldCheck, Lightbulb } from 'lucide-react';
import { api } from '../api/client';
import { PageHero } from '../components/PageHero';
import { APP_IMAGES, HU_BRAND_GREEN } from '../config/appImages';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

export function StudentAICoachPage() {
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<{ mode?: string; provider?: string; configured?: boolean } | null>(null);
  const [originality, setOriginality] = useState<{
    originalityScore: number;
    similarityPercent: number;
    tip: string;
    similarProject?: { title: string; teacherAssignedId: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getStudentCoachStatus().then(setStatus).catch(() => setStatus({ mode: 'local-coach' }));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ask = async () => {
    if (!question.trim() && !title.trim() && !abstract.trim()) return;
    const q = question.trim() || 'Please review my topic and suggest improvements.';
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setQuestion('');
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const r = await api.studentCoachAdvise({ title, abstract, question: q, history });
      setMessages((m) => [...m, { role: 'assistant', content: r.answer || 'No response.' }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: err instanceof Error ? err.message : 'Coach unavailable.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const scan = async () => {
    setScanning(true);
    try {
      const r = await api.studentCoachOriginality({ title, abstract });
      setOriginality(r);
    } catch {
      setOriginality(null);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-mobile-nav space-y-5">
      <PageHero
        title="Athena Coach"
        subtitle="Student AI guidance for topics, abstracts, and originality"
        image={APP_IMAGES.studentsStudy}
        gradient={`linear-gradient(135deg, ${HU_BRAND_GREEN} 0%, #0F2D5C 100%)`}
      />

      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
          <Bot size={13} />
          {status?.configured ? `LLM · ${status.provider || 'AI'}` : 'Offline coach ready'}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border">
          <Sparkles size={13} /> Embedding originality
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Lightbulb size={16} style={{ color: HU_BRAND_GREEN }} /> Your draft
          </h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title"
            className="w-full border rounded-xl px-3 py-2.5 text-sm"
          />
          <textarea
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            placeholder="Abstract draft…"
            rows={7}
            className="w-full border rounded-xl px-3 py-2.5 text-sm resize-y"
          />
          <button
            type="button"
            onClick={scan}
            disabled={scanning || (!title.trim() && !abstract.trim())}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
            style={{ background: HU_BRAND_GREEN }}
          >
            {scanning ? <Loader2 className="inline animate-spin mr-2" size={14} /> : <ShieldCheck className="inline mr-2" size={14} />}
            Check originality
          </button>

          {originality && (
            <div className="rounded-xl border border-green-100 bg-green-50/60 p-3 space-y-1.5">
              <p className="text-sm font-bold text-slate-800">
                Originality: {originality.originalityScore}%
                <span className="text-xs font-medium text-slate-500 ml-2">
                  (overlap {originality.similarityPercent}%)
                </span>
              </p>
              <p className="text-xs text-slate-600">{originality.tip}</p>
              {originality.similarProject && (
                <p className="text-xs text-amber-700">
                  Closest match: {originality.similarProject.title}
                  {originality.similarProject.teacherAssignedId
                    ? ` (${originality.similarProject.teacherAssignedId})`
                    : ''}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm flex flex-col min-h-[420px] overflow-hidden">
          <div className="px-4 py-3 border-b font-bold text-sm flex items-center gap-2">
            <Bot size={16} style={{ color: HU_BRAND_GREEN }} /> Coach chat
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10">
                Ask how to improve your topic, abstract, or scope.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Athena is thinking…
              </p>
            )}
            <div ref={endRef} />
          </div>
          <div className="p-3 border-t flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
              placeholder="Ask Athena Coach…"
              className="flex-1 border rounded-xl px-3 py-2 text-sm"
            />
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              disabled={loading}
              onClick={ask}
              className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50"
              style={{ background: HU_BRAND_GREEN }}
            >
              <Send size={16} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
