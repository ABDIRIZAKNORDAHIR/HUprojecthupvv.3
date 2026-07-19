import { motion } from 'motion/react';
import { Link } from 'react-router';
import { GraduationCap, Briefcase, ArrowRight, ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { HU_BRAND_GREEN, UNIVERSITY_NAME } from '../config/appImages';

export function HomeFinalCTA() {
  return (
    <section className="ph-cta ph-cta--light">
      <div className="ph-cta-pattern" aria-hidden />
      <motion.div
        className="ph-cta-inner"
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        <BrandLogo variant="hero" />
        <p className="ph-cta-uni ph-cta-uni--green">{UNIVERSITY_NAME}</p>
        <h2 className="ph-cta-title ph-cta-title--ink">Enter ProjectHub</h2>
        <p className="ph-cta-sub ph-cta-sub--ink">
          <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4, color: HU_BRAND_GREEN }} />
          Sign in with your role to continue.
        </p>
        <div className="ph-cta-actions">
          <Link to="/student" className="ph-btn ph-btn--green">
            <GraduationCap size={17} />
            Student
            <ArrowRight size={15} />
          </Link>
          <Link to="/teacher" className="ph-btn ph-btn--outline">
            <Briefcase size={17} />
            Teacher
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
