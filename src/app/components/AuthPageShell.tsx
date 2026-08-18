import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { HU_BRAND_GREEN } from '../config/appImages';

/** Top bar on auth pages — matches homepage branding */
export function AuthPageNav() {
  return (
    <header className="auth-page-nav">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center min-w-0 group">
          <BrandLogo variant="hero" />
        </Link>
        <Link
          to="/"
          className="auth-back-home"
        >
          <ArrowLeft size={15} />
          Home
        </Link>
      </div>
    </header>
  );
}

interface AuthPortalLinksProps {
  role?: 'student' | 'teacher' | 'admin';
}

/** Switch between portals — same family as homepage */
export function AuthPortalLinks({ role }: AuthPortalLinksProps) {
  if (role === 'admin') {
    return (
      <p className="auth-portal-links welcome-body text-center mt-5 text-xs">
        <Link to="/" className="auth-portal-link">Return to homepage</Link>
      </p>
    );
  }

  const hideStudent = role === 'student';
  const hideTeacher = role === 'teacher';

  return (
    <div className="auth-portal-links mt-5 pt-4 border-t" style={{ borderColor: `${HU_BRAND_GREEN}18` }}>
      <p className="welcome-label text-center mb-2" style={{ color: HU_BRAND_GREEN }}>Other portals</p>
      <div className="flex flex-wrap justify-center gap-2">
        {!hideStudent && (
          <Link to="/login/student" className="auth-portal-pill">Student</Link>
        )}
        {!hideTeacher && (
          <Link to="/login/teacher" className="auth-portal-pill">Teacher</Link>
        )}
        <Link to="/" className="auth-portal-pill auth-portal-pill--muted">Home</Link>
      </div>
    </div>
  );
}
