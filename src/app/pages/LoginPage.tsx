import { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/BrandBackground';
import { AuthPortalLinks } from '../components/AuthPageShell';
import '../styles/welcome.css';
import { BrandLogo } from '../components/BrandLogo';
import { HU_BRAND_GREEN } from '../config/appImages';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [universityId, setUniversityId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(universityId, email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="auth-card auth-card--portal">
        <div className="auth-card-accent" />

        <div className="mb-5">
          <BrandLogo variant="full" />
        </div>

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: HU_BRAND_GREEN }}>
          <GraduationCap size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-black">Sign In</h1>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label className="auth-label">University ID (HU000)</label>
            <input value={universityId} onChange={e => setUniversityId(e.target.value)} placeholder="HU000-1234" className="auth-input" required />
          </div>
          <div>
            <label className="auth-label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@hu.edu" className="auth-input" required />
          </div>
          <div>
            <label className="auth-label">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="auth-input" required />
          </div>
          {error && <p className="text-sm text-red-700 font-bold bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
          <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} className="auth-submit" style={{ background: HU_BRAND_GREEN }}>
            <LogIn size={18} /> {loading ? 'Signing in…' : 'Sign In'}
          </motion.button>
        </form>

        <AuthPortalLinks />
      </motion.div>
    </AuthLayout>
  );
}
