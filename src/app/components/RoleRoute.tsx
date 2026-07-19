import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

type Role = 'student' | 'teacher' | 'admin';

export function RoleRoute({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (!allow.includes(user.Role as Role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
