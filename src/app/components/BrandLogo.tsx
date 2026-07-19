import { HU_LOGO_URL } from '../config/appImages';

type BrandLogoVariant = 'full' | 'icon' | 'header' | 'hero' | 'xl' | 'loading';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  alt?: string;
}

const variantClass: Record<BrandLogoVariant, string> = {
  full: 'brand-logo brand-logo--full',
  icon: 'brand-logo brand-logo--icon',
  header: 'brand-logo brand-logo--header',
  hero: 'brand-logo brand-logo--hero',
  xl: 'brand-logo brand-logo--xl',
  loading: 'brand-logo brand-logo--loading',
};

export function BrandLogo({
  variant = 'full',
  className = '',
  alt = 'Hormuud ProjectHub — Hormuud University',
}: BrandLogoProps) {
  return (
    <img
      src={HU_LOGO_URL}
      alt={alt}
      className={`${variantClass[variant]} ${className}`.trim()}
      draggable={false}
    />
  );
}
