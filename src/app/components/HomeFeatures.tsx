import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'motion/react';
import {
  FolderKanban, Users, MessageSquare, Bot, ClipboardCheck, ShieldCheck, IdCard, BarChart3,
  FileSearch, Sparkles, Lock, Layers,
} from 'lucide-react';
import { HU_BRAND_GREEN } from '../config/appImages';

const capabilities = [
  { icon: IdCard, title: 'HU ID' },
  { icon: FolderKanban, title: 'Projects' },
  { icon: Users, title: 'Teams' },
  { icon: MessageSquare, title: 'Chat' },
  { icon: Bot, title: 'AI review' },
  { icon: ClipboardCheck, title: 'Workflow' },
  { icon: BarChart3, title: 'Progress' },
  { icon: ShieldCheck, title: 'Secure' },
  { icon: FileSearch, title: 'Atlas' },
  { icon: Sparkles, title: 'Insights' },
  { icon: Lock, title: 'Roles' },
  { icon: Layers, title: 'Archive' },
];

function SpotlightCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 200, damping: 25 });
  const sy = useSpring(my, { stiffness: 200, damping: 25 });
  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${sx}px ${sy}px, rgba(22,163,74,0.14), transparent 55%)`;

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  return (
    <motion.div
      ref={ref}
      className="home-feature-card home-feature-card--light"
      style={{ backgroundImage: spotlight }}
      onMouseMove={onMove}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}

export function HomeFeatures() {
  return (
    <section className="home-features home-features--light">
      <div className="text-center mb-10">
        <p className="ph-section-kicker" style={{ color: HU_BRAND_GREEN }}>Capabilities</p>
        <h2 className="ph-section-title ph-section-title--ink">
          Everything in <span style={{ color: HU_BRAND_GREEN }}>one place</span>
        </h2>
        <p className="ph-section-sub ph-section-sub--ink">
          Professional tools for students and faculty.
        </p>
      </div>
      <div className="home-features-grid home-features-grid--rich">
        {capabilities.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.035, duration: 0.45 }}
            >
              <SpotlightCard>
                <div className="home-feature-icon home-feature-icon--green">
                  <Icon size={20} style={{ color: HU_BRAND_GREEN }} />
                </div>
                <p className="portal-info-title">{item.title}</p>
              </SpotlightCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
