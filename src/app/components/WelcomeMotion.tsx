import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

/** Scroll-triggered reveal used by every welcome section. */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = '',
  as = 'div',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer';
}) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial={reduceMotion ? undefined : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}

/** Counts up once the number scrolls into view. */
export function CountUp({
  to,
  suffix = '',
  duration = 1400,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [value, setValue] = useState(reduceMotion ? to : 0);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(to * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduceMotion, to, duration]);

  return <span ref={ref}>{value}{suffix}</span>;
}

/** Headline that animates word by word. */
export function AnimatedHeadline({ text, accentFrom }: { text: string; accentFrom?: number }) {
  const reduceMotion = useReducedMotion();
  const words = text.split(' ');

  return (
    <h1 className="wx-hero__title">
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className={accentFrom !== undefined && index >= accentFrom ? 'wx-hero__title-accent' : undefined}
          initial={reduceMotion ? undefined : { opacity: 0, y: 24, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.15 + index * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}{' '}
        </motion.span>
      ))}
    </h1>
  );
}
