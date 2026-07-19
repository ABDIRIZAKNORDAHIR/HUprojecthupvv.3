import { motion } from 'motion/react';
import { APP_IMAGES } from '../config/appImages';
import { HomeParticleCanvas } from './HomeParticleCanvas';

/** Shared full-page HU student photo — homepage + all auth portals */
export function StudentPhotoBackground() {
  return (
    <div className="brand-bg-student-wrap" aria-hidden>
      <motion.img
        src={APP_IMAGES.welcomeBg}
        alt=""
        className="brand-bg-student-img"
        initial={{ scale: 1.05 }}
        animate={{ scale: 1.12 }}
        transition={{ duration: 28, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />
      <HomeParticleCanvas />
      <div className="brand-bg-student-overlay" />
      <div className="brand-bg-student-vignette" />
      <div className="brand-bg-grid" />
    </div>
  );
}
