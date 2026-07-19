import { motion } from 'motion/react';
import { APP_IMAGES } from '../config/appImages';

const photos = [
  APP_IMAGES.campusGroup,
  APP_IMAGES.studentsStudy,
  APP_IMAGES.collaboration,
  APP_IMAGES.graduation,
  APP_IMAGES.laptopTeam,
  APP_IMAGES.campusFriends,
  APP_IMAGES.projectPlanning,
  APP_IMAGES.studentLaptop,
];

export function HomeImageRibbon() {
  const track = [...photos, ...photos];

  return (
    <section className="ph-ribbon" aria-label="Campus">
      <div className="ph-ribbon-track">
        {track.map((src, i) => (
          <motion.figure
            key={`${src}-${i}`}
            className="ph-ribbon-frame"
            whileHover={{ y: -6, scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            <img src={src} alt="" loading="lazy" />
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
