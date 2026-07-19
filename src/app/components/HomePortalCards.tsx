import { useRef } from 'react';
import { Link } from 'react-router';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { GraduationCap, Briefcase, ArrowUpRight } from 'lucide-react';
import { APP_IMAGES, HU_BRAND_GREEN } from '../config/appImages';

function PortalPanel({
  to,
  title,
  line,
  image,
  icon: Icon,
  delay = 0,
}: {
  to: string;
  title: string;
  line: string;
  image: string;
  icon: typeof GraduationCap;
  delay?: number;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [2.5, -2.5]), { stiffness: 160, damping: 22 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-3.5, 3.5]), { stiffness: 160, damping: 22 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1200 }}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry }}>
        <Link
          ref={ref}
          to={to}
          className="welcome-portal-pro welcome-portal-pro--light"
          onMouseMove={onMove}
          onMouseLeave={() => { mx.set(0); my.set(0); }}
          style={{ ['--portal-accent' as string]: HU_BRAND_GREEN }}
        >
          <motion.img
            src={image}
            alt=""
            className="welcome-portal-pro-img"
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
          <div className="welcome-portal-pro-shade" />
          <div className="welcome-portal-pro-body">
            <span className="welcome-portal-pro-icon">
              <Icon size={18} />
            </span>
            <div>
              <p className="welcome-portal-pro-label">{line}</p>
              <h2 className="welcome-portal-pro-title">{title}</h2>
            </div>
            <span className="welcome-portal-pro-arrow">
              <ArrowUpRight size={18} />
            </span>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

export function HomePortalCards() {
  return (
    <div className="welcome-portals-pro">
      <PortalPanel
        to="/student"
        title="Student"
        line="Continue as"
        image={APP_IMAGES.studentPortal}
        icon={GraduationCap}
        delay={0}
      />
      <PortalPanel
        to="/teacher"
        title="Teacher"
        line="Continue as"
        image={APP_IMAGES.teacherPortal}
        icon={Briefcase}
        delay={0.08}
      />
    </div>
  );
}
