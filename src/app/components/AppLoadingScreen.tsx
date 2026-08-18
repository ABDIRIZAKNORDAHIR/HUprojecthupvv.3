import { BrandLogo } from './BrandLogo';
import { HU_BRAND_GREEN } from '../config/appImages';

export function AppLoadingScreen() {
  return <div className="app-loading-screen"><div className="app-loading-screen__orb" /><div className="app-loading-screen__content"><BrandLogo variant="loading" /><div className="app-loading-screen__line"><i style={{ background: HU_BRAND_GREEN }} /></div><p>Opening Hormuud ProjectHub</p></div></div>;
}
