import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { GraduationCap, LogIn, Mail, MapPin, Menu, Phone, UserPlus, X } from 'lucide-react';
import { BrandLockup } from './BrandLockup';
import {
  CONTACT_CAMPUS, CONTACT_EMAIL, CONTACT_HOURS, CONTACT_PHONE, CONTACT_TEL,
} from '../config/contact';
import { HU_WEBSITE, UNIVERSITY_NAME } from '../config/appImages';

const storyNav = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Privacy', to: '/privacy' },
] as const;

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="hub" id="top">
      <header className="hub-nav">
        <div className="hub-shell hub-nav__inner">
          <Link to="/" className="hub-nav__brand" aria-label="Hormuud ProjectHub home">
            <BrandLockup size="bar" withCaption={false} className="lockup--on-light" />
          </Link>
          <nav>
            {storyNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={location.pathname === item.to ? 'is-active' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hub-nav__actions">
            <Link to="/login/student" className="hub-nav__signin"><LogIn size={14} /> Log in</Link>
            <Link to="/register/student" className="hub-btn hub-btn--sm"><UserPlus size={14} /> Create account</Link>
          </div>
          <button type="button" className="hub-nav__toggle" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="hub-shell hub-nav__sheet"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {storyNav.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}>{item.label}</Link>
              ))}
              <Link to="/login/student" onClick={() => setMenuOpen(false)}><LogIn size={15} /> Log in</Link>
              <Link to="/register/student" className="hub-btn" onClick={() => setMenuOpen(false)}>Create account</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>{children}</main>

      <footer className="hub-footer">
        <div className="hub-shell hub-footer__grid">
          <div className="hub-footer__brand">
            <BrandLockup size="bar" withCaption={false} />
            <p>Academic project management for {UNIVERSITY_NAME}.</p>
            <div>
              <a href={`mailto:${CONTACT_EMAIL}`} aria-label="Email ProjectHub"><Mail size={15} /></a>
              <a href={CONTACT_TEL} aria-label="Call ProjectHub"><Phone size={15} /></a>
              <a href={HU_WEBSITE} target="_blank" rel="noreferrer" aria-label="Hormuud University"><GraduationCap size={15} /></a>
            </div>
          </div>
          <div className="hub-footer__col">
            <h3>ProjectHub</h3>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
          <div className="hub-footer__col">
            <h3>Portals</h3>
            <Link to="/login/student">Student sign in</Link>
            <Link to="/login/teacher">Teacher sign in</Link>
            <Link to="/login/admin">Staff sign in</Link>
            <Link to="/register/student">Create account</Link>
          </div>
          <div className="hub-footer__col hub-footer__contact">
            <h3>Contact</h3>
            <a href={`mailto:${CONTACT_EMAIL}`}><Mail size={13} /> {CONTACT_EMAIL}</a>
            <a href={CONTACT_TEL}><Phone size={13} /> {CONTACT_PHONE}</a>
            <p><MapPin size={13} /> {CONTACT_CAMPUS}</p>
            <p>{CONTACT_HOURS}</p>
          </div>
        </div>
        <div className="hub-shell hub-footer__legal">
          <p>© {new Date().getFullYear()} {UNIVERSITY_NAME}. All rights reserved.</p>
          <Link to="/">Back to ProjectHub</Link>
        </div>
      </footer>
    </div>
  );
}
