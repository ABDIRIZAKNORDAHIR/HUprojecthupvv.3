import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Link } from 'react-router';
import {
  GraduationCap, Briefcase, Bot, BarChart3, Globe, ArrowUpRight, ShieldCheck,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { HU_BRAND_GREEN, UNIVERSITY_NAME } from '../config/appImages';

function BentoTile({
  children,
  className = '',
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 150, damping: 20 });
  const sy = useSpring(my, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(sy, [0, 1], [6, -6]);
  const rotateY = useTransform(sx, [0, 1], [-6, 6]);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };

  return (
    <motion.div
      ref={ref}
      className={`home-bento-tile ${glow ? 'home-bento-tile--glow' : ''} ${className}`}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onMouseMove={onMove}
      onMouseLeave={() => { mx.set(0.5); my.set(0.5); }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

export function HomeBentoShowcase() {
  return (
    <section className="home-bento">
      <div className="text-center mb-10">
        <p className="ph-section-kicker" style={{ color: HU_BRAND_GREEN }}>Platform</p>
        <h2 className="ph-section-title">
          One system. <span style={{ color: '#86efac' }}>Every role.</span>
        </h2>
        <p className="ph-section-sub">
          Dashboards, AI review, and secure HU ID access — designed for {UNIVERSITY_NAME}.
        </p>
      </div>

      <div className="home-bento-grid">
        <BentoTile className="home-bento-tile--hero" glow>
          <div className="home-bento-aurora" aria-hidden />
          <BrandLogo variant="full" className="mb-3" />
          <p className="welcome-body text-sm mt-1 max-w-xs" style={{ color: HU_BRAND_GREEN, fontWeight: 600 }}>
            {UNIVERSITY_NAME}
          </p>
          <p className="welcome-body text-sm mt-3 max-w-xs">
            Proposals, teams, messaging, and teacher review — unified in ProjectHub.
          </p>
          <div className="home-bento-stats">
            <div><strong style={{ color: HU_BRAND_GREEN }}>HU ID</strong><span>Verified access</span></div>
            <div><strong style={{ color: '#93c5fd' }}>Athena</strong><span>AI assistance</span></div>
            <div><strong style={{ color: '#93c5fd' }}>Secure</strong><span>Role portals</span></div>
          </div>
        </BentoTile>

        <BentoTile>
          <Link to="/student" className="home-bento-link">
            <GraduationCap size={28} style={{ color: HU_BRAND_GREEN }} />
            <h3 className="welcome-heading text-lg mt-3">Student workspace</h3>
            <p className="welcome-body text-xs mt-2">Propose, invite, chat, submit</p>
            <ArrowUpRight size={18} className="home-bento-arrow" />
          </Link>
        </BentoTile>

        <BentoTile>
          <Link to="/teacher" className="home-bento-link">
            <Briefcase size={28} style={{ color: '#93c5fd' }} />
            <h3 className="welcome-heading text-lg mt-3">Teacher dashboard</h3>
            <p className="welcome-body text-xs mt-2">Review, approve, feedback</p>
            <ArrowUpRight size={18} className="home-bento-arrow" />
          </Link>
        </BentoTile>

        <BentoTile className="home-bento-tile--wide">
          <Bot size={24} style={{ color: HU_BRAND_GREEN }} />
          <h3 className="welcome-heading text-base mt-3">Athena AI Review</h3>
          <p className="welcome-body text-xs mt-1">
            Similarity checks and review signals — teachers retain the final decision.
          </p>
          <div className="home-bento-pills">
            <span>Similarity scan</span>
            <span>Batch analysis</span>
            <span>Collision alerts</span>
          </div>
        </BentoTile>

        <BentoTile>
          <BarChart3 size={24} style={{ color: HU_BRAND_GREEN }} />
          <h3 className="welcome-heading text-base mt-3">Progress tracking</h3>
          <p className="welcome-body text-xs mt-1">Status, scores, and feedback</p>
        </BentoTile>

        <BentoTile>
          <div className="flex items-center gap-2">
            <Globe size={22} style={{ color: '#93c5fd' }} />
            <ShieldCheck size={18} style={{ color: HU_BRAND_GREEN }} />
          </div>
          <h3 className="welcome-heading text-base mt-3">Project Atlas</h3>
          <p className="welcome-body text-xs mt-1">University project archive</p>
        </BentoTile>
      </div>
    </section>
  );
}
