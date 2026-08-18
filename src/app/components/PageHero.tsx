import { motion, useReducedMotion } from 'motion/react';
import { HU_IMAGES, getImageByUrl } from '../config/appImages';
import { APP_HERO_GRADIENT, roleActiveGradient } from '../config/brandTheme';
import { ImageCaption } from './ImageCaption';
import { useAuth } from '../context/AuthContext';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  image?: string;
  gradient?: string;
  /** Right-hand slot for page actions, counters, or status panels. */
  children?: React.ReactNode;
  /** Small label above the title, e.g. "Academic review". */
  eyebrow?: string;
  /** Icon rendered in the eyebrow chip. */
  icon?: React.ComponentType<{ size?: number }>;
  /** Compact variant for secondary workspaces inside a dashboard. */
  dense?: boolean;
  showImageCaption?: boolean;
}

export function PageHero({
  title,
  subtitle,
  image = HU_IMAGES.teamWork,
  gradient,
  children,
  eyebrow,
  icon: Icon,
  dense = false,
  showImageCaption = false,
}: PageHeroProps) {
  const { user } = useAuth();
  const imageMeta = getImageByUrl(image);
  const reducedMotion = useReducedMotion();
  const roleGradient = user?.Role && ['student', 'teacher', 'admin'].includes(user.Role)
    ? roleActiveGradient(user.Role as 'student' | 'teacher' | 'admin')
    : APP_HERO_GRADIENT;

  return (
    <motion.section
      className={`page-hero${dense ? ' page-hero--dense' : ''}`}
      style={{ background: gradient || roleGradient }}
      initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.img
        src={image}
        alt={imageMeta ? `${imageMeta.title} — ${imageMeta.caption}` : ''}
        className="page-hero__photo"
        aria-hidden={!imageMeta}
        loading="lazy"
        initial={reducedMotion ? undefined : { scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <span className="page-hero__scrim" />
      <span className="page-hero__rule" />

      <div className="page-hero__inner">
        <motion.div
          className="page-hero__copy"
          initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {eyebrow && (
            <span className="page-hero__eyebrow">
              {Icon && <Icon size={13} />}
              {eyebrow}
            </span>
          )}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
          {showImageCaption && imageMeta && (
            <div className="page-hero__caption">
              <ImageCaption item={imageMeta} variant="overlay" />
            </div>
          )}
        </motion.div>

        {children && (
          <motion.div
            className="page-hero__aside"
            initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}
