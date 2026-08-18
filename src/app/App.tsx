import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './AppShell';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RolePortalPage } from './pages/RolePortalPage';
import { RegisterPage } from './pages/RegisterPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLoadingScreen } from './components/AppLoadingScreen';
import { BackendStatusBanner } from './components/BackendStatusBanner';
import { LegalPage } from './pages/LegalPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteTitle } from './components/RouteTitle';

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppGate() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AppLoadingScreen />;
  if (user) return <AppShell />;
  if (location.pathname === '/') return <HomePage />;
  return <NotFoundPage />;
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login/student" element={<GuestRoute><RolePortalPage role="student" /></GuestRoute>} />
      <Route path="/login/teacher" element={<GuestRoute><RolePortalPage role="teacher" /></GuestRoute>} />
      <Route path="/login/admin" element={<GuestRoute><RolePortalPage role="admin" /></GuestRoute>} />

      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/register/student" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/register/teacher" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<LegalPage kind="terms" />} />
      <Route path="/ai-notice" element={<LegalPage kind="ai" />} />

      <Route path="/student" element={<Navigate to="/login/student" replace />} />
      <Route path="/teacher" element={<Navigate to="/login/teacher" replace />} />
      <Route path="/admin" element={<Navigate to="/login/admin" replace />} />
      <Route path="/login" element={<Navigate to="/login/student" replace />} />
      <Route path="/*" element={<AppGate />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutedErrorBoundary>
        <BackendStatusBanner />
        <AuthProvider>
          <RouteTitle />
          <AppRoutes />
        </AuthProvider>
      </RoutedErrorBoundary>
    </BrowserRouter>
  );
}
