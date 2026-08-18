import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { X, ClipboardList, Scan, FileSearch, ChevronRight, MessageSquare } from "lucide-react";
import { HU_BRAND_GREEN } from "../config/appImages";

interface QuickActionsPanelProps {
  open: boolean;
  onClose: () => void;
  role: "teacher" | "admin";
}

type QuickAction = {
  icon: typeof ClipboardList;
  label: string;
  desc: string;
  color: string;
  path: string;
};

const teacherActions: QuickAction[] = [
  { icon: ClipboardList, label: "Open review queue", desc: "Review pending submissions", color: HU_BRAND_GREEN, path: "/ai-queue" },
  { icon: MessageSquare, label: "Messages", desc: "Student and group conversations", color: "#0EA5E9", path: "/messages" },
  { icon: FileSearch, label: "All submissions", desc: "Browse student project work", color: "#2563EB", path: "/submissions" },
  { icon: FileSearch, label: "Project Atlas", desc: "University project archive", color: "#38BDF8", path: "/atlas" },
];

const adminActions: QuickAction[] = [
  ...teacherActions,
  { icon: Scan, label: "Originality scanner", desc: "Bulk similarity comparison", color: "#7C3AED", path: "/batch-scanner" },
];

export function QuickActionsPanel({ open, onClose, role }: QuickActionsPanelProps) {
  const navigate = useNavigate();
  const actions = role === "admin" ? adminActions : teacherActions;

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-80 bg-white border-l border-border shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Quick actions</h3>
                <p style={{ fontSize: 12, color: "#64748B" }}>Common review tools</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {actions.map((action, i) => (
                <motion.button
                  key={action.label}
                  type="button"
                  onClick={() => go(action.path)}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-green-200 hover:bg-green-50/30 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${action.color}15` }}>
                    <action.icon size={18} style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{action.label}</p>
                    <p style={{ fontSize: 11, color: "#64748B" }}>{action.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300" />
                </motion.button>
              ))}
            </div>

            <div className="p-4 border-t border-border">
              <div className="p-3 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList size={14} style={{ color: HU_BRAND_GREEN }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: HU_BRAND_GREEN }}>Teacher judgment</span>
                </div>
                <p style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>
                  Similarity notes are advisory only. Teachers make the final academic decision.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
