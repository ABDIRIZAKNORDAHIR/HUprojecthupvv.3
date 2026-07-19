import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePushNotifications(enabled: boolean) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window,
    );
  }, []);

  const subscribe = useCallback(async () => {
    setError(null);
    try {
      if (!supported) throw new Error('Push not supported in this browser');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission denied');

      const { publicKey } = await api.getPushVapidKey();
      if (!publicKey) throw new Error('Push key unavailable');

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await api.subscribePush(sub.toJSON());
      setSubscribed(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push subscribe failed');
      setSubscribed(false);
      return false;
    }
  }, [supported]);

  useEffect(() => {
    if (!enabled || !supported) return;
    // Soft auto-prompt once per session after login
    const key = 'projecthub_push_asked';
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    const t = window.setTimeout(() => {
      subscribe().catch(() => {});
    }, 4000);
    return () => window.clearTimeout(t);
  }, [enabled, supported, subscribe]);

  return { supported, subscribed, error, subscribe };
}
