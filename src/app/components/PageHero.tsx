import { motion } from 'motion/react';
import { APP_IMAGES, getImageByUrl } from '../config/appImages';
import { APP_HERO_GRADIENT } from '../config/brandTheme';
import { ImageCaption } from './ImageCaption';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  image?: string;
  gradient?: string;
  children?: React.ReactNode;
  badge?: string;
  showImageCaption?: boolean;
}

export function PageHero({
  title,
  subtitle,
  image = APP_IMAGES.teamWork,
  gradient = APP_HERO_GRADIENT,
  children,
  badge,
  showImageCaption = false,
}: PageHeroProps) {
  const imageMeta = getImageByUrl(image);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden shadow-lg min-h-[150px] sm:min-h-[170px] group"
    >
      <motion.img
        src={image}
        alt={imageMeta ? `${imageMeta.title} — ${imageMeta.caption}` : ''}
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden={!imageMeta}
        loading="lazy"
        whileHover={{ scale: 1.04 }}
        transition={{ duration: 0.8 }}
      />
      <div className="absolute inset-0" style={{ background: gradient }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          {badge && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/20 text-white/90 mb-2">
              {badge}
            </span>
          )}
          <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-sm tracking-tight">{title}</h1>
          {subtitle && <p className="text-white/80 text-sm mt-1 max-w-xl">{subtitle}</p>}
          {showImageCaption && imageMeta && (
            <div className="mt-3 max-w-md hidden sm:block opacity-90">
              <ImageCaption item={imageMeta} variant="overlay" />
            </div>
          )}
        </div>
        {children}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </motion.div>
  );
}
