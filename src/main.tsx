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

registerSW({
  immediate: true,
  onRegistered() {
    console.info("ProjectHub install ready — use Install on the homepage or Chrome address bar.");
  },
  onRegisterError(err) {
    console.warn("Service worker registration failed:", err);
  },
});

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
