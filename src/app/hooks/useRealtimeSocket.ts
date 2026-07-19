import { useEffect, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getToken } from '../api/client';

function socketUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (fromEnv?.trim()) {
    return fromEnv.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3004`;
    }
    return '';
  }
  return 'http://localhost:3004';
}

let shared: Socket | null = null;
let refCount = 0;

function acquireSocket(): Socket | null {
  const token = getToken();
  if (!token) return null;

  if (!shared) {
    const url = socketUrl();
    shared = io(url || undefined, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  } else {
    shared.auth = { token };
    if (!shared.connected) shared.connect();
  }
  refCount += 1;
  return shared;
}

function releaseSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && shared) {
    shared.disconnect();
    shared = null;
  }
}

export function getRealtimeSocket(): Socket | null {
  return shared;
}

export function useRealtimeSocket(enabled = true) {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const s = acquireSocket();
    if (!s) return;
    setSocket(s);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    if (s.connected) setConnected(true);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      releaseSocket();
      setSocket(null);
      setConnected(false);
    };
  }, [enabled]);

  const joinConversation = useCallback((conversationId: number) => {
    shared?.emit('conversation:join', conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: number) => {
    shared?.emit('conversation:leave', conversationId);
  }, []);

  return { socket, connected, joinConversation, leaveConversation };
}
