import { motion } from "motion/react";
import { AlertTriangle, GitMerge, Eye, ArrowLeftRight, Sparkles } from "lucide-react";
import type { CollisionAlert } from "../types";

interface CollisionsPanelProps {
  collisions: CollisionAlert[];
}

export function CollisionsPanel({ collisions }: CollisionsPanelProps) {
  if (!collisions.length) {
    return (
      <div className="text-center py-8">
        <Sparkles size={32} className="text-green-400 mx-auto mb-2" />
        <p style={{ fontSize: 14, color: "#64748B" }}>No active collisions detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {collisions.map((collision, i) => (
        <motion.div
          key={collision.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          whileHover={{ scale: 1.01 }}
          className="bg-white rounded-xl border border-yellow-200 shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-600" />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>
                {collision.similarity}% Similarity Detected
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800 text-xs font-bold">
              {collision.students.length} students
            </span>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {collision.students.map((student, j) => (
              <div key={j} className="p-3 rounded-xl border border-border bg-gray-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: j === 0 ? "#2563EB" : "#EC4899" }}>
                    {student.avatar}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{student.name}</p>
                    <p style={{ fontSize: 11, color: "#64748B" }}>{student.project}</p>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>{student.abstract}</p>
              </div>
            ))}
          </div>

          <div className="px-4 pb-2">
            <p style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 4 }}>Common Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {collision.common_keywords.map(kw => (
                <span key={kw} className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 bg-blue-50/50 border-t border-border">
            <div className="flex items-start gap-2 mb-3">
              <Sparkles size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p style={{ fontSize: 12, color: "#1E40AF", lineHeight: 1.4 }}>
                {collision.ai_resolution}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50">
                <ArrowLeftRight size={13} /> Compare Side-by-Side
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700">
                <GitMerge size={13} /> Suggest Merge
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50">
                <Eye size={13} /> Review Separately
              </motion.button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
