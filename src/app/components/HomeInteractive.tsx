import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import type { AppImageItem } from '../config/appImages';
import { HU_BRAND_GREEN, HU_BRAND_GREEN_BRIGHT, HU_BRAND_GREEN_LIGHT } from '../config/appImages';

/** Floating particles that drift across the hero */
export function FloatingParticles({ count = 24 }: { count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 12 + Math.random() * 18,
      delay: Math.random() * 6,
    })),
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/30"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: [0, -80 - Math.random() * 120, 0],
            x: [0, (Math.random() - 0.5) * 60, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/** Infinite horizontal marquee of HU student photos */
export function ImageMarquee({ items }: { items: AppImageItem[] }) {
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden py-3 mask-fade-x">
      <motion.div
        className="flex gap-4 w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            className="relative flex-shrink-0 w-44 sm:w-52 h-28 sm:h-32 rounded-xl overflow-hidden border border-white/20 shadow-lg"
          >
            <img
              src={item.url}
              alt={item.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <p className="absolute bottom-2 left-2 right-2 text-[10px] font-semibold text-white truncate">
              {item.title}
            </p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/** Mouse-reactive parallax layer for hero text */
export function ParallaxHero({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });
  const rotateX = useTransform(sy, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-4, 4]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mx.set((e.clientX - rect.left) / rect.width - 0.5);
      my.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, [mx, my]);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
}

/** Stacked headline in Hormuud University logo green */
export function HuLogoHeadline({ lines }: { lines: string[] }) {
  const logoGreenStyle = {
    background: `linear-gradient(135deg, ${HU_BRAND_GREEN} 0%, ${HU_BRAND_GREEN_LIGHT} 45%, ${HU_BRAND_GREEN_BRIGHT} 100%)`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    textShadow: 'none',
    filter: 'drop-shadow(0 2px 12px rgba(22,128,85,0.55)) drop-shadow(0 0 40px rgba(34,181,115,0.25))',
  } as const;

  return (
    <span className="flex flex-col items-center gap-0.5 sm:gap-1">
      {lines.map((line, i) => (
        <motion.span
          key={line}
          initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.12 * i, duration: 0.55, ease: 'easeOut' }}
          className="block text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none"
          style={logoGreenStyle}
        >
          {line}
        </motion.span>
      ))}
    </span>
  );
}

/** Animated word-by-word headline */
export function AnimatedHeadline({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <span className="inline-flex flex-wrap justify-center gap-x-2 gap-y-1">
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.08 * i, duration: 0.5, ease: 'easeOut' }}
          className="inline-block"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/** Pulsing glow ring behind logo */
export function PulsingLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative inline-flex">
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: `${HU_BRAND_GREEN}55` }}
        animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.img
        src={src}
        alt={alt}
        className="relative w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-lg"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/** Scroll-driven counter strip */
export function LiveStats({ light = false }: { light?: boolean }) {
  const stats = [
    { label: 'Student teams', value: '500+' },
    { label: 'Projects submitted', value: '1,200+' },
    { label: 'Teachers connected', value: '80+' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-8">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 + i * 0.15 }}
          className="text-center"
        >
          <motion.p
            className="text-2xl sm:text-3xl font-extrabold"
            style={{ color: light ? HU_BRAND_GREEN : 'white' }}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
          >
            {s.value}
          </motion.p>
          <p className={`text-xs mt-0.5 font-medium ${light ? 'text-gray-500' : 'text-white/55'}`}>{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

/** Vertical auto-scrolling photo column */
export function VerticalPhotoStream({ items }: { items: AppImageItem[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % items.length), 3500);
    return () => clearInterval(t);
  }, [items.length]);

  const visible = [
    items[index % items.length],
    items[(index + 1) % items.length],
    items[(index + 2) % items.length],
  ];

  return (
    <div className="relative h-full min-h-[280px] overflow-hidden rounded-2xl">
      {visible.map((item, i) => (
        <motion.div
          key={`${item.id}-${index}-${i}`}
          className="absolute inset-x-0 h-[calc(33.33%-4px)] rounded-xl overflow-hidden border border-white/15"
          style={{ top: `${i * 34}%` }}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1 - i * 0.15, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.6 }}
        >
          <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
        </motion.div>
      ))}
    </div>
  );
}
