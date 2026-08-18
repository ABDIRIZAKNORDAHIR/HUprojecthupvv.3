import { BrandLogo } from './BrandLogo';

export function PageLoader({ label = 'Opening this page' }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <BrandLogo variant="loading" className="page-loader__logo" />
      <div className="page-loader__line" aria-hidden="true"><i /></div>
      <p>{label}</p>
    </div>
  );
}
