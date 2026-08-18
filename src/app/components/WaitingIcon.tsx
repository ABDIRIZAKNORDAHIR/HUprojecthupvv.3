import { useId, type ReactNode } from 'react';
import { GraduationCap, Presentation, ShieldCheck } from 'lucide-react';
import '../styles/waiting.css';

export type WaitingTone = 'amber' | 'emerald' | 'teal' | 'violet';
export type WaitingRole = 'student' | 'teacher' | 'admin';

const ROLE_ICON = { student: GraduationCap, teacher: Presentation, admin: ShieldCheck };

/**
 * Hand-drawn hourglass: the sand drains, a grain falls, and the glass flips on
 * the loop restart — the reset back to 0deg is invisible because the shape is
 * vertically symmetric, which sells the flip without a second keyframe track.
 */
export function WaitingMark({ size = 18, tone = 'amber', className = '', style }: {
  size?: number;
  tone?: WaitingTone;
  className?: string;
  style?: React.CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      className={`wmark wmark--${tone} ${className}`.trim()}
      width={size}
      height={size}
      style={style}
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-sand`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="wmark__sand-a" />
          <stop offset="100%" className="wmark__sand-b" />
        </linearGradient>
        <clipPath id={`${uid}-drain`}>
          <rect className="wmark__drain" x="4" y="4" width="16" height="8" />
        </clipPath>
        <clipPath id={`${uid}-fill`}>
          <rect className="wmark__fill" x="4" y="12" width="16" height="8" />
        </clipPath>
      </defs>

      <g className="wmark__glass">
        <path className="wmark__bulb" d="M7 4h10l-5 8Z" />
        <path className="wmark__bulb" d="M12 12l5 8H7Z" />

        <g clipPath={`url(#${uid}-drain)`}>
          <path d="M7 4h10l-5 8Z" fill={`url(#${uid}-sand)`} />
        </g>
        <g clipPath={`url(#${uid}-fill)`}>
          <path d="M12 12l5 8H7Z" fill={`url(#${uid}-sand)`} />
        </g>
        <rect className="wmark__grain" x="11.35" y="12.2" width="1.3" height="2.1" rx="0.65" />

        <path className="wmark__frame" d="M7 4h10l-5 8Z" />
        <path className="wmark__frame" d="M12 12l5 8H7Z" />
        <rect className="wmark__cap" x="5" y="2.3" width="14" height="1.9" rx="0.95" />
        <rect className="wmark__cap" x="5" y="19.8" width="14" height="1.9" rx="0.95" />
      </g>
    </svg>
  );
}

/** Inline status pill for lists, tables and cards. */
export function WaitingBadge({ children, tone = 'amber', size = 14, className = '' }: {
  children: ReactNode;
  tone?: WaitingTone;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`wbadge wbadge--${tone} ${className}`.trim()}>
      <WaitingMark size={size} tone={tone} />
      <span>{children}</span>
    </span>
  );
}

/** Large medallion for full-screen waiting states, e.g. account pending approval. */
export function WaitingMedallion({ role, tone = 'amber', caption }: {
  role?: WaitingRole;
  tone?: WaitingTone;
  caption?: string;
}) {
  const RoleIcon = role ? ROLE_ICON[role] : null;

  return (
    <div className={`wmedal wmedal--${tone}`}>
      <span className="wmedal__pulse" aria-hidden="true" />
      <span className="wmedal__ring" aria-hidden="true" />
      <span className="wmedal__core">
        <WaitingMark size={38} tone={tone} />
      </span>
      {RoleIcon && (
        <span className="wmedal__role" title={caption}>
          <RoleIcon size={14} strokeWidth={2.4} />
          {caption && <em>{caption}</em>}
        </span>
      )}
    </div>
  );
}
