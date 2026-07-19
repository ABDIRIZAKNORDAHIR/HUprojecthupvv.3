import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, setToken, type User } from '../api/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (universityId: string | undefined, email: string, password: string, expectedRole?: User['Role'], adminLoginToken?: string) => Promise<void>;
  register: (data: {
    universityId: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    department?: string;
    role?: 'student' | 'teacher';
    className?: string;
    studyMode?: 'full_time' | 'part_time';
    registrationToken: string;
  }) => Promise<{ pendingApproval: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { user: u } = await api.me();
      setUser(u);
    } catch {
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('projecthub_token');
    const timeout = window.setTimeout(() => setLoading(false), 4000);

    if (token) {
      refreshUser().finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });
    } else {
      window.clearTimeout(timeout);
      setLoading(false);
    }

    return () => window.clearTimeout(timeout);
  }, [refreshUser]);

  useEffect(() => {
    if (!user?.UserId) return;
    const tick = () => api.heartbeat().catch(() => {});
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [user?.UserId]);

  const login = async (
    universityId: string | undefined,
    email: string,
    password: string,
    expectedRole?: User['Role'],
    adminLoginToken?: string,
  ) => {
    const { token, user: u } = await api.login(universityId, email, password, expectedRole, adminLoginToken);
    if (expectedRole && u.Role !== expectedRole) {
      setToken(null);
      throw new Error(`This account is a ${u.Role} account. Please use the ${u.Role} portal instead.`);
    }
    setToken(token);
    setUser(u);
  };

  const register = async (data: Parameters<AuthContextValue['register']>[0]) => {
    const res = await api.register(data);
    if (res.pendingApproval) {
      setToken(null);
      setUser(null);
      return { pendingApproval: true, message: res.message };
    }
    if (res.token) {
      setToken(res.token);
      setUser(res.user);
    }
    return { pendingApproval: false, message: res.message };
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
