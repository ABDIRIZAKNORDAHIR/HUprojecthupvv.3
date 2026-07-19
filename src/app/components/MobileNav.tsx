import { motion } from "motion/react";
import { LayoutDashboard, Sparkles, FolderKanban, Users, Settings, MessageSquare } from "lucide-react";
import { HU_GREEN } from "../config/brandTheme";
import type { ViewId, Role } from "../types";

interface MobileNavProps {
  role: Role;
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  badgeCounts?: { pendingReview?: number; collisions?: number };
}

type NavItem = { id: ViewId; icon: typeof LayoutDashboard; label: string; badgeKey?: keyof NonNullable<MobileNavProps["badgeCounts"]> };

const studentItems: NavItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Home" },
  { id: "submissions", icon: FolderKanban, label: "Projects" },
  { id: "messages", icon: MessageSquare, label: "Messages" },
  { id: "team", icon: Users, label: "Team" },
  { id: "settings", icon: Settings, label: "Settings" },
];

const teacherItems: NavItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Home" },
  { id: "ai-queue", icon: Sparkles, label: "AI Queue", badgeKey: "pendingReview" },
  { id: "messages", icon: MessageSquare, label: "Messages" },
  { id: "submissions", icon: FolderKanban, label: "Review" },
  { id: "settings", icon: Settings, label: "Settings" },
];

const adminItems: NavItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Overview" },
  { id: "students", icon: Users, label: "Users" },
  { id: "messages", icon: MessageSquare, label: "Messages" },
  { id: "submissions", icon: FolderKanban, label: "Projects" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function MobileNav({ role, activeView, onNavigate, badgeCounts }: MobileNavProps) {
  const navItems = role === 'admin' ? adminItems : role === 'teacher' ? teacherItems : studentItems;

  return (
    <nav className="app-mobile-nav md:hidden fixed bottom-0 left-0 right-0 border-t z-30 safe-area-pb">
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map(item => {
          const isActive = activeView === item.id;
          const badge = item.badgeKey ? badgeCounts?.[item.badgeKey] : undefined;
          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              whileTap={{ scale: 0.9 }}
              className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[52px] min-h-[48px] justify-center rounded-xl"
              style={{ background: isActive ? 'rgba(22, 128, 85, 0.1)' : 'transparent' }}
            >
              <item.icon size={20} style={{ color: isActive ? HU_GREEN : "#64748B" }} />
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? HU_GREEN : "#64748B" }}>
                {item.label}
              </span>
              {badge && badge > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                  style={{ fontSize: 9, fontWeight: 700 }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
