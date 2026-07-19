import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './AppShell';
import { WelcomePage } from './pages/WelcomePage';
import { RolePortalPage } from './pages/RolePortalPage';
import { RegisterPage } from './pages/RegisterPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLoadingScreen } from './components/AppLoadingScreen';
import { BackendStatusBanner } from './components/BackendStatusBanner';

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
  if (location.pathname === '/') return <WelcomePage />;
  return <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/student" element={<GuestRoute><RolePortalPage role="student" /></GuestRoute>} />
      <Route path="/teacher" element={<GuestRoute><RolePortalPage role="teacher" /></GuestRoute>} />
      <Route path="/admin" element={<GuestRoute><RolePortalPage role="admin" /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/*" element={<AppGate />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <BackendStatusBanner />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
