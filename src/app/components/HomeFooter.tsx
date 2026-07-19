import { Link } from 'react-router';
import { GraduationCap, Briefcase, ExternalLink } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { APP_BRAND_NAME, UNIVERSITY_NAME, HU_WEBSITE, HU_BRAND_GREEN } from '../config/appImages';

export function HomeFooter() {
  return (
    <footer className="welcome-foot welcome-foot--light">
      <div className="welcome-foot-inner">
        <BrandLogo variant="hero" />
        <nav className="welcome-foot-links">
          <Link to="/student"><GraduationCap size={14} style={{ color: HU_BRAND_GREEN }} /> Student</Link>
          <Link to="/teacher"><Briefcase size={14} style={{ color: HU_BRAND_GREEN }} /> Teacher</Link>
          <a href={HU_WEBSITE} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} style={{ color: HU_BRAND_GREEN }} /> {UNIVERSITY_NAME}
          </a>
        </nav>
      </div>
      <p className="welcome-foot-copy">
        © {new Date().getFullYear()} {APP_BRAND_NAME}
      </p>
    </footer>
  );
}
