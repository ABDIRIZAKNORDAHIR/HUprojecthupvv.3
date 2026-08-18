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

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
    setSupported(isSupported);
    if (!isSupported) return;

    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then(registration => registration.pushManager.getSubscription())
      .then(subscription => setSubscribed(Boolean(subscription)))
      .catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    setError(null);
    try {
      if (!supported) throw new Error('Push not supported in this browser');
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') throw new Error('Notification permission was not granted');

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

  return { supported, subscribed, permission, error, subscribe };
}
