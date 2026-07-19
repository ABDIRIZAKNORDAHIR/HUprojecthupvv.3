import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Briefcase, Shield, LogIn } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { HU_BRAND_GREEN } from '../config/appImages';

interface HomeNavProps {
  scrolled: boolean;
}

export function HomeNav({ scrolled }: HomeNavProps) {
  const [signInOpen, setSignInOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setSignInOpen(false);
    };
    if (signInOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [signInOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSignInOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className={`welcome-nav welcome-nav--light ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <motion.div className="flex items-center min-w-0" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <BrandLogo variant="hero" />
        </motion.div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link to="/student" className="nav-portal-link nav-portal-link--student">
            <GraduationCap size={14} />
            Student
          </Link>
          <Link to="/teacher" className="nav-portal-link">
            <Briefcase size={14} />
            Teacher
          </Link>

          <div className="relative" ref={panelRef}>
            <button
              type="button"
              className="btn-signin-top"
              aria-expanded={signInOpen}
              onClick={e => { e.stopPropagation(); setSignInOpen(o => !o); }}
            >
              <LogIn size={14} />
              Sign In
            </button>

            <AnimatePresence>
              {signInOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-2xl overflow-hidden z-50 bg-white"
                  style={{ borderColor: `${HU_BRAND_GREEN}30` }}
                >
                  <Link to="/student" onClick={() => setSignInOpen(false)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-green-50">
                    <GraduationCap size={16} style={{ color: HU_BRAND_GREEN }} />
                    <span className="font-bold text-sm text-black">Student</span>
                  </Link>
                  <Link to="/teacher" onClick={() => setSignInOpen(false)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-green-50 border-t" style={{ borderColor: `${HU_BRAND_GREEN}12` }}>
                    <Briefcase size={16} style={{ color: HU_BRAND_GREEN }} />
                    <span className="font-bold text-sm text-black">Teacher</span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link to="/admin" className="welcome-staff-dot welcome-staff-dot--light" aria-label="Staff" title="Staff">
            <Shield size={11} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </header>
  );
}
