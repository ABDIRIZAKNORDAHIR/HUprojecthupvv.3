import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Scan, FileSearch, Plus, X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router";
import { HU_BRAND_GREEN } from "../config/appImages";

interface FloatingActionButtonProps {
  role: "student" | "teacher" | "admin";
}

export function FloatingActionButton({ role }: FloatingActionButtonProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const studentActions = [
    { icon: FileSearch, label: "Check Topic", color: HU_BRAND_GREEN, path: "/atlas" },
    { icon: Plus, label: "My Projects", color: "#2563EB", path: "/projects" },
  ];
  const teacherActions = [
    { icon: Sparkles, label: "AI Review", color: HU_BRAND_GREEN, path: "/ai-queue" },
    { icon: AlertTriangle, label: "Collisions", color: "#EAB308", path: "/collisions" },
    { icon: FileSearch, label: "Submissions", color: "#38BDF8", path: "/submissions" },
  ];
  const adminActions = [
    { icon: Sparkles, label: "AI Review", color: HU_BRAND_GREEN, path: "/ai-queue" },
    { icon: Scan, label: "Batch Scan", color: "#2563EB", path: "/batch-scanner" },
    { icon: FileSearch, label: "All Users", color: "#7C3AED", path: "/admin/users" },
  ];

  const actions = role === "student" ? studentActions : role === "admin" ? adminActions : teacherActions;

  const handleAction = (path: string) => {
    setExpanded(false);
    navigate(path);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {expanded && actions.map((action, i) => (
          <motion.button key={action.label}
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => handleAction(action.path)}
            className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-white border border-border shadow-lg">
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{action.label}</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${action.color}15` }}>
              <action.icon size={16} style={{ color: action.color }} />
            </div>
          </motion.button>
        ))}
      </AnimatePresence>

      <motion.button onClick={() => setExpanded(!expanded)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
        animate={{ rotate: expanded ? 45 : 0 }}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white"
        style={{ background: `linear-gradient(135deg, ${HU_BRAND_GREEN}, #2563EB)` }}>
        {expanded ? <X size={22} /> : <Sparkles size={22} />}
      </motion.button>
    </div>
  );
}
