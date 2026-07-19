/** Shared Hormuud ProjectHub brand tokens */
export const HU_GREEN = '#16A34A';
export const HU_GREEN_DARK = '#15803d';
export const HU_GREEN_LIGHT = '#f0fdf4';
export const HU_NAVY = '#0F2D5C';
export const HU_BLUE = '#2563EB';
export const HU_ADMIN = '#7C3AED';

export const APP_HERO_GRADIENT =
  'linear-gradient(135deg, rgba(22,163,74,0.92) 0%, rgba(15,45,92,0.88) 55%, rgba(37,99,235,0.75) 100%)';

export const APP_AI_GRADIENT = `linear-gradient(135deg, ${HU_GREEN}, ${HU_BLUE})`;

export function roleAccent(role: 'student' | 'teacher' | 'admin'): string {
  if (role === 'admin') return HU_ADMIN;
  if (role === 'teacher') return HU_BLUE;
  return HU_GREEN;
}

export function roleActiveGradient(role: 'student' | 'teacher' | 'admin'): string {
  if (role === 'admin') return `linear-gradient(135deg, ${HU_ADMIN} 0%, #9333EA 100%)`;
  if (role === 'teacher') return `linear-gradient(135deg, ${HU_BLUE} 0%, #38BDF8 100%)`;
  return `linear-gradient(135deg, ${HU_GREEN} 0%, ${HU_GREEN_DARK} 100%)`;
}
