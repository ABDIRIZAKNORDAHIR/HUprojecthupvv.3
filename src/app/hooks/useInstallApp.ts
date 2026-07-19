import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function useInstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferred(e);
      setCanInstall(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') {
        setDeferred(null);
        setCanInstall(false);
      }
      return true;
    }
    return false;
  }, [deferred]);

  return { install, installed, canInstall, hasNativePrompt: !!deferred };
}

export function getManualInstallSteps(): string[] {
  return [
    'Use normal Chrome (NOT Incognito) — install does not work in private mode.',
    'Look for the install icon in the Chrome address bar (computer with arrow).',
    'Or Chrome menu ⋮ → "Install ProjectHub…" or "Save and share" → Install.',
    'Or double-click INSTALL_APP.bat for a desktop app window.',
    'Phone: Chrome menu → "Add to Home screen".',
  ];
}

/** Chrome blocks PWA install in Incognito */
export async function isLikelyIncognito(): Promise<boolean> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota } = await navigator.storage.estimate();
      if (quota !== undefined && quota < 120_000_000) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
