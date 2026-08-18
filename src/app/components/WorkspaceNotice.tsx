import { Link } from 'react-router';
import { ShieldAlert, SearchX } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface WorkspaceNoticeProps {
  kind?: 'missing' | 'forbidden';
  title?: string;
  body?: string;
}

export function WorkspaceNotice({
  kind = 'missing',
  title,
  body,
}: WorkspaceNoticeProps) {
  const Icon = kind === 'forbidden' ? ShieldAlert : SearchX;
  return (
    <div className="workspace-notice">
      <BrandLogo variant="loading" className="workspace-notice__logo" />
      <span className="workspace-notice__icon" aria-hidden="true"><Icon size={22} /></span>
      <h1>{title || (kind === 'forbidden' ? 'This area is not available for your role' : 'This page is not available')}</h1>
      <p>
        {body || (kind === 'forbidden'
          ? 'ProjectHub only opens the screens that match your Hormuud University account.'
          : 'The address may be incomplete, or this screen may have moved.')}
      </p>
      <Link to="/" className="workspace-notice__btn">Return to dashboard</Link>
    </div>
  );
}
