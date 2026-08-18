import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, KeyRound, Lock, LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ApiError, api } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { DevOtpReveal } from '../components/DevOtpReveal';
import { OtpBoxes } from '../components/OtpBoxes';
import { OtpCountdown } from '../components/OtpCountdown';
import { WaitingMark } from '../components/WaitingIcon';

type PortalRole = 'student' | 'teacher' | 'admin';
type AdminStep = 'email' | 'otp' | 'password';
type ResetStep = 'email' | 'otp' | 'password' | 'done';

const titles: Record<PortalRole, { title: string; subtitle: string }> = {
  student: { title: 'Student sign in', subtitle: 'Enter your HU ID and university email to open your projects, proposals and marks.' },
  teacher: { title: 'Teacher sign in', subtitle: 'Enter your HU ID and university email to open the review queue and release marks.' },
  admin: { title: 'Staff sign in', subtitle: 'Administration accounts are verified by email code before the password.' },
};

export function RolePortalPage({ role }: { role: PortalRole }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === 'admin';
  const fieldId = (name: string) => `${role}-portal-${name}`;

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
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [info, setInfo] = useState('');
  const [delivery, setDelivery] = useState<{ to: string; notice?: string | null; devCode?: string | null } | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState(0);
  const [codeExpired, setCodeExpired] = useState(false);

  /** The emailed code dies with the server TTL, so the UI must stop accepting it too. */
  const armCodeTimer = (minutes: number) => {
    setCodeExpiresAt(Date.now() + Math.max(1, minutes) * 60_000);
    setCodeExpired(false);
  };

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
      const res = await api.requestAdminOtp(email.trim().toLowerCase());
      setDelivery({ to: res.deliveredTo, notice: res.notice, devCode: res.devCode });
      if (res.devCode) setOtp(res.devCode);
      armCodeTimer(res.expiresInMinutes);
      setAdminStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const verifyAdminOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeExpired) return setError('That code expired. Send a new one.');
    if (!/^\d{6}$/.test(otp.trim())) return setError('Enter the 6-digit code');
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyAdminOtp({ email: email.trim().toLowerCase(), code: otp.trim() });
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
        email.trim().toLowerCase(),
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
    const address = email.trim().toLowerCase();
    if (!address) return setError('Enter your email address');

    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await api.requestPasswordResetOtp({ email: address, role });
      setVerifiedEmail(res.identity);
      setDelivery({ to: res.deliveredTo, notice: res.notice, devCode: res.devCode });
      if (res.devCode) setOtp(res.devCode);
      armCodeTimer(res.expiresInMinutes);
      setResetStep('otp');
      setInfo(res.notice || `Code sent to ${res.deliveredTo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const verifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeExpired) return setError('That code expired. Send a new one.');
    if (!/^\d{6}$/.test(otp.trim())) return setError('Enter the 6-digit code');
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyPasswordResetOtp({ email: verifiedEmail, code: otp.trim() });
      setResetToken(res.resetToken);
      setResetStep('password');
      setInfo('Verified. Create a new password.');
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
      await api.confirmPasswordReset({ resetToken, newPassword, confirmPassword });
      setResetStep('done');
      setInfo('Password updated. You can sign in now.');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  const step = mode === 'reset'
    ? `Reset · ${resetStep === 'email' ? 'Step 1 of 3' : resetStep === 'otp' ? 'Step 2 of 3' : 'Step 3 of 3'}`
    : isAdmin
      ? `Step ${adminStep === 'email' ? '1' : adminStep === 'otp' ? '2' : '3'} of 3`
      : undefined;

  const errorBlock = error ? <p className="authx__alert" role="alert">{error}</p> : null;
  const deliveryNote = delivery?.notice
    ? <p className="authx__note authx__note--warn" role="status"><Mail size={14} /> {delivery.notice}</p>
    : null;
  const deliveryCode = <DevOtpReveal code={delivery?.devCode} />;

  return (
    <AuthShell role={role} step={step}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${mode}-${mode === 'reset' ? resetStep : isAdmin ? adminStep : 'login'}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ── Sign in: student / teacher ── */}
          {mode === 'login' && !isAdmin && (
            <>
              <h1 className="authx__title">{titles[role].title}</h1>
              <p className="authx__subtitle">{titles[role].subtitle}</p>

              <form onSubmit={handleSubmit} className="authx__form">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" defaultValue="" />

                <div className="authx__field">
                  <label className="authx__label" htmlFor={fieldId('university-id')}>University ID</label>
                  <input
                    id={fieldId('university-id')}
                    className="authx__input"
                    value={universityId}
                    onChange={e => setUniversityId(e.target.value)}
                    placeholder="HU000-1234"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="authx__field">
                  <label className="authx__label" htmlFor={fieldId('email')}>Email address</label>
                  <input
                    id={fieldId('email')}
                    type="email"
                    className="authx__input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@hu.edu.so"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="authx__field">
                  <label className="authx__label" htmlFor={fieldId('password')}>Password</label>
                  <div className="relative">
                    <input
                      id={fieldId('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="authx__input authx__input--pill"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button type="button" className="authx__reveal" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <button type="button" className="authx__link justify-self-start" onClick={openReset}>
                    Forgot password?
                  </button>
                </div>

                {pendingApproval && (
                  <p className="authx__note authx__note--wait" role="status">
                    <WaitingMark size={16} />
                    <span>Your {role} account is waiting for administrator approval. You will be emailed once it is approved.</span>
                  </p>
                )}
                {errorBlock}

                <button type="submit" className="authx__submit" disabled={loading}>
                  <LogIn size={18} /> {loading ? 'Signing in…' : 'Sign in'}
                </button>

                <Link to={`/register?role=${role}`} className="authx__secondary">
                  <UserPlus size={17} /> Create a new {role} account
                </Link>
              </form>
            </>
          )}

          {/* ── Sign in: admin ── */}
          {mode === 'login' && isAdmin && adminStep === 'email' && (
            <>
              <h1 className="authx__title">{titles.admin.title}</h1>
              <p className="authx__subtitle">{titles.admin.subtitle}</p>

              <form onSubmit={sendAdminOtp} className="authx__form">
                <div className="authx__field">
                  <label className="authx__label" htmlFor={fieldId('admin-email')}>Work email</label>
                  <input
                    id={fieldId('admin-email')}
                    type="email"
                    className="authx__input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="staff@hu.edu.so"
                    autoComplete="email"
                    required
                  />
                </div>

                {errorBlock}
                <button type="submit" className="authx__submit" disabled={loading}>
                  <Lock size={18} /> {loading ? 'Sending…' : 'Send verification code'}
                </button>
                <button type="button" className="authx__link" onClick={openReset}>Forgot password?</button>
              </form>
            </>
          )}

          {mode === 'login' && isAdmin && adminStep === 'otp' && (
            <>
              <h1 className="authx__title">Enter your code</h1>
              <p className="authx__subtitle">
                Sent to <strong>{delivery?.to || email}</strong>.
              </p>

              <form onSubmit={verifyAdminOtp} className="authx__form">
                {deliveryNote}
                {deliveryCode}
                <OtpBoxes
                  id={fieldId('admin-otp')}
                  value={otp}
                  onChange={setOtp}
                  invalid={!!error}
                  disabled={loading || codeExpired}
                />
                {codeExpiresAt > 0 && (
                  <OtpCountdown expiresAt={codeExpiresAt} onExpire={() => setCodeExpired(true)} />
                )}
                {errorBlock}
                <button type="submit" className="authx__submit" disabled={loading || codeExpired}>
                  <ShieldCheck size={18} /> {loading ? 'Checking…' : 'Verify code'}
                </button>
                <button
                  type="button"
                  className="authx__link"
                  onClick={() => { setAdminStep('email'); setError(''); setOtp(''); setCodeExpired(false); setCodeExpiresAt(0); }}
                >
                  {codeExpired ? 'Send a new code' : 'Change email address'}
                </button>
              </form>
            </>
          )}

          {mode === 'login' && isAdmin && adminStep === 'password' && (
            <>
              <h1 className="authx__title">Welcome back</h1>
              <p className="authx__subtitle">Verification complete — enter your password to continue.</p>

              <form onSubmit={handleSubmit} className="authx__form">
                <p className="authx__note" role="status"><ShieldCheck size={14} /> {email} verified</p>
                <div className="authx__field">
                  <label className="authx__label" htmlFor={fieldId('admin-password')}>Password</label>
                  <div className="relative">
                    <input
                      id={fieldId('admin-password')}
                      type={showPassword ? 'text' : 'password'}
                      className="authx__input authx__input--pill"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button type="button" className="authx__reveal" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                {errorBlock}
                <button type="submit" className="authx__submit" disabled={loading}>
                  <LogIn size={18} /> {loading ? 'Signing in…' : 'Sign in'}
                </button>
                <button type="button" className="authx__link" onClick={openReset}>Forgot password?</button>
              </form>
            </>
          )}

          {/* ── Forgot password ── */}
          {mode === 'reset' && resetStep === 'email' && (
            <>
              <h1 className="authx__title">Forgot password</h1>
              <p className="authx__subtitle">
                Enter the email on your account and we will send a verification code.
              </p>

              <form onSubmit={sendResetOtp} className="authx__form">
                <div className="authx__field">
                  <label className="authx__label" htmlFor={fieldId('reset-email')}>Email address</label>
                  <input
                    id={fieldId('reset-email')}
                    type="email"
                    className="authx__input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@hu.edu.so"
                    autoComplete="email"
                    required
                  />
                </div>
                {errorBlock}
                <button type="submit" className="authx__submit" disabled={loading}>
                  <Mail size={18} />
                  {loading ? 'Sending…' : 'Send verification code'}
                </button>
                <button type="button" className="authx__link" onClick={backToLogin}>
                  <ArrowLeft size={13} /> Back to sign in
                </button>
              </form>
            </>
          )}

          {mode === 'reset' && resetStep === 'otp' && (
            <>
              <h1 className="authx__title">Enter your code</h1>
              <p className="authx__subtitle">Sent to <strong>{delivery?.to}</strong>.</p>

              <form onSubmit={verifyResetOtp} className="authx__form">
                {info && !delivery?.notice && <p className="authx__note" role="status"><ShieldCheck size={14} /> {info}</p>}
                {deliveryNote}
                {deliveryCode}
                <OtpBoxes
                  id={fieldId('reset-otp')}
                  value={otp}
                  onChange={setOtp}
                  invalid={!!error}
                  disabled={loading || codeExpired}
                />
                {codeExpiresAt > 0 && (
                  <OtpCountdown expiresAt={codeExpiresAt} onExpire={() => setCodeExpired(true)} />
                )}
                {errorBlock}
                <button type="submit" className="authx__submit" disabled={loading || codeExpired}>
                  <ShieldCheck size={18} /> {loading ? 'Checking…' : 'Verify code'}
                </button>
                <button
                  type="button"
                  className="authx__link"
                  onClick={() => { setResetStep('email'); setError(''); setOtp(''); setCodeExpired(false); setCodeExpiresAt(0); }}
                >
                  {codeExpired ? 'Send a new code' : 'Use a different email address'}
                </button>
              </form>
            </>
          )}

          {mode === 'reset' && resetStep === 'password' && (
            <>
              <h1 className="authx__title">New password</h1>
              <p className="authx__subtitle">Choose something at least 8 characters long.</p>

              <form onSubmit={confirmReset} className="authx__form">
                <div className="authx__field">
                  <label className="authx__label" htmlFor={fieldId('new-password')}>New password</label>
                  <input
                    id={fieldId('new-password')}
                    type={showPassword ? 'text' : 'password'}
                    className="authx__input"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
                <div className="authx__field">
                  <label className="authx__label" htmlFor={fieldId('confirm-password')}>Confirm password</label>
                  <div className="relative">
                    <input
                      id={fieldId('confirm-password')}
                      type={showPassword ? 'text' : 'password'}
                      className="authx__input authx__input--pill"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <button type="button" className="authx__reveal" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                {errorBlock}
                <button type="submit" className="authx__submit" disabled={loading}>
                  <KeyRound size={18} /> {loading ? 'Saving…' : 'Save new password'}
                </button>
              </form>
            </>
          )}

          {mode === 'reset' && resetStep === 'done' && (
            <>
              <h1 className="authx__title">Password updated</h1>
              <p className="authx__subtitle">{info}</p>
              <div className="authx__form">
                <button type="button" className="authx__submit" onClick={backToLogin}>
                  <LogIn size={18} /> Sign in
                </button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="authx__switchers">
        {role !== 'student' && <Link className="authx__switcher" to="/login/student">Student portal</Link>}
        {role !== 'teacher' && <Link className="authx__switcher" to="/login/teacher">Teacher portal</Link>}
        <Link className="authx__switcher" to="/">Homepage</Link>
      </div>
    </AuthShell>
  );
}
