import { useRef, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

interface MagneticLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
}

/** Subtle magnetic pull on hover — pure JS mouse tracking */
export function MagneticLink({ children, className = '', ...props }: MagneticLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = '';
  };

  return (
    <Link
      ref={ref}
      className={`magnetic-link ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      {...props}
    >
      {children}
    </Link>
  );
}
