import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { APP_GALLERY, HU_BRAND_GREEN } from '../config/appImages';

export function HomeGalleryMosaic() {
  const images = APP_GALLERY.slice(0, 6);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const shift = useTransform(scrollYProgress, [0, 1], [24, -24]);

  return (
    <section ref={ref} className="ph-gallery">
      <div className="ph-gallery-head">
        <p className="ph-section-kicker" style={{ color: HU_BRAND_GREEN }}>Campus</p>
        <h2 className="ph-section-title">Life at Hormuud</h2>
        <p className="ph-section-sub">The community behind every ProjectHub team.</p>
      </div>

      <motion.div className="ph-gallery-grid" style={{ y: shift }}>
        {images.map((src, i) => (
          <motion.figure
            key={src}
            className={`ph-gallery-cell ph-gallery-cell--${(i % 3) + 1}`}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.02 }}
          >
            <img src={src} alt="" loading="lazy" />
          </motion.figure>
        ))}
      </motion.div>
    </section>
  );
}
