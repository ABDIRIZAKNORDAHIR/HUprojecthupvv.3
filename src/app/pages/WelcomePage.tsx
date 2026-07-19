import { motion } from 'motion/react';
import { HomeNav } from '../components/HomeNav';
import { ProHeroBillboard } from '../components/ProHeroBillboard';
import { HomePortalCards } from '../components/HomePortalCards';
import { HomeGraphicKeys } from '../components/HomeGraphicKeys';
import { HomeWorkflowTimeline } from '../components/HomeWorkflowTimeline';
import { HomeFeatures } from '../components/HomeFeatures';
import { HomeFinalCTA } from '../components/HomeFinalCTA';
import { HomeFooter } from '../components/HomeFooter';
import { useWelcomeEffects } from '../hooks/useWelcomeEffects';
import { HU_BRAND_GREEN } from '../config/appImages';
import '../styles/welcome.css';

export function WelcomePage() {
  const { scrolled } = useWelcomeEffects();

  return (
    <div className="welcome-page welcome-page--pro-light">
      <div className="ph-scroll-progress" aria-hidden>
        <div className="ph-scroll-progress-bar" style={{ background: HU_BRAND_GREEN }} />
      </div>

      <motion.div
        className="ph-curtain ph-curtain--light"
        initial={{ y: 0 }}
        animate={{ y: '-100%' }}
        transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
        aria-hidden
      />

      <HomeNav scrolled={scrolled} />
      <ProHeroBillboard />

      <section id="portals" className="ph-section ph-section--light-portals">
        <div className="ph-section-inner">
          <motion.div
            className="ph-section-head"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="ph-section-kicker" style={{ color: HU_BRAND_GREEN }}>Portals</p>
            <h2 className="ph-section-title ph-section-title--ink">
              Choose your <span style={{ color: HU_BRAND_GREEN }}>role</span>
            </h2>
            <p className="ph-section-sub ph-section-sub--ink">
              Secure entry for students and teachers.
            </p>
          </motion.div>
          <HomePortalCards />
        </div>
      </section>

      <HomeGraphicKeys />

      <section className="ph-section ph-section--light-workflow">
        <div className="ph-section-inner">
          <HomeWorkflowTimeline />
        </div>
      </section>

      <section className="ph-section ph-section--light-features">
        <div className="ph-section-inner">
          <HomeFeatures />
        </div>
      </section>

      <HomeFinalCTA />
      <HomeFooter />
    </div>
  );
}
