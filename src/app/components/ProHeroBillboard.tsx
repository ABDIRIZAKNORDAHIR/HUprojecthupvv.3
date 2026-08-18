import { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from 'motion/react';
import {
  GraduationCap,
  Briefcase,
  ClipboardCheck,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router';
import { BrandLogo } from './BrandLogo';
import {
  APP_IMAGES,
  UNIVERSITY_NAME,
} from '../config/appImages';

const ease = [0.16, 1, 0.3, 1] as const;

export function ProHeroBillboard() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.1]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '10%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  const mx = useMotionValue(50);
  const my = useMotionValue(40);
  const sx = useSpring(mx, { stiffness: 50, damping: 24 });
  const sy = useSpring(my, { stiffness: 50, damping: 24 });
  const veil = useMotionTemplate`radial-gradient(46% 42% at ${sx}% ${sy}%, rgba(22,163,74,0.22), transparent 70%)`;

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  };

  return (
    <section ref={ref} className="ph-hero ph-hero--light" onMouseMove={onMove}>
      <div className="ph-hero-orbit ph-hero-orbit--a" aria-hidden />
      <div className="ph-hero-orbit ph-hero-orbit--b" aria-hidden />

      <div className="ph-hero-media ph-hero-media--panel" aria-hidden>
        <motion.img
          src={APP_IMAGES.campusGroup}
          alt=""
          className="ph-hero-img"
          style={{ y: imgY, scale: imgScale }}
        />
        <div className="ph-hero-dim ph-hero-dim--soft" />
        <motion.div className="ph-hero-veil" style={{ backgroundImage: veil }} />
      </div>

      <motion.div className="ph-hero-content ph-hero-content--light" style={{ y: contentY, opacity: contentOpacity }}>
        <motion.div
          className="ph-hero-brand-row"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease }}
        >
          <BrandLogo variant="xl" />
          <span className="ph-hero-badge">
            <ShieldCheck size={13} />
            Official platform
          </span>
        </motion.div>

        <motion.p
          className="ph-hero-uni ph-hero-uni--green"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.06, ease }}
        >
          {UNIVERSITY_NAME}
        </motion.p>

        <motion.h1
          className="ph-hero-title ph-hero-title--ink"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
        >
          ProjectHub
        </motion.h1>

        <motion.p
          className="ph-hero-sub ph-hero-sub--ink"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.18, ease }}
        >
          Academic project workspace for proposals, teams, and review.
        </motion.p>

        <motion.div
          className="ph-hero-ctas"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.26, ease }}
        >
          <Link to="/student" className="ph-btn ph-btn--green">
            <GraduationCap size={17} />
            Student
            <ArrowRight size={15} />
          </Link>
          <Link to="/teacher" className="ph-btn ph-btn--outline">
            <Briefcase size={17} />
            Teacher
          </Link>
        </motion.div>

        <motion.ul
          className="ph-hero-pills"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <li><ClipboardCheck size={13} /> Teacher review</li>
          <li><ShieldCheck size={13} /> HU ID</li>
          <li><GraduationCap size={13} /> Student</li>
          <li><Briefcase size={13} /> Teacher</li>
        </motion.ul>
      </motion.div>
    </section>
  );
}
