import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, ClipboardList, Users,
  BarChart3, Globe, Settings, ChevronLeft, ChevronRight, LogOut,
  GraduationCap, Activity, Scan, FolderKanban, MessageSquare, Star
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { roleAccent, roleActiveGradient } from "../config/brandTheme";
import type { Role, ViewId } from "../types";

interface NavItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  view: ViewId;
  badgeKey?: "pendingReview";
}

const teacherNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", view: "dashboard" },
  { icon: ClipboardList, label: "Review queue", view: "ai-queue", badgeKey: "pendingReview" },
  { icon: ClipboardList, label: "Class Assignments", view: "class-assignments" },
  { icon: MessageSquare, label: "Messages", view: "messages" },
  { icon: ClipboardList, label: "All Submissions", view: "submissions" },
  { icon: Users, label: "Students", view: "students" },
  { icon: BarChart3, label: "Reports & Export", view: "analytics" },
  { icon: Globe, label: "Project Atlas", view: "atlas" },
  { icon: Settings, label: "Settings", view: "settings" },
];

const adminNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Admin Dashboard", view: "dashboard" },
  { icon: MessageSquare, label: "Messages", view: "messages" },
  { icon: Users, label: "All Users", view: "students" },
  { icon: Activity, label: "System Health", view: "system-health" },
  { icon: Scan, label: "Originality scanner", view: "batch-scanner" },
  { icon: ClipboardList, label: "All Submissions", view: "submissions" },
  { icon: Globe, label: "Project Atlas", view: "atlas" },
  { icon: Settings, label: "Settings", view: "settings" },
];

const studentNav: NavItem[] = [
  { icon: LayoutDashboard, label: "My Dashboard", view: "dashboard" },
  { icon: FolderKanban, label: "My Projects", view: "submissions" },
  { icon: ClipboardList, label: "Class Assignments", view: "class-assignments" },
  { icon: GraduationCap, label: "My teachers", view: "teacher-chat" },
  { icon: MessageSquare, label: "Messages", view: "messages" },
  { icon: Users, label: "My Team", view: "team" },
  { icon: BarChart3, label: "My Progress", view: "scores" },
  { icon: Star, label: "Feedback", view: "feedback" },
  { icon: Globe, label: "Project Atlas", view: "atlas" },
  { icon: Settings, label: "Settings", view: "settings" },
];

const navByRole: Record<Role, NavItem[]> = {
  student: studentNav,
  teacher: teacherNav,
  admin: adminNav,
};

export type { Role };

interface SidebarProps {
  role: Role;
  collapsed: boolean;
  activeView: ViewId;
  badgeCounts?: { pendingReview?: number };
  onToggle: () => void;
  onNavigate: (view: ViewId) => void;
  onLogout: () => void;
}

export function Sidebar({ role, collapsed, activeView, badgeCounts, onToggle, onNavigate, onLogout }: SidebarProps) {
  const navItems = navByRole[role];
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const roleColor = roleAccent(role);

  const getBadge = (item: NavItem) => {
    if (!item.badgeKey || !badgeCounts) return 0;
    return badgeCounts[item.badgeKey] || 0;
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="app-sidebar hidden md:flex relative flex-col h-screen shadow-sm z-30 flex-shrink-0"
      style={{ overflow: "hidden" }}
    >
      <div className="flex items-center px-3 h-16 border-b border-border gap-2 flex-shrink-0 min-w-0">
        <BrandLogo variant={collapsed ? 'icon' : 'full'} />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="app-sidebar-brand-sub truncate ml-auto"
            >
              {roleLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-4 mt-4 mb-2 px-3 py-2 rounded-lg flex items-center gap-2"
            style={{ background: `${roleColor}12` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: roleColor }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: roleColor }}>{roleLabel} Portal</span>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {navItems.map(item => {
          const isActive = activeView === item.view;
          const badge = getBadge(item);
          return (
            <motion.button key={item.view} onClick={() => onNavigate(item.view)}
              whileHover={{ x: collapsed ? 0 : 2 }} whileTap={{ scale: 0.97 }}
              className={`app-sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative ${
                isActive ? "is-active text-white shadow-sm" : "text-gray-600"
              }`}
              style={isActive ? { background: roleActiveGradient(role) } : {}}>
              <item.icon size={18} className="flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, whiteSpace: "nowrap" }}>
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {badge > 0 && !collapsed && (
                <span className="ml-auto text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={{ background: "#EF4444", fontSize: 11, fontWeight: 700 }}>{badge}</span>
              )}
              {badge > 0 && collapsed && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {item.label}
                </div>
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <motion.button whileHover={{ x: collapsed ? 0 : 2 }} onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50">
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span style={{ fontSize: 14, fontWeight: 500 }}>Sign Out</span>}
        </motion.button>
      </div>

      <motion.button onClick={onToggle} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-border rounded-full flex items-center justify-center shadow-md z-40">
        {collapsed ? <ChevronRight size={12} className="text-gray-500" /> : <ChevronLeft size={12} className="text-gray-500" />}
      </motion.button>
    </motion.aside>
  );
}
