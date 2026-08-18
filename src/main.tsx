import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./app/App.tsx";
import "./styles/index.css";

function showBootError(message: string) {
  const box = document.getElementById("boot-error");
  const msg = document.getElementById("boot-error-msg");
  if (box) box.style.display = "block";
  if (msg) msg.textContent = message;
}

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegistered() {
      console.info("ProjectHub install ready â€” use Install on the homepage or Chrome address bar.");
    },
    onRegisterError(err) {
      console.warn("Service worker registration failed:", err);
    },
  });
} else {
  // A service worker left over from a production build keeps serving its
  // precached bundle on the dev origin, so drop it and its caches, then reload
  // once so the tab picks up the current code instead of the stale one.
  void (async () => {
    const RELOAD_FLAG = 'projecthub:sw-cleanup-reloaded';
    let cleared = false;

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
      const results = await Promise.all(registrations.map((r) => r.unregister().catch(() => false)));
      cleared = results.some(Boolean);
    }

    if ('caches' in window) {
      const keys = await caches.keys().catch(() => [] as string[]);
      const results = await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
      cleared = cleared || results.some(Boolean);
    }

    if (cleared && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      location.reload();
    }
  })();
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  showBootError("Missing #root element in index.html");
} else {
  try {
    createRoot(rootEl).render(<App />);
  } catch (err) {
    showBootError(err instanceof Error ? err.message : String(err));
  }
}
