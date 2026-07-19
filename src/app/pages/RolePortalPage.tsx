import { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, BookOpen, Briefcase, Lock, Mail, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ApiError, api } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';
import { HU_BRAND_GREEN } from '../config/appImages';
import { AuthLayout } from '../components/BrandBackground';
import { AuthPortalLinks } from '../components/AuthPageShell';
import '../styles/welcome.css';

type PortalRole = 'student' | 'teacher' | 'admin';
type AdminStep = 'email' | 'otp' | 'password';
type ResetStep = 'email' | 'otp' | 'password' | 'done';

const config: Record<PortalRole, {
  title: string;
  signInLabel: string;
  icon: typeof BookOpen;
  badge: string;
  canRegister: boolean;
}> = {
  student: {
    title: 'Student',
    signInLabel: 'Sign in',
    icon: BookOpen,
    badge: 'Student',
    canRegister: true,
  },
  teacher: {
    title: 'Teacher',
    signInLabel: 'Sign in',
    icon: Briefcase,
    badge: 'Teacher',
    canRegister: true,
  },
  admin: {
    title: 'Staff',
    signInLabel: 'Sign in',
    icon: Lock,
    badge: 'Staff',
    canRegister: false,
  },
};

export function RolePortalPage({ role }: { role: PortalRole }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const cfg = config[role];
  const Icon = cfg.icon;
  const isAdmin = role === 'admin';

  const [universityId, setUniversityId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [adminLoginToken, setAdminLoginToken] = useState('');
  const [adminStep, setAdminStep] = useState<AdminStep>('email');
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [info, setInfo] = useState('');

  const openReset = () => {
    setMode('reset');
    setResetStep('email');
    setError('');
    setInfo('');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const backToLogin = () => {
    setMode('login');
    setResetStep('email');
    setError('');
    setInfo('');
    setOtp('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const sendAdminOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.requestAdminOtp(email.trim());
      setAdminStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const verifyAdminOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) return setError('Enter the 6-digit code');
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyAdminOtp({ email: email.trim(), code: otp.trim() });
      setAdminLoginToken(res.adminLoginToken);
      setAdminStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPendingApproval(false);
    setLoading(true);
    try {
      await login(
        isAdmin ? undefined : universityId,
        email,
        password,
        role,
        isAdmin ? adminLoginToken : undefined,
      );
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'pending_approval') {
        setPendingApproval(true);
        setError('');
      } else {
        setPendingApproval(false);
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await api.requestPasswordResetOtp({ email: email.trim(), role });
      setResetStep('otp');
      setInfo(`Code sent to ${email.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const verifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) return setError('Enter the 6-digit code');
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyPasswordResetOtp({ email: email.trim(), code: otp.trim() });
      setResetToken(res.resetToken);
      setResetStep('password');
      setInfo('Email verified. Create a new password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try {
      await api.confirmPasswordReset({
        resetToken,
        newPassword,
        confirmPassword,
      });
      setResetStep('done');
      setInfo('Password updated. You can sign in now.');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="auth-card auth-card--portal"
      >
        <div className="auth-card-accent" />

        <div className="mb-5">
          <BrandLogo variant="full" />
        </div>

        <span className="auth-role-badge">{cfg.badge}</span>

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mt-4 shadow-md"
          style={{ background: HU_BRAND_GREEN }}
        >
          {mode === 'reset' ? <KeyRound size={26} className="text-white" /> : <Icon size={26} className="text-white" />}
        </div>

        <h1 className="text-2xl font-extrabold text-black tracking-tight">
          {mode === 'reset' ? 'Forgot password' : cfg.title}
        </h1>

        {mode === 'reset' && (
          <p className="mt-2 text-sm text-black/70 font-semibold">
            {resetStep === 'email' && 'Enter your email to receive a verification code.'}
            {resetStep === 'otp' && 'Enter the code from ProjectHub email.'}
            {resetStep === 'password' && 'Create your new password.'}
            {resetStep === 'done' && 'Your password was updated.'}
          </p>
        )}

        {mode === 'login' && isAdmin && (
          <div className="mt-4 flex items-center gap-2 welcome-body text-xs px-3 py-2.5 rounded-lg auth-notice auth-notice--admin">
            <Lock size={14} style={{ color: HU_BRAND_GREEN, flexShrink: 0 }} />
            {adminStep === 'email' ? 'Email → OTP → Password' : adminStep === 'otp' ? 'Enter OTP' : 'Enter password'}
          </div>
        )}

        {/* ── Forgot password ── */}
        {mode === 'reset' && resetStep === 'email' && (
          <form onSubmit={sendResetOtp} className="space-y-4 mt-6">
            <div>
              <label className="auth-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@hu.edu"
                className="auth-input"
                autoComplete="email"
                required
              />
            </div>
            {error && <p className="text-sm text-red-700 font-bold bg-red-50 px-3 py-2.5 rounded-xl border border-red-100">{error}</p>}
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} className="auth-submit" style={{ background: HU_BRAND_GREEN }}>
              <Mail size={18} />
              {loading ? 'Sending…' : 'Send verification code'}
            </motion.button>
            <button type="button" onClick={backToLogin} className="w-full text-sm font-bold flex items-center justify-center gap-1.5" style={{ color: HU_BRAND_GREEN }}>
              <ArrowLeft size={14} /> Back to sign in
            </button>
          </form>
        )}

        {mode === 'reset' && resetStep === 'otp' && (
          <form onSubmit={verifyResetOtp} className="space-y-4 mt-6">
            {info && <p className="text-xs text-green-800 bg-green-50 px-3 py-2 rounded-lg font-semibold">{info}</p>}
            <div>
              <label className="auth-label">OTP</label>
              <input
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                className="auth-input font-mono tracking-widest text-center text-lg"
                required
              />
            </div>
            {error && <p className="text-sm text-red-700 font-bold bg-red-50 px-3 py-2.5 rounded-xl border border-red-100">{error}</p>}
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} className="auth-submit" style={{ background: HU_BRAND_GREEN }}>
              <ShieldCheck size={18} />
              {loading ? 'Checking…' : 'Verify code'}
            </motion.button>
            <button
              type="button"
              className="w-full text-sm font-semibold"
              style={{ color: HU_BRAND_GREEN }}
              onClick={() => { setResetStep('email'); setError(''); setOtp(''); }}
            >
              Change email
            </button>
          </form>
        )}

        {mode === 'reset' && resetStep === 'password' && (
          <form onSubmit={confirmReset} className="space-y-4 mt-6">
            {info && <p className="text-xs text-green-800 bg-green-50 px-3 py-2 rounded-lg font-semibold flex items-center gap-2"><ShieldCheck size={14} /> {info}</p>}
            <div>
              <label className="auth-label">New password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="auth-input"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="auth-label">Confirm password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="auth-input pr-16"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-black hover:text-green-800"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-700 font-bold bg-red-50 px-3 py-2.5 rounded-xl border border-red-100">{error}</p>}
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} className="auth-submit" style={{ background: HU_BRAND_GREEN }}>
              <KeyRound size={18} />
              {loading ? 'Saving…' : 'Save new password'}
            </motion.button>
          </form>
        )}

        {mode === 'reset' && resetStep === 'done' && (
          <div className="space-y-4 mt-6">
            <div className="rounded-xl border-2 px-4 py-4 space-y-2" style={{ borderColor: `${HU_BRAND_GREEN}40`, background: '#f0fdf4' }}>
              <p className="font-extrabold text-sm text-black flex items-center gap-2">
                <ShieldCheck size={16} style={{ color: HU_BRAND_GREEN }} /> Password updated
              </p>
              <p className="text-sm text-black/70 font-semibold">{info}</p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              className="auth-submit"
              style={{ background: HU_BRAND_GREEN }}
              onClick={backToLogin}
            >
              <LogIn size={18} />
              Sign in
            </motion.button>
          </div>
        )}

        {/* Student / teacher login */}
        {mode === 'login' && !isAdmin && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <label className="auth-label">University ID (HU000)</label>
              <input
                value={universityId}
                onChange={e => setUniversityId(e.target.value)}
                placeholder="HU000-1234"
                className="auth-input"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="auth-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@hu.edu"
                className="auth-input"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="auth-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="auth-input pr-16"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-black hover:text-green-800"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                type="button"
                onClick={openReset}
                className="mt-2 text-xs font-extrabold hover:underline"
                style={{ color: HU_BRAND_GREEN }}
              >
                Forgot password?
              </button>
            </div>

            {pendingApproval && (
              <div className="rounded-xl border-2 px-4 py-4 space-y-2" style={{ borderColor: `${HU_BRAND_GREEN}40`, background: '#f0fdf4' }}>
                <p className="font-extrabold text-sm text-black">Pending approval</p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-700 font-bold bg-red-50 px-3 py-2.5 rounded-xl border border-red-100">{error}</p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="auth-submit"
              style={{ background: HU_BRAND_GREEN }}
            >
              <LogIn size={18} />
              {loading ? 'Signing in…' : cfg.signInLabel}
            </motion.button>
          </form>
        )}

        {/* Admin login */}
        {mode === 'login' && isAdmin && adminStep === 'email' && (
          <form onSubmit={sendAdminOtp} className="space-y-4 mt-6">
            <div>
              <label className="auth-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="staff@hu.edu"
                className="auth-input"
                autoComplete="email"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-700 font-bold bg-red-50 px-3 py-2.5 rounded-xl border border-red-100">{error}</p>
            )}
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} className="auth-submit" style={{ background: HU_BRAND_GREEN }}>
              <Mail size={18} />
              {loading ? 'Sending…' : 'Send OTP'}
            </motion.button>
            <button
              type="button"
              onClick={openReset}
              className="w-full text-xs font-extrabold hover:underline"
              style={{ color: HU_BRAND_GREEN }}
            >
              Forgot password?
            </button>
          </form>
        )}

        {mode === 'login' && isAdmin && adminStep === 'otp' && (
          <form onSubmit={verifyAdminOtp} className="space-y-4 mt-6">
            <p className="welcome-body text-sm">Code sent to <strong>{email}</strong></p>
            <div>
              <label className="auth-label">OTP</label>
              <input
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                className="auth-input font-mono tracking-widest text-center text-lg"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-700 font-bold bg-red-50 px-3 py-2.5 rounded-xl border border-red-100">{error}</p>
            )}
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} className="auth-submit" style={{ background: HU_BRAND_GREEN }}>
              <ShieldCheck size={18} />
              {loading ? 'Checking…' : 'Verify'}
            </motion.button>
            <button
              type="button"
              className="w-full text-sm font-semibold"
              style={{ color: HU_BRAND_GREEN }}
              onClick={() => { setAdminStep('email'); setError(''); setOtp(''); }}
            >
              Change email
            </button>
          </form>
        )}

        {mode === 'login' && isAdmin && adminStep === 'password' && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <ShieldCheck size={14} /> {email} verified
            </p>
            <div>
              <label className="auth-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="auth-input pr-16"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-black hover:text-green-800"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                type="button"
                onClick={openReset}
                className="mt-2 text-xs font-extrabold hover:underline"
                style={{ color: HU_BRAND_GREEN }}
              >
                Forgot password?
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-700 font-bold bg-red-50 px-3 py-2.5 rounded-xl border border-red-100">{error}</p>
            )}
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} className="auth-submit" style={{ background: HU_BRAND_GREEN }}>
              <LogIn size={18} />
              {loading ? 'Signing in…' : cfg.signInLabel}
            </motion.button>
          </form>
        )}

        {mode === 'login' && cfg.canRegister && (
          <Link to={`/register?role=${role}`} className="auth-secondary">
            <UserPlus size={18} />
            Create new {role} account
          </Link>
        )}

        <AuthPortalLinks role={role} />
      </motion.div>
    </AuthLayout>
  );
}
