import { motion, useReducedMotion } from 'motion/react';
import { BrandLogo } from './BrandLogo';
import { UNIVERSITY_NAME } from '../config/appImages';
import '../styles/brand-lockup.css';

interface BrandLockupProps {
  size?: 'hero' | 'bar';
  /** Adds the university line under the mark. */
  withCaption?: boolean;
  className?: string;
}

/**
 * The logo always sits on the same white plate so it reads identically on
 * photography, dark panels and white cards.
 */
export function BrandLockup({ size = 'hero', withCaption = true, className = '' }: BrandLockupProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`lockup lockup--${size} ${className}`.trim()}
      initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <span className="lockup__markwrap">
        <BrandLogo variant={size === 'hero' ? 'xl' : 'hero'} className="lockup__mark" />
      </span>

      {withCaption && (
        <p className="lockup__caption">
          <span>{UNIVERSITY_NAME}</span>
          <i />
          <span>Academic project workspace</span>
        </p>
      )}
    </motion.div>
  );
}
