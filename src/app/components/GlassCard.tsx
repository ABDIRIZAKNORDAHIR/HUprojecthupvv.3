import { motion, useReducedMotion } from 'motion/react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: string;
  delay?: number;
}

export function GlassCard({ children, className = '', hover = true, glow, delay = 0 }: GlassCardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: reducedMotion ? 0 : delay }}
      whileHover={hover && !reducedMotion ? { y: -4, scale: 1.01 } : undefined}
      className={`relative rounded-2xl border border-white/20 backdrop-blur-xl bg-white/90 shadow-xl overflow-hidden ${className}`}
      style={glow ? { boxShadow: `0 8px 40px ${glow}` } : undefined}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
