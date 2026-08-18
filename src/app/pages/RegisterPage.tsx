import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { validateUniversityId, UNIVERSITY_ID_HINT, formatUniversityId } from '../utils/universityId';
import { AuthShell } from '../components/AuthShell';
import { DevOtpReveal } from '../components/DevOtpReveal';
import { OtpBoxes } from '../components/OtpBoxes';
import { OtpCountdown } from '../components/OtpCountdown';
import { WaitingMedallion } from '../components/WaitingIcon';

type AccountRole = 'student' | 'teacher';
type Step = 'email' | 'otp' | 'details';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const roleParam = searchParams.get('role');
  const accountRole: AccountRole =
    roleParam === 'teacher' || location.pathname.endsWith('/register/teacher') ? 'teacher' : 'student';
  const fieldId = (name: string) => `${accountRole}-register-${name}`;

  const [step, setStep] = useState<Step>('email');
  const [form, setForm] = useState({
    universityId: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', department: '',
    className: '', studyMode: 'full_time' as 'full_time' | 'part_time',
    otp: '',
  });
  const [email, setEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [delivery, setDelivery] = useState<{ to: string; notice?: string | null; devCode?: string | null } | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState(0);
  const [codeExpired, setCodeExpired] = useState(false);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const requestCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const idCheck = validateUniversityId(form.universityId);
    if (!idCheck.ok) return setError(idCheck.error);
    const address = email.trim().toLowerCase();
    if (!address) return setError('Enter your email address');

    setError('');
    setLoading(true);
    try {
      const res = await api.requestRegisterOtp({
        universityId: idCheck.id,
        email: address,
        role: accountRole,
      });
      setVerifiedEmail(res.identity);
      setDelivery({ to: res.deliveredTo, notice: res.notice, devCode: res.devCode });
      if (res.devCode) set('otp', res.devCode);
      // Mirror the server TTL so the form stops accepting a code the API will reject.
      setCodeExpiresAt(Date.now() + Math.max(1, res.expiresInMinutes) * 60_000);
      setCodeExpired(false);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const confirmOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (codeExpired) return setError('That code expired. Use “Resend code” to get a new one.');
    if (!/^\d{6}$/.test(form.otp.trim())) return setError('Enter the 6-digit code');
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyRegisterOtp({ email: verifiedEmail, code: form.otp.trim() });
      setRegistrationToken(res.registrationToken);
      set('universityId', res.universityId);
      setStep('details');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!registrationToken) return setError('Verify your email first');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    const idCheck = validateUniversityId(form.universityId);
    if (!idCheck.ok) return setError(idCheck.error);

    setError('');
    setLoading(true);
    try {
      const result = await register({
        universityId: idCheck.id,
        email: verifiedEmail,
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

  const errorBlock = error ? <p className="authx__alert" role="alert">{error}</p> : null;
  const stepLabel = step === 'email' ? 'Step 1 of 3' : step === 'otp' ? 'Step 2 of 3' : 'Step 3 of 3';

  if (pendingMessage) {
    return (
      <AuthShell role={accountRole}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <WaitingMedallion role={accountRole} caption={accountRole} />
          <h1 className="authx__title authx__title--center">Waiting for approval</h1>
          <p className="authx__subtitle authx__subtitle--center">{pendingMessage}</p>
          <div className="authx__form">
            <Link className="authx__submit" to={`/login/${accountRole}`}>Go to sign in</Link>
          </div>
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell role={accountRole} step={stepLabel}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 'email' && (
            <>
              <h1 className="authx__title">Create your {accountRole} account</h1>
              <p className="authx__subtitle">
                {accountRole === 'teacher'
                  ? 'Register with your HU ID, confirm the emailed code, then wait for staff approval before you open the review queue.'
                  : 'Register with your HU ID, confirm the emailed code, then start proposing projects to your teacher.'}
              </p>

              <form onSubmit={requestCode} className="authx__form">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" defaultValue="" />

                <div className="authx__field">
                  <label className="authx__label" htmlFor={fieldId('university-id')}>University ID</label>
                  <input
                    id={fieldId('university-id')}
                    className="authx__input font-mono"
                    value={form.universityId}
                    onChange={e => set('universityId', e.target.value)}
                    placeholder="HU000-1234"
                    required
                  />
                  <p className="authx__hint">{UNIVERSITY_ID_HINT}</p>
                  {form.universityId && validateUniversityId(form.universityId).ok && (
                    <p className="authx__hint font-mono" style={{ color: '#0b7a45' }}>
                      {formatUniversityId(form.universityId)}
                    </p>
                  )}
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
                  <p className="authx__hint">The 6-digit code goes to this inbox.</p>
                </div>

                {errorBlock}
                <button type="submit" className="authx__submit" disabled={loading}>
                  <Mail size={18} />
                  {loading ? 'Sending…' : 'Send verification code'}
                </button>

                <Link to={`/login/${accountRole}`} className="authx__secondary">
                  I already have an account
                </Link>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <h1 className="authx__title">Enter your code</h1>
              <p className="authx__subtitle">
                Sent to <strong>{delivery?.to}</strong>.
              </p>

              <form onSubmit={confirmOtp} className="authx__form">
                {delivery?.notice && (
                  <p className="authx__note authx__note--warn" role="status">
                    <Mail size={14} /> {delivery.notice}
                  </p>
                )}
                <DevOtpReveal code={delivery?.devCode} />
                <OtpBoxes
                  id={fieldId('otp')}
                  value={form.otp}
                  onChange={value => set('otp', value)}
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
                <button type="button" className="authx__link" disabled={loading} onClick={() => requestCode()}>
                  Resend code
                </button>
                <button
                  type="button"
                  className="authx__link"
                  onClick={() => { setStep('email'); setError(''); set('otp', ''); setCodeExpired(false); setCodeExpiresAt(0); }}
                >
                  Change email address
                </button>
              </form>
            </>
          )}

          {step === 'details' && (
            <>
              <h1 className="authx__title">Finish your profile</h1>
              <p className="authx__subtitle">Last step — tell us who you are and choose a password.</p>

              <form onSubmit={handleSubmit} className="authx__form">
                <p className="authx__note" role="status">
                  <ShieldCheck size={14} /> {verifiedEmail} verified
                </p>

                <div className="authx__row">
                  <div className="authx__field">
                    <label className="authx__label" htmlFor={fieldId('first-name')}>First name</label>
                    <input id={fieldId('first-name')} className="authx__input" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
                  </div>
                  <div className="authx__field">
                    <label className="authx__label" htmlFor={fieldId('last-name')}>Last name</label>
                    <input id={fieldId('last-name')} className="authx__input" value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
                  </div>
                </div>

                <div className="authx__field">
                  <label className="authx__label" htmlFor={fieldId('department')}>Department</label>
                  <input id={fieldId('department')} className="authx__input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="Computer Science" />
                </div>

                {accountRole === 'student' && (
                  <div className="authx__row">
                    <div className="authx__field">
                      <label className="authx__label" htmlFor={fieldId('class')}>Class</label>
                      <input id={fieldId('class')} className="authx__input" value={form.className} onChange={e => set('className', e.target.value)} placeholder="BIT 9" required />
                    </div>
                    <div className="authx__field">
                      <label className="authx__label" htmlFor={fieldId('study-mode')}>Study mode</label>
                      <select id={fieldId('study-mode')} className="authx__input" value={form.studyMode} onChange={e => set('studyMode', e.target.value)} required>
                        <option value="full_time">Full-time</option>
                        <option value="part_time">Part-time</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="authx__row">
                  <div className="authx__field">
                    <label className="authx__label" htmlFor={fieldId('password')}>Password</label>
                    <input id={fieldId('password')} type={showPassword ? 'text' : 'password'} className="authx__input" value={form.password} onChange={e => set('password', e.target.value)} minLength={8} required />
                  </div>
                  <div className="authx__field">
                    <label className="authx__label" htmlFor={fieldId('confirm-password')}>Confirm</label>
                    <div className="relative">
                      <input id={fieldId('confirm-password')} type={showPassword ? 'text' : 'password'} className="authx__input authx__input--pill" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} minLength={8} required />
                      <button type="button" className="authx__reveal" onClick={() => setShowPassword(v => !v)}>
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </div>

                {errorBlock}
                <button type="submit" className="authx__submit" disabled={loading}>
                  <UserPlus size={18} /> {loading ? 'Creating…' : `Create ${accountRole} account`}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="authx__switchers">
        <Link className="authx__switcher" to={`/login/${accountRole}`}>Sign in</Link>
        <Link className="authx__switcher" to={accountRole === 'student' ? '/register/teacher' : '/register/student'}>
          Register as {accountRole === 'student' ? 'teacher' : 'student'}
        </Link>
        <Link className="authx__switcher" to="/">Homepage</Link>
      </div>
    </AuthShell>
  );
}
