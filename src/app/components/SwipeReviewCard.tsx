import { useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "motion/react";
import {
  ChevronLeft, ChevronRight, Check, X, Edit3, ChevronDown,
  Sparkles, AlertTriangle, History, Users
} from "lucide-react";
import type { Submission } from "../types";
import { getConfidenceLevel, getScoreColor } from "../types";
import { ProgressRing } from "./ProgressRing";

interface SwipeReviewCardProps {
  submissions: Submission[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onRequestChanges: (id: string) => void;
}

export function SwipeReviewCard({ submissions, onApprove, onReject, onRequestChanges }: SwipeReviewCardProps) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showRejectMenu, setShowRejectMenu] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const approveOpacity = useTransform(x, [0, 100], [0, 1]);
  const rejectOpacity = useTransform(x, [-100, 0], [1, 0]);

  const current = submissions[index];
  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Sparkles size={48} className="text-green-400 mb-4" />
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>All caught up!</h3>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>No pending submissions in the AI review queue</p>
      </div>
    );
  }

  const { athena } = current;
  const realAI = athena.realAI;
  const confidenceLevel = getConfidenceLevel(athena.ai_confidence);
  const decisionColor = realAI?.recommendedDecision === 'approve'
    ? '#16A34A'
    : realAI?.recommendedDecision === 'reject'
      ? '#EF4444'
      : '#EAB308';

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 120) {
      onApprove(current.id);
      goNext();
    } else if (info.offset.x < -120) {
      setShowRejectMenu(true);
    } else if (info.offset.y < -120) {
      onRequestChanges(current.id);
      goNext();
    }
    x.set(0);
  };

  const goNext = () => setIndex(i => Math.min(i + 1, submissions.length - 1));
  const goPrev = () => setIndex(i => Math.max(i - 1, 0));

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
          Card {index + 1} of {submissions.length}
        </span>
        <div className="flex gap-1">
          {submissions.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all"
              style={{ width: i === index ? 24 : 8, background: i <= index ? "#16A34A" : "#E2E8F0" }} />
          ))}
        </div>
      </div>

      {/* Swipe hints */}
      <div className="flex justify-center gap-6 text-xs text-gray-400">
        <span>← Reject</span>
        <span>↑ Request Changes</span>
        <span>Approve →</span>
      </div>

      {/* Card */}
      <div className="relative mx-auto max-w-lg">
        <motion.div style={{ opacity: approveOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="px-6 py-3 rounded-2xl bg-green-500 text-white font-bold text-lg rotate-12 border-4 border-green-300">APPROVE</div>
        </motion.div>
        <motion.div style={{ opacity: rejectOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="px-6 py-3 rounded-2xl bg-red-500 text-white font-bold text-lg -rotate-12 border-4 border-red-300">REJECT</div>
        </motion.div>

        <motion.div
          key={current.id}
          style={{ x, rotate }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          whileHover={{ scale: 1.01 }}
          className="bg-white rounded-2xl border border-border shadow-lg overflow-hidden cursor-grab active:cursor-grabbing"
        >
          {/* Student header */}
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "linear-gradient(135deg, #2563EB, #38BDF8)", fontSize: 14 }}>
                {current.student_avatar}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{current.student_name}</p>
                <p style={{ fontSize: 12, color: "#64748B" }}>{current.department} · {current.submission_date}</p>
              </div>
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{current.project_title}</h3>
            <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
              {expanded ? current.abstract : `${current.abstract.slice(0, 120)}...`}
              <button onClick={() => setExpanded(!expanded)} className="text-blue-600 font-medium ml-1">
                {expanded ? "Show less" : "Read more"}
              </button>
            </p>
          </div>

          {/* AI Verdict Panel */}
          <div className="p-5 bg-gradient-to-br from-green-50/50 to-blue-50/50">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-green-600" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>
                {realAI?.hasRealAI ? 'Real AI Verdict' : 'AI Review'}
              </span>
              {realAI?.hasRealAI && realAI.decisionLabel && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ background: decisionColor }}>
                  {realAI.decisionLabel}
                </span>
              )}
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: confidenceLevel === "High" ? "#F0FDF4" : confidenceLevel === "Medium" ? "#FEFCE8" : "#FEF2F2",
                  color: confidenceLevel === "High" ? "#16A34A" : confidenceLevel === "Medium" ? "#EAB308" : "#EF4444",
                }}>
                {confidenceLevel} ({athena.ai_confidence}%)
              </span>
            </div>

            {realAI?.hasRealAI && realAI.whatProjectIsAbout && (
              <div className="mb-4 p-3 rounded-xl bg-white border border-green-100">
                <p style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, marginBottom: 4 }}>What this project is about</p>
                <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.55 }}>
                  {realAI.whatProjectIsAbout.length > 320
                    ? `${realAI.whatProjectIsAbout.slice(0, 320)}…`
                    : realAI.whatProjectIsAbout}
                </p>
              </div>
            )}

            <div className="flex items-center gap-6 mb-4">
              <ProgressRing value={athena.uniqueness_score} size={90} label={realAI?.hasRealAI ? 'Quality' : 'Unique'} />
              <div className="flex-1 space-y-2">
                <div className="p-2.5 rounded-xl bg-white border border-border">
                  <p style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                    {realAI?.hasRealAI ? 'AI Recommendation' : 'AI Suggestion'}
                  </p>
                  <p style={{ fontSize: 12, color: "#111827", fontWeight: 600, marginTop: 2 }}>
                    {realAI?.decisionReasoning || athena.ai_suggestion}
                  </p>
                </div>
                {athena.active_collisions.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-yellow-50 border border-yellow-200">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle size={12} className="text-yellow-600" />
                      <p style={{ fontSize: 11, color: "#EAB308", fontWeight: 600 }}>Active Collisions</p>
                    </div>
                    {athena.active_collisions.map((c, i) => (
                      <p key={i} style={{ fontSize: 11, color: "#92400E" }}>
                        {c.student_name} — {c.similarity}% match
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {athena.historical_matches.length > 0 && (
              <div className="mb-3 p-2.5 rounded-xl bg-white border border-border">
                <div className="flex items-center gap-1 mb-1">
                  <History size={12} className="text-blue-500" />
                  <p style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Historical Match</p>
                </div>
                {athena.historical_matches.map((m, i) => (
                  <p key={i} style={{ fontSize: 11, color: "#374151" }}>
                    {m.similarity}% match with "{m.project_title}" ({m.year}) — <span className="text-blue-600 cursor-pointer">View original</span>
                  </p>
                ))}
              </div>
            )}

            {realAI?.whatShouldContain && realAI.whatShouldContain.length > 0 && (
              <div className="mb-3 p-2.5 rounded-xl bg-white border border-border">
                <p style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 4 }}>What it should contain</p>
                {realAI.whatShouldContain.slice(0, 4).map((item, i) => (
                  <p key={i} style={{ fontSize: 11, color: "#374151" }}>• {item}</p>
                ))}
              </div>
            )}

            {athena.suggested_differentiators.length > 0 && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                <p style={{ fontSize: 11, color: "#2563EB", fontWeight: 600, marginBottom: 4 }}>
                  {realAI?.hasRealAI ? 'Features to add' : 'Differentiator Suggestions'}
                </p>
                {athena.suggested_differentiators.map((d, i) => (
                  <p key={i} style={{ fontSize: 11, color: "#1E40AF" }}>• {d}</p>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 flex items-center gap-2 border-t border-border">
            <div className="relative flex-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowRejectMenu(!showRejectMenu)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50"
              >
                <X size={16} /> Reject <ChevronDown size={14} />
              </motion.button>
              {showRejectMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-20">
                  {athena.rejection_reasons.map((reason, i) => (
                    <button key={i} onClick={() => { onReject(current.id, reason); setShowRejectMenu(false); goNext(); }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 text-gray-700 border-b border-border last:border-0">
                      {reason}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { onRequestChanges(current.id); goNext(); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-yellow-200 text-yellow-700 font-semibold text-sm hover:bg-yellow-50"
            >
              <Edit3 size={16} /> Changes
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { onApprove(current.id); goNext(); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm"
              style={{ background: "linear-gradient(135deg, #16A34A, #22C55E)" }}
            >
              <Check size={16} /> Approve
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={goPrev} disabled={index === 0}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-gray-50">
          <ChevronLeft size={18} className="text-gray-600" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={goNext} disabled={index === submissions.length - 1}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-gray-50">
          <ChevronRight size={18} className="text-gray-600" />
        </motion.button>
      </div>
    </div>
  );
}
