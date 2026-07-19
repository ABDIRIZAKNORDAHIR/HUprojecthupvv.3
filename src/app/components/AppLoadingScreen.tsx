import { BrandLogo } from './BrandLogo';
import { HU_BRAND_GREEN } from '../config/appImages';

export function AppLoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #ffffff, #f0fdf4)' }}
    >
      <div className="text-center px-6">
        <BrandLogo variant="loading" className="mb-4" />
        <div
          className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mt-6"
          style={{ borderColor: `${HU_BRAND_GREEN}30`, borderTopColor: HU_BRAND_GREEN }}
        />
        <p className="welcome-body text-sm mt-4">Loading Hormuud ProjectHub…</p>
      </div>
    </div>
  );
}
