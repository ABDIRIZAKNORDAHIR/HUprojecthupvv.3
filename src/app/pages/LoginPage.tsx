import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { AuthShell } from '../components/AuthShell';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [universityId, setUniversityId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(universityId, email.trim().toLowerCase(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell role="student">
      <h1 className="authx__title">Sign in</h1>
      <p className="authx__subtitle">Use your HU ID and the email address you registered.</p>

      <form onSubmit={handleSubmit} className="authx__form">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" defaultValue="" />

        <div className="authx__field">
          <label className="authx__label" htmlFor="login-university-id">University ID</label>
          <input
            id="login-university-id"
            className="authx__input"
            value={universityId}
            onChange={e => setUniversityId(e.target.value)}
            placeholder="HU000-1234"
            autoComplete="username"
            required
          />
        </div>

        <div className="authx__field">
          <label className="authx__label" htmlFor="login-email">Email address</label>
          <input
            id="login-email"
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
          <label className="authx__label" htmlFor="login-password">Password</label>
          <div className="relative">
            <input
              id="login-password"
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

        {error && <p className="authx__alert" role="alert">{error}</p>}

        <button type="submit" className="authx__submit" disabled={loading}>
          <LogIn size={18} /> {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="authx__switchers">
        <Link className="authx__switcher" to="/login/student">Student portal</Link>
        <Link className="authx__switcher" to="/login/teacher">Teacher portal</Link>
        <Link className="authx__switcher" to="/login/admin">Staff portal</Link>
        <Link className="authx__switcher" to="/">Homepage</Link>
      </div>
    </AuthShell>
  );
}
