import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  FolderKanban,
  Users,
  MessageSquare,
  ClipboardCheck,
  ArrowRight,
} from 'lucide-react';
import { HU_BRAND_GREEN } from '../config/appImages';

const steps = [
  { icon: FolderKanban, title: 'Propose', detail: 'Submit topic & abstract' },
  { icon: Users, title: 'Team', detail: 'Invite & organize members' },
  { icon: MessageSquare, title: 'Collaborate', detail: 'Chat, files, milestones' },
  { icon: ClipboardCheck, title: 'Review', detail: 'Teacher feedback & approval' },
];

export function HomeWorkflowTimeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.85;
      const end = vh * 0.15;
      const raw = (start - rect.top) / (start - end + rect.height * 0.5);
      setProgress(Math.max(0, Math.min(1, raw)));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section ref={sectionRef} className="home-workflow home-workflow--light">
      <div className="text-center mb-10">
        <p className="ph-section-kicker" style={{ color: HU_BRAND_GREEN }}>Workflow</p>
        <h2 className="ph-section-title ph-section-title--ink">
          From idea to <span style={{ color: HU_BRAND_GREEN }}>approval</span>
        </h2>
        <p className="ph-section-sub ph-section-sub--ink">
          A clear academic path — animated as you scroll.
        </p>
      </div>

      <div className="home-workflow-rail">
        <svg className="home-workflow-svg" viewBox="0 0 1000 8" preserveAspectRatio="none" aria-hidden>
          <line x1="0" y1="4" x2="1000" y2="4" className="home-workflow-line-bg" />
          <line
            x1="0" y1="4" x2="1000" y2="4"
            className="home-workflow-line-fill"
            style={{ strokeDashoffset: `${1000 * (1 - progress)}`, stroke: HU_BRAND_GREEN }}
          />
        </svg>

        <div className="home-workflow-steps">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const active = progress >= (i + 0.5) / steps.length;
            return (
              <motion.article
                key={step.title}
                className={`home-workflow-step ${active ? 'is-active' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
              >
                <div className="home-workflow-node">
                  <Icon size={18} />
                </div>
                <div className="home-workflow-card">
                  <span className="home-workflow-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="welcome-heading text-base">{step.title}</h3>
                  <p className="home-workflow-detail">{step.detail}</p>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="home-workflow-arrow" size={14} aria-hidden />
                )}
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
