import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { APP_IMAGES, HU_BRAND_GREEN, HU_BRAND_NAVY } from '../config/appImages';

const chapters = [
  {
    image: APP_IMAGES.studentsStudy,
    label: '01',
    title: 'Propose with clarity',
    text: 'Structure topics and submissions against university standards.',
  },
  {
    image: APP_IMAGES.collaboration,
    label: '02',
    title: 'Build as a team',
    text: 'Coordinate work, keep milestones visible, move together.',
  },
  {
    image: APP_IMAGES.graduation,
    label: '03',
    title: 'Review with confidence',
    text: 'Teachers guide progress and close the academic loop.',
  },
];

export function HomeCampusChapter() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const bar = useTransform(scrollYProgress, [0.1, 0.9], ['0%', '100%']);

  return (
    <section ref={ref} className="ph-chapter" id="workspace">
      <div className="ph-chapter-head">
        <p className="ph-section-kicker" style={{ color: HU_BRAND_GREEN }}>Workspace</p>
        <h2 className="ph-section-title ph-section-title--dark">
          Built for the full
          <span style={{ color: HU_BRAND_NAVY }}> project lifecycle</span>
        </h2>
        <p className="ph-section-sub ph-section-sub--dark">
          From first proposal to final approval.
        </p>
        <div className="ph-chapter-progress" aria-hidden>
          <motion.span style={{ width: bar, background: `linear-gradient(90deg, ${HU_BRAND_GREEN}, ${HU_BRAND_NAVY})` }} />
        </div>
      </div>

      <div className="ph-chapter-stack">
        {chapters.map((c, i) => (
          <ChapterCard key={c.label} {...c} index={i} />
        ))}
      </div>
    </section>
  );
}

function ChapterCard({
  image,
  label,
  title,
  text,
  index,
}: {
  image: string;
  label: string;
  title: string;
  text: string;
  index: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [48, -48]);

  return (
    <motion.article
      ref={ref}
      className={`ph-chapter-card ${index % 2 === 1 ? 'ph-chapter-card--flip' : ''}`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="ph-chapter-visual">
        <motion.img src={image} alt="" style={{ y }} />
        <div className="ph-chapter-visual-edge" />
      </div>
      <div className="ph-chapter-copy">
        <span className="ph-chapter-num" style={{ color: HU_BRAND_GREEN }}>{label}</span>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </motion.article>
  );
}
