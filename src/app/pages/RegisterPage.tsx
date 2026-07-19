import { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, UserPlus, BookOpen, Briefcase, Mail, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { validateUniversityId, UNIVERSITY_ID_HINT, formatUniversityId } from '../utils/universityId';
import { AuthLayout } from '../components/BrandBackground';
import { AuthPortalLinks } from '../components/AuthPageShell';
import '../styles/welcome.css';
import { BrandLogo } from '../components/BrandLogo';
import { HU_BRAND_GREEN, HU_BRAND_GREEN_BRIGHT } from '../config/appImages';

type AccountRole = 'student' | 'teacher';
type Step = 'identity' | 'otp' | 'details';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const accountRole: AccountRole = roleParam === 'teacher' ? 'teacher' : 'student';
  const [step, setStep] = useState<Step>('identity');
  const [form, setForm] = useState({
    universityId: '', email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', department: '',
    className: '', studyMode: 'full_time' as 'full_time' | 'part_time',
    otp: '',
  });
  const [registrationToken, setRegistrationToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const RoleIcon = accountRole === 'teacher' ? Briefcase : BookOpen;

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const idCheck = validateUniversityId(form.universityId);
    if (!idCheck.ok) return setError(idCheck.error);
    if (!form.email.trim()) return setError('Email is required');
    setError('');
    setLoading(true);
    try {
      await api.requestRegisterOtp({
        universityId: idCheck.id,
        email: form.email.trim(),
        role: accountRole,
      });
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const confirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.otp.trim())) return setError('Enter the 6-digit code');
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyRegisterOtp({
        email: form.email.trim(),
        code: form.otp.trim(),
      });
      setRegistrationToken(res.registrationToken);
      set('universityId', res.universityId);
      setStep('details');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationToken) return setError('Verify your email first');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    const idCheck = validateUniversityId(form.universityId);
    if (!idCheck.ok) return setError(idCheck.error);
    setError('');
    setLoading(true);
    try {
      const result = await register({
        universityId: idCheck.id,
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        department: form.department || undefined,
        role: accountRole,
        registrationToken,
        ...(accountRole === 'student'
          ? { className: form.className, studyMode: form.studyMode }
          : {}),
      });
      if (result.pendingApproval) {
        setPendingMessage(result.message);
        return;
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (pendingMessage) {
    return (
      <AuthLayout>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="auth-card auth-card--portal text-center">
          <div className="auth-card-accent" />
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl" style={{ background: '#f0fdf4', color: HU_BRAND_GREEN }}>
            ⏳
          </div>
          <h1 className="text-xl font-extrabold text-black">Pending</h1>
          <p className="welcome-body text-sm mt-3">{pendingMessage}</p>
          <Link
            to={accountRole === 'teacher' ? '/teacher' : '/student'}
            className="inline-flex items-center justify-center gap-2 mt-6 px-6 py-3 rounded-xl text-white font-semibold text-sm"
            style={{ background: HU_BRAND_GREEN }}
          >
            Sign in
          </Link>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout wide>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="auth-card auth-card--portal">
        <div className="auth-card-accent" />

        <div className="mb-5">
          <BrandLogo variant="full" />
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: HU_BRAND_GREEN }}>
            <GraduationCap size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-black">Register</h1>
            <p className="welcome-body text-xs">
              {accountRole === 'student' ? 'Student' : 'Teacher'}
              {' · '}
              {step === 'identity' ? '1/3 Email' : step === 'otp' ? '2/3 OTP' : '3/3 Details'}
            </p>
          </div>
        </div>

        <div className="auth-role-badge inline-flex items-center gap-2 mb-5 mt-3">
          <RoleIcon size={14} />
          {accountRole === 'student' ? 'Student' : 'Teacher'}
        </div>

        {step === 'identity' && (
          <form onSubmit={sendOtp} className="space-y-3">
            <div>
              <label className="auth-label">University ID</label>
              <input
                value={form.universityId}
                onChange={e => set('universityId', e.target.value)}
                placeholder="HU000-1234"
                required
                className="auth-input font-mono"
              />
              <p className="welcome-body text-[11px] mt-1">{UNIVERSITY_ID_HINT}</p>
              {form.universityId && validateUniversityId(form.universityId).ok && (
                <p className="text-[11px] mt-0.5 font-mono font-semibold" style={{ color: HU_BRAND_GREEN }}>
                  {formatUniversityId(form.universityId)}
                </p>
              )}
            </div>
            <div>
              <label className="auth-label">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required className="auth-input" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} className="auth-submit" style={{ background: HU_BRAND_GREEN }}>
              <Mail size={18} />
              {loading ? 'Sending…' : 'Send OTP'}
            </motion.button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={confirmOtp} className="space-y-3">
            <p className="welcome-body text-sm">Code sent to <strong>{form.email}</strong></p>
            <div>
              <label className="auth-label">OTP</label>
              <input
                value={form.otp}
                onChange={e => set('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                required
                className="auth-input font-mono tracking-widest text-center text-lg"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} className="auth-submit" style={{ background: HU_BRAND_GREEN }}>
              <ShieldCheck size={18} />
              {loading ? 'Checking…' : 'Verify'}
            </motion.button>
            <button
              type="button"
              disabled={loading}
              className="w-full text-sm font-semibold"
              style={{ color: HU_BRAND_GREEN }}
              onClick={async () => {
                setError('');
                setLoading(true);
                try {
                  const idCheck = validateUniversityId(form.universityId);
                  if (!idCheck.ok) throw new Error(idCheck.error);
                  await api.requestRegisterOtp({
                    universityId: idCheck.id,
                    email: form.email.trim(),
                    role: accountRole,
                  });
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to resend');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Resend code
            </button>
            <button
              type="button"
              className="w-full text-sm font-semibold text-gray-500"
              onClick={() => { setStep('identity'); setError(''); set('otp', ''); }}
            >
              Change email
            </button>
          </form>
        )}

        {step === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <ShieldCheck size={14} /> {form.email} verified
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="auth-label">First Name</label>
                <input value={form.firstName} onChange={e => set('firstName', e.target.value)} required className="auth-input" />
              </div>
              <div>
                <label className="auth-label">Last Name</label>
                <input value={form.lastName} onChange={e => set('lastName', e.target.value)} required className="auth-input" />
              </div>
            </div>
            <div>
              <label className="auth-label">Department</label>
              <input value={form.department} onChange={e => set('department', e.target.value)} className="auth-input" />
            </div>
            {accountRole === 'student' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="auth-label">Class (e.g. BIT 9)</label>
                  <input
                    value={form.className}
                    onChange={e => set('className', e.target.value)}
                    placeholder="BIT 9"
                    required
                    className="auth-input"
                  />
                </div>
                <div>
                  <label className="auth-label">Study mode</label>
                  <select
                    value={form.studyMode}
                    onChange={e => set('studyMode', e.target.value)}
                    required
                    className="auth-input"
                  >
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                  </select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="auth-label">Password</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} minLength={8} required className="auth-input" />
              </div>
              <div>
                <label className="auth-label">Confirm</label>
                <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required className="auth-input" />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              className="auth-submit"
              style={{ background: HU_BRAND_GREEN }}
            >
              <UserPlus size={18} />
              {loading ? 'Creating…' : `Create ${accountRole} account`}
            </motion.button>
          </form>
        )}

        <p className="text-center mt-4 welcome-body text-sm">
          Already registered?{' '}
          <Link to={accountRole === 'teacher' ? '/teacher' : '/student'} className="font-extrabold hover:underline" style={{ color: HU_BRAND_GREEN_BRIGHT }}>
            Sign in
          </Link>
        </p>

        <AuthPortalLinks role={accountRole} />
      </motion.div>
    </AuthLayout>
  );
}
