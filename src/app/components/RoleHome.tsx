import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { StudentDashboardPage } from '../pages/StudentDashboardPage';
import { TeacherDashboard } from './TeacherDashboard';
import { AdminDashboard } from './AdminDashboard';

/** Each role lands on their own dashboard after login */
export function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;

  switch (user.Role) {
    case 'admin':
      return <AdminDashboard activeView="dashboard" />;
    case 'teacher':
      return <TeacherDashboard activeView="dashboard" />;
    case 'student':
    default:
      return <StudentDashboardPage />;
  }
}
