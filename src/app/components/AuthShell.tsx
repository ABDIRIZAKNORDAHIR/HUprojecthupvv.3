import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { BrandLockup } from './BrandLockup';
import { HuImage } from './HuImage';
import { HU_IMAGES, UNIVERSITY_NAME } from '../config/appImages';
import { roleActiveGradient } from '../config/brandTheme';
import '../styles/auth-shell.css';

export type AuthRole = 'student' | 'teacher' | 'admin';

type Showcase = {
  key: keyof typeof HU_IMAGES;
  src: string;
  alt: string;
};

interface RoleTheme {
  badge: string;
  heading: string;
  blurb: string;
  accent: string;
  hero: Showcase;
}

const roleThemes: Record<AuthRole, RoleTheme> = {
  student: {
    badge: 'Student portal',
    heading: 'Propose. Submit. Get marked.',
    blurb: 'Send your project to a teacher, work with your team, and read every decision inside ProjectHub.',
    accent: roleActiveGradient('student'),
    hero: { key: 'teamWork', src: HU_IMAGES.teamWork, alt: 'Hormuud University students working together on a project' },
  },
  teacher: {
    badge: 'Teacher portal',
    heading: 'Review once. Release the mark.',
    blurb: 'Open the queue, approve or request changes, and send marks out of 100 with written feedback.',
    accent: roleActiveGradient('teacher'),
    hero: { key: 'convocation', src: HU_IMAGES.convocation, alt: 'Hormuud University faculty at convocation' },
  },
  admin: {
    badge: 'Administration',
    heading: 'The university workspace.',
    blurb: 'Restricted staff access for Hormuud University accounts, classes and academic records.',
    accent: roleActiveGradient('admin'),
    hero: { key: 'campus', src: HU_IMAGES.campus, alt: 'Hormuud University campus building' },
  },
};

interface AuthShellProps {
  role: AuthRole;
  children: ReactNode;
  /** Small step counter shown above the form, e.g. "Step 2 of 3". */
  step?: string;
}

export function AuthShell({ role, children, step }: AuthShellProps) {
  const reduceMotion = useReducedMotion();
  const theme = roleThemes[role];

  return (
    <div className="authx" style={{ ['--authx-accent' as string]: theme.accent }}>
      <div className="authx__frame">
        {/* Story panel — brand + real campus photography */}
        <motion.aside
          className="authx__story"
          initial={reduceMotion ? undefined : { opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="authx__story-bg">
            <HuImage imageKey={theme.hero.key} src={theme.hero.src} alt="" />
          </div>
          <div className="authx__story-wash" />

          <div className="authx__story-top">
            <Link to="/" className="authx__logo" aria-label="Hormuud ProjectHub home">
              <BrandLockup size="bar" withCaption={false} />
            </Link>
            <span className="authx__badge">{theme.badge}</span>
          </div>

          <div className="authx__story-copy">
            <h2>{theme.heading}</h2>
            <p>{theme.blurb}</p>
          </div>

          <p className="authx__story-foot">{UNIVERSITY_NAME} · ProjectHub</p>
        </motion.aside>

        {/* Form panel */}
        <motion.main
          className="authx__panel"
          initial={reduceMotion ? undefined : { opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="authx__panel-head">
            <Link to="/" className="authx__back"><ArrowLeft size={15} /> Home</Link>
            {step && <span className="authx__step">{step}</span>}
          </div>

          <div className="authx__panel-logo">
            <BrandLockup size="bar" withCaption={false} className="lockup--on-light" />
          </div>

          <div className="authx__panel-body">{children}</div>

          <p className="authx__panel-foot">
            © {new Date().getFullYear()} {UNIVERSITY_NAME} · ProjectHub
          </p>
        </motion.main>
      </div>
    </div>
  );
}
