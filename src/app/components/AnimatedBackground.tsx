import { motion } from 'motion/react';

interface AnimatedBackgroundProps {
  image: string;
  overlay?: string;
  className?: string;
}

/** Ken Burns + floating orbs for premium full-screen backgrounds */
export function AnimatedBackground({
  image,
  overlay = 'linear-gradient(160deg, rgba(15,23,42,0.88) 0%, rgba(22,101,52,0.45) 40%, rgba(30,58,138,0.72) 100%)',
  className = '',
}: AnimatedBackgroundProps) {
  return (
    <div className={`fixed inset-0 overflow-hidden ${className}`} aria-hidden>
      <motion.img
        src={image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1.15 }}
        transition={{ duration: 22, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />
      <div className="absolute inset-0" style={{ background: overlay }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(255,255,255,0.14),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_100%,rgba(34,197,94,0.12),transparent_40%)]" />

      {/* Floating orbs */}
      {[
        { size: 280, x: '8%', y: '15%', color: 'rgba(34,197,94,0.18)', delay: 0 },
        { size: 200, x: '75%', y: '60%', color: 'rgba(59,130,246,0.15)', delay: 2 },
        { size: 160, x: '55%', y: '8%', color: 'rgba(255,255,255,0.06)', delay: 4 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl pointer-events-none"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
          }}
          animate={{ y: [0, -18, 0], x: [0, 10, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, delay: orb.delay, ease: 'easeInOut' }}
        />
      ))}

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}
