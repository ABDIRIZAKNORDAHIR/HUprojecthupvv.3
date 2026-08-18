/** Shared Hormuud ProjectHub brand tokens.
 * Kept in sync with the public homepage and the verification CTA.
 */
export const HU_GREEN = '#10B981';
export const HU_GREEN_DARK = '#047857';
export const HU_GREEN_LIGHT = '#ECFDF5';
export const HU_NAVY = '#06301F';
export const HU_BLUE = '#0F766E';
export const HU_ADMIN = '#059669';

export const ROLE_THEME = {
  student: {
    accent: '#16A34A',
    dark: '#166534',
    secondary: '#84CC16',
    soft: '#F0FDF4',
    ink: '#12351F',
  },
  teacher: {
    accent: '#0F766E',
    dark: '#164E63',
    secondary: '#06B6D4',
    soft: '#ECFEFF',
    ink: '#102F3A',
  },
  admin: {
    accent: '#0F2D5C',
    dark: '#071D3D',
    secondary: '#10B981',
    soft: '#EFF6FF',
    ink: '#0B1F3A',
  },
} as const;

export const APP_HERO_GRADIENT =
  'linear-gradient(135deg, rgba(6,48,31,0.98) 0%, rgba(4,120,87,0.94) 58%, rgba(16,185,129,0.88) 100%)';

export const APP_AI_GRADIENT = `linear-gradient(135deg, ${HU_GREEN}, ${HU_BLUE})`;

export function roleAccent(role: 'student' | 'teacher' | 'admin'): string {
  return ROLE_THEME[role].accent;
}

export function roleActiveGradient(role: 'student' | 'teacher' | 'admin'): string {
  const theme = ROLE_THEME[role];
  return `linear-gradient(135deg, ${theme.dark} 0%, ${theme.accent} 72%, ${theme.secondary} 140%)`;
}
