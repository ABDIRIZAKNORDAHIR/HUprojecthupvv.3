import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Bell, Sparkles, LogOut, Zap } from "lucide-react";
import { useNavigate } from "react-router";
import type { Role } from "../types";
import { api } from "../api/client";
import { UserAvatar } from "./UserAvatar";
import { BrandLogo } from "./BrandLogo";

interface HeaderProps {
  role: Role;
  userName?: string;
  profileImageUrl?: string | null;
  firstName?: string;
  lastName?: string;
  onOpenSearch: () => void;
  onOpenQuickActions: () => void;
  onLogout?: () => void;
  scrolled?: boolean;
}

export function Header({ role, userName, profileImageUrl, firstName, lastName, onOpenSearch, onOpenQuickActions, onLogout, scrolled }: HeaderProps) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: number; title: string; description: string; time: string; unread: boolean;
    type?: string; relatedProjectId?: number | null;
  }>>([]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const loadNotifications = () => {
    if (role === 'student') {
      api.getNotifications().then(r => setNotifications(r.notifications.map(n => ({
        id: n.id, title: n.title, description: n.description, time: n.time, unread: n.unread,
        type: n.type, relatedProjectId: n.RelatedProjectId ?? null,
      })))).catch(() => {});
    } else if (role === 'teacher') {
      Promise.all([api.getTeacherNotifications(), api.getTeacherAssignmentRequests()])
        .then(([notifRes, reqRes]) => {
          const items = notifRes.notifications.map((n, i) => ({
            id: Number(n.id), title: String(n.title), description: String(n.description),
            time: String(n.time), unread: !n.IsRead || i < 3,
            type: String(n.type || ''), relatedProjectId: n.RelatedProjectId != null ? Number(n.RelatedProjectId) : null,
          }));
          if (reqRes.requests.length) {
            items.unshift({
              id: 999, title: `${reqRes.requests.length} Assignment Requests`,
              description: 'Students assigned projects to you',
              time: new Date().toISOString(), unread: true,
              type: 'assignment_request', relatedProjectId: null,
            });
          }
          setNotifications(items);
        }).catch(() => {});
    } else if (role === 'admin') {
      Promise.all([api.getStatsSummary(), api.getAdminStats()])
        .then(([summary, adminStats]) => {
          const items: typeof notifications = [];
          const pendingReview = summary.pendingReview || 0;
          const collisions = summary.collisions || 0;
          const pendingAccounts = (adminStats.pendingAccounts as number) || 0;
          if (pendingAccounts > 0) {
            items.push({
              id: 0, title: 'Pending Account Approvals',
              description: `${pendingAccounts} registration(s) waiting for your approval`,
              time: new Date().toISOString(), unread: true, type: 'account', relatedProjectId: null,
            });
          }
          if (pendingReview > 0) {
            items.push({
              id: 1, title: 'Pending Reviews', description: `${pendingReview} submissions need review`,
              time: new Date().toISOString(), unread: true, type: 'review', relatedProjectId: null,
            });
          }
          if (collisions > 0) {
            items.push({
              id: 2, title: 'Collision Alerts', description: `${collisions} similar projects detected`,
              time: new Date().toISOString(), unread: true, type: 'collision', relatedProjectId: null,
            });
          }
          setNotifications(items);
        }).catch(() => {});
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 45000);
    return () => clearInterval(interval);
  }, [role, userName]);

  const handleNotificationClick = (n: typeof notifications[0]) => {
    setShowNotifications(false);
    const t = n.type || '';
    if (t === 'message' || t === 'evaluation' || t === 'ai_briefing') {
      navigate(n.relatedProjectId ? `/projects/${n.relatedProjectId}` : '/messages');
      return;
    }
    if (t === 'assignment_request') {
      navigate('/ai-queue');
      return;
    }
    if (role === 'teacher') navigate('/ai-queue');
    else if (role === 'student') navigate(t === 'evaluation' ? '/feedback' : '/messages');
    else if (role === 'admin') {
      if (n.type === 'account') navigate('/admin/users');
      else if (n.type === 'collision') navigate('/collisions');
      else navigate('/admin/overview');
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenSearch]);

  const handleLogout = () => {
    onLogout?.();
  };

  return (
    <header className={`app-header h-16 flex items-center px-4 md:px-6 gap-3 md:gap-4 sticky top-0 z-20 transition-all duration-300 border-b ${
      scrolled ? "app-header--scrolled" : ""
    }`}>
      <div className="md:hidden flex items-center gap-2 min-w-0">
        <BrandLogo variant="header" />
      </div>

      <div className="flex-1 max-w-lg hidden sm:block">
        <motion.button onClick={onOpenSearch} whileHover={{ scale: 1.01 }}
          className="app-search-btn w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-gray-500 hover:text-gray-700 transition-colors">
          <Search size={15} />
          <span style={{ fontSize: 13 }}>Search everywhere...</span>
          <span className="ml-auto px-1.5 py-0.5 rounded text-[11px] bg-gray-200 text-gray-500">⌘K</span>
        </motion.button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-shrink-0 min-w-0">
        <motion.button whileTap={{ scale: 0.95 }} onClick={onOpenSearch}
          className="sm:hidden w-9 h-9 rounded-xl border border-border flex items-center justify-center text-gray-500">
          <Search size={17} />
        </motion.button>

        {(role === "teacher" || role === "admin") && (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onOpenQuickActions}
            className="app-ai-tools-btn hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm shadow-sm"
            style={{ fontWeight: 600, fontSize: 13 }}>
            <Zap size={15} /> AI Tools
          </motion.button>
        )}

        <div className="relative">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 rounded-xl border border-border flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                style={{ fontSize: 9, fontWeight: 700 }}>{unreadCount}</span>
            )}
          </motion.button>
          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }}
                  className="absolute right-0 top-12 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-2xl border border-border shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
                  <div className="px-4 py-3 border-b border-border font-bold text-sm">Notifications</div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-400 text-center">No new notifications</p>
                  ) : notifications.map(n => (
                    <div key={n.id} className="px-4 py-3 border-b border-border/50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleNotificationClick(n)}>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-gray-500">{n.description}</p>
                    </div>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <button type="button" onClick={() => navigate('/settings')}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl border border-transparent hover:bg-gray-50 transition-colors">
          <UserAvatar
            firstName={firstName || userName?.split(' ')[0]}
            lastName={lastName || userName?.split(' ')[1]}
            profileImageUrl={profileImageUrl}
            role={role}
            size="sm"
          />
          <div className="text-left hidden lg:block">
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{userName}</p>
            <p style={{ fontSize: 11, color: "#64748B", textTransform: "capitalize" }}>{role}</p>
          </div>
        </button>

        <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout} title="Sign out"
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-border text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
          <LogOut size={16} />
          <span className="text-sm font-semibold whitespace-nowrap">Log out</span>
        </motion.button>
      </div>
    </header>
  );
}
