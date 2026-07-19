import { useState, useCallback, useEffect } from 'react';

import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router';

import { motion, AnimatePresence } from 'motion/react';

import { Sidebar } from './components/Sidebar';

import { Header } from './components/Header';

import { SearchModal } from './components/SearchModal';

import { QuickActionsPanel } from './components/QuickActionsPanel';

import { FloatingActionButton } from './components/FloatingActionButton';

import { MobileNav } from './components/MobileNav';

import { AppShellBackground } from './components/AppShellBackground';

import { RoleHome } from './components/RoleHome';

import { RoleRoute } from './components/RoleRoute';

import { AssignedProjectsPage } from './pages/AssignedProjectsPage';

import { ProjectDetailPage } from './pages/ProjectDetailPage';

import { AdminUsersPage } from './pages/AdminUsersPage';

import { SettingsPage } from './pages/SettingsPage';

import { MyTeamPage } from './pages/MyTeamPage';

import { StudentFeedbackPage } from './pages/StudentFeedbackPage';

import { StudentScoresPage } from './pages/StudentScoresPage';

import { StudentTeacherPage } from './pages/StudentTeacherPage';

import { TeacherDashboard } from './components/TeacherDashboard';

import { AdminDashboard } from './components/AdminDashboard';

import { AdminSystemHealth } from './components/AdminSystemHealth';

import { BatchScanner } from './components/BatchScanner';

import { MessagesHubPage } from './pages/MessagesHubPage';
import { StudentAICoachPage } from './pages/StudentAICoachPage';
import { ProjectAtlas } from './components/ProjectAtlas';
import { TeacherClassAssignmentsPage } from './pages/TeacherClassAssignmentsPage';
import { StudentClassAssignmentsPage } from './pages/StudentClassAssignmentsPage';

import { useAuth } from './context/AuthContext';

import { api } from './api/client';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useRealtimeSocket } from './hooks/useRealtimeSocket';

import type { ViewId } from './types';

import type { Role } from './components/Sidebar';

import './styles/app-shell.css';



const baseViewPaths: Partial<Record<ViewId, string>> = {

  dashboard: '/',

  'ai-queue': '/ai-queue',

  submissions: '/submissions',

  collisions: '/collisions',

  analytics: '/analytics',

  atlas: '/atlas',

  settings: '/settings',

  team: '/team',

  feedback: '/feedback',

  scores: '/scores',

  'teacher-chat': '/my-teacher',

  messages: '/messages',

  'class-assignments': '/class-assignments',

  'ai-coach': '/ai-coach',

  'batch-scanner': '/batch-scanner',

  'system-health': '/admin/health',

  'ai-settings': '/settings',

};



function getViewPath(view: ViewId, role: Role): string {

  if (view === 'students') return role === 'admin' ? '/admin/users' : '/submissions';

  if (view === 'users') return '/admin/users';

  if (view === 'dashboard' && role === 'admin') return '/admin/overview';

  if (view === 'submissions' && role === 'student') return '/projects';

  if (view === 'team' && role === 'student') return '/team';

  return baseViewPaths[view] || '/';

}



const pathToView = (path: string): ViewId => {

  if (path.startsWith('/projects/')) return 'dashboard';

  if (path === '/admin/users') return 'students';

  if (path === '/admin/overview') return 'dashboard';

  if (path === '/admin/health') return 'system-health';

  if (path === '/projects') return 'submissions';

  if (path === '/team') return 'team';

  if (path === '/feedback') return 'feedback';

  if (path === '/scores') return 'scores';

  if (path === '/my-teacher') return 'teacher-chat';
  if (path === '/messages') return 'messages';
  if (path === '/ai-coach') return 'ai-coach';
  if (path === '/class-assignments') return 'class-assignments';

  const entry = Object.entries(baseViewPaths).find(([, p]) => p === path);

  return (entry?.[0] as ViewId) || 'dashboard';

};



export function AppShell() {

  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);

  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const [scrolled, setScrolled] = useState(false);

  const [badgeCounts, setBadgeCounts] = useState({ pendingReview: 0, collisions: 0 });



  const role = (user?.Role || 'student') as Role;

  const activeView = pathToView(location.pathname);

  useRealtimeSocket(Boolean(user));
  usePushNotifications(Boolean(user));

  const handleNavigate = useCallback((view: ViewId) => {

    navigate(getViewPath(view, role));

  }, [navigate, role]);



  const handleLogout = useCallback(() => {

    logout();

    navigate('/', { replace: true });

  }, [logout, navigate]);



  useEffect(() => {

    if (!user?.UserId || role === 'student') return;

    api.getStatsSummary()

      .then(s => setBadgeCounts({ pendingReview: s.pendingReview, collisions: s.collisions }))

      .catch(() => setBadgeCounts({ pendingReview: 0, collisions: 0 }));

  }, [user?.UserId, role, location.pathname]);



  const onMainScroll = (e: React.UIEvent<HTMLElement>) => {

    const el = e.currentTarget;

    setScrolled(el.scrollTop > 10);

    const max = el.scrollHeight - el.clientHeight;

    const progress = max > 0 ? (el.scrollTop / max) * 100 : 0;

    document.documentElement.style.setProperty('--app-scroll-progress', `${progress}%`);

  };



  return (

    <div key={user?.UserId} className="app-shell flex h-screen overflow-hidden" style={{ fontFamily: 'var(--font-sans)' }}>

      <AppShellBackground />



      <div className="app-shell-layout flex flex-1 min-w-0 overflow-hidden">

        <Sidebar role={role} collapsed={sidebarCollapsed} activeView={activeView}

          badgeCounts={badgeCounts}

          onToggle={() => setSidebarCollapsed(c => !c)} onNavigate={handleNavigate}

          onLogout={handleLogout} onSettings={() => handleNavigate('settings')} />



        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          <Header role={role} userName={`${user?.FirstName} ${user?.LastName}`}

            firstName={user?.FirstName} lastName={user?.LastName}

            profileImageUrl={user?.ProfileImageUrl}

            onOpenSearch={() => setSearchOpen(true)} onOpenQuickActions={() => setQuickActionsOpen(true)}

            onLogout={handleLogout} scrolled={scrolled} />



          <main

            className="app-main-scroll flex-1 overflow-y-auto pb-mobile-nav md:pb-0"

            onScroll={onMainScroll}

          >

            <AnimatePresence mode="wait">

              <motion.div key={location.pathname}

                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}

                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22 }}>

                <Routes>

                  <Route path="/" element={<RoleHome />} />



                  <Route path="/projects/:id" element={<ProjectDetailPage />} />

                  <Route path="/atlas" element={<ProjectAtlas role={role} />} />

                  <Route path="/settings" element={<SettingsPage />} />

                  <Route path="/projects" element={<AssignedProjectsPage />} />



                  <Route path="/team" element={

                    <RoleRoute allow={['student']}><MyTeamPage /></RoleRoute>

                  } />

                  <Route path="/feedback" element={

                    <RoleRoute allow={['student']}><StudentFeedbackPage /></RoleRoute>

                  } />

                  <Route path="/scores" element={

                    <RoleRoute allow={['student']}><StudentScoresPage /></RoleRoute>

                  } />

                  <Route path="/my-teacher" element={

                    <RoleRoute allow={['student']}><StudentTeacherPage /></RoleRoute>

                  } />

                  <Route path="/messages" element={

                    <RoleRoute allow={['student', 'teacher', 'admin']}><MessagesHubPage /></RoleRoute>

                  } />

                  <Route path="/ai-coach" element={

                    <RoleRoute allow={['student']}><StudentAICoachPage /></RoleRoute>

                  } />

                  <Route path="/class-assignments" element={

                    <RoleRoute allow={['student', 'teacher']}>
                      {role === 'teacher' ? <TeacherClassAssignmentsPage /> : <StudentClassAssignmentsPage />}
                    </RoleRoute>

                  } />



                  <Route path="/ai-queue" element={

                    <RoleRoute allow={['teacher', 'admin']}><TeacherDashboard activeView="ai-queue" /></RoleRoute>

                  } />

                  <Route path="/submissions" element={

                    <RoleRoute allow={['teacher', 'admin']}><TeacherDashboard activeView="submissions" /></RoleRoute>

                  } />

                  <Route path="/collisions" element={

                    <RoleRoute allow={['teacher', 'admin']}><TeacherDashboard activeView="collisions" /></RoleRoute>

                  } />

                  <Route path="/analytics" element={

                    <RoleRoute allow={['teacher', 'admin']}><TeacherDashboard activeView="analytics" /></RoleRoute>

                  } />



                  <Route path="/admin/overview" element={

                    <RoleRoute allow={['admin']}><AdminDashboard activeView="dashboard" /></RoleRoute>

                  } />

                  <Route path="/admin/health" element={

                    <RoleRoute allow={['admin']}><AdminSystemHealth /></RoleRoute>

                  } />

                  <Route path="/admin/users" element={

                    <RoleRoute allow={['admin']}><AdminUsersPage /></RoleRoute>

                  } />

                  <Route path="/batch-scanner" element={

                    <RoleRoute allow={['admin']}><BatchScanner /></RoleRoute>

                  } />



                  <Route path="*" element={<Navigate to="/" replace />} />

                </Routes>

              </motion.div>

            </AnimatePresence>

          </main>

        </div>

      </div>



      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {role !== 'student' && (

        <QuickActionsPanel open={quickActionsOpen} onClose={() => setQuickActionsOpen(false)}

          role={role === 'admin' ? 'admin' : 'teacher'} />

      )}

      <FloatingActionButton role={role} />

      <MobileNav role={role} activeView={activeView} onNavigate={handleNavigate} badgeCounts={badgeCounts} />

    </div>

  );

}


