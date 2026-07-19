import { useEffect, useState } from 'react';
import { Download, X, Monitor, Smartphone } from 'lucide-react';
import { HU_BRAND_GREEN } from '../config/appImages';
import { useInstallApp, getManualInstallSteps, isLikelyIncognito } from '../hooks/useInstallApp';

/** Banner + instructions to install ProjectHub as a desktop/mobile app (PWA) */
export function InstallAppPrompt() {
  const { install, installed, hasNativePrompt } = useInstallApp();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('projecthub_pwa_dismiss') === '1',
  );
  const [showHelp, setShowHelp] = useState(false);
  const [incognito, setIncognito] = useState(false);

  useEffect(() => {
    isLikelyIncognito().then(setIncognito);
  }, []);

  const dismiss = () => {
    localStorage.setItem('projecthub_pwa_dismiss', '1');
    setDismissed(true);
  };

  if (installed) return null;

  if (incognito) {
    return (
      <div className="install-app-banner install-app-banner--warn" role="alert">
        <div className="install-app-banner-inner">
          <Monitor size={22} style={{ color: '#b45309', flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <p className="install-app-title">Install requires normal Chrome</p>
            <p className="install-app-text">
              Close Incognito. Run START_HERE.bat again, or open{' '}
              <strong>http://localhost:5180/</strong> in a regular Chrome window.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (dismissed && !showHelp) return null;

  const handleInstall = async () => {
    const ok = await install();
    if (!ok) setShowHelp(true);
  };

  return (
    <div className="install-app-banner" role="dialog" aria-label="Install ProjectHub">
      <div className="install-app-banner-inner">
        <Monitor size={22} style={{ color: HU_BRAND_GREEN, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="install-app-title">Install the real ProjectHub app</p>
          <p className="install-app-text">
            {hasNativePrompt
              ? 'Own icon on your desktop or phone — full screen, no browser tabs.'
              : 'Phone: Chrome → Install app. PC: use BUILD_REAL_APP.bat for Hormuud ProjectHub.exe.'}
          </p>
          {showHelp && (
            <ul className="install-app-help-list">
              {getManualInstallSteps().map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" onClick={handleInstall} className="install-app-btn install-app-btn--primary">
          <Download size={16} />
          Install
        </button>
        {!dismissed && (
          <button type="button" onClick={dismiss} className="install-app-btn install-app-btn--ghost" aria-label="Dismiss">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Compact install button for footer / settings */
export function InstallAppButton({ className = '' }: { className?: string }) {
  const { install, installed, hasNativePrompt } = useInstallApp();
  const [showHelp, setShowHelp] = useState(false);

  if (installed) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${className}`} style={{ color: HU_BRAND_GREEN }}>
        <Smartphone size={14} /> App installed
      </span>
    );
  }

  const onClick = async () => {
    const ok = await install();
    if (!ok) setShowHelp((v) => !v);
  };

  return (
    <div className={className}>
      <button type="button" onClick={onClick} className="install-app-footer-btn">
        <Download size={14} />
        {hasNativePrompt ? 'Install app' : 'How to install app'}
      </button>
      {showHelp && (
        <ul className="install-app-help-list mt-2">
          {getManualInstallSteps().map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
