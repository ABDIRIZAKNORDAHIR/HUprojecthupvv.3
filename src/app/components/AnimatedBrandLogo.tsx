import { motion, useReducedMotion } from 'motion/react';
import { BrandLogo } from './BrandLogo';
import '../styles/auth-motion.css';

type LogoSize = 'hero' | 'full' | 'xl';

interface AnimatedBrandLogoProps {
  variant?: LogoSize;
  className?: string;
  /** Orbiting rings and sweep are heavier — use on landing/auth headers only. */
  showOrbit?: boolean;
}

/**
 * The wordmark itself is the official asset; everything around it is motion so the
 * brand stays untouched while the presentation feels alive.
 */
export function AnimatedBrandLogo({
  variant = 'hero',
  className = '',
  showOrbit = true,
}: AnimatedBrandLogoProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`brand-logo-animated ${className}`.trim()}
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
    >
      {showOrbit && !reduceMotion && (
        <>
          <motion.span
            className="brand-logo-animated__halo"
            animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.08, 1] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="brand-logo-animated__orbit"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          >
            <i />
            <i />
            <i />
          </motion.span>
        </>
      )}

      <span className="brand-logo-animated__mark">
        <BrandLogo variant={variant} />
        {!reduceMotion && (
          <motion.span
            className="brand-logo-animated__sweep"
            initial={{ x: '-120%' }}
            animate={{ x: '160%' }}
            transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 3.2, ease: 'easeInOut' }}
          />
        )}
      </span>
    </motion.div>
  );
}
