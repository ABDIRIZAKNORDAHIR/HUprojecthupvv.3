import { motion, useReducedMotion } from 'motion/react';
import { HuImage } from './HuImage';

export function LivingOrbs() {
  const reduced = useReducedMotion();
  return (
    <div className="hu-living-orbs" aria-hidden>
      <motion.span animate={reduced ? {} : { x: [0, 24, 0], y: [0, -20, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.span animate={reduced ? {} : { x: [0, -20, 0], y: [0, 20, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} />
    </div>
  );
}

export function GreenAmbient() {
  return <div className="hu-green-ambient" aria-hidden />;
}

interface HeroShowcaseProps {
  src: string;
  alt: string;
  title: string;
  caption: string;
}

export function HeroShowcase({ src, alt, title, caption }: HeroShowcaseProps) {
  return (
    <div className="hu-hero-showcase">
      <HuImage imageKey="campus" src={src} alt={alt} />
      <div className="hu-hero-showcase-shade" />
      <div className="hu-hero-showcase-copy">
        <span>Hormuud University</span>
        <strong>{title}</strong>
        <p>{caption}</p>
      </div>
    </div>
  );
}