
// Global error logger for admin error log
window.addEventListener("error", (e) => {
  try {
    const log = JSON.parse(localStorage.getItem("bf_error_log") || "[]");
    log.unshift({ message: e.message, stack: e.error?.stack, url: e.filename, line: e.lineno, timestamp: new Date().toISOString() });
    localStorage.setItem("bf_error_log", JSON.stringify(log.slice(0, 100)));
  } catch {}
});
window.addEventListener("unhandledrejection", (e) => {
  try {
    const log = JSON.parse(localStorage.getItem("bf_error_log") || "[]");
    log.unshift({ message: String(e.reason), stack: e.reason?.stack, url: "promise", timestamp: new Date().toISOString() });
    localStorage.setItem("bf_error_log", JSON.stringify(log.slice(0, 100)));
  } catch {}
});

import ReactDOM from "react-dom/client";
// ICP removed - app uses Worker API and localStorage
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

// Apply saved theme before render to avoid flash
(function () {
  const saved = localStorage.getItem("bf_theme");
  if (saved === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    // Default to dark mode
    document.documentElement.classList.add("dark");
    if (!saved) localStorage.setItem("bf_theme", "dark");
  }
})();

// PIN lock enforcement
(function () {
  try {
    const settings = JSON.parse(localStorage.getItem("bf_settings") || "{}");
    if (!settings.pinEnabled || !settings.pinCode) return;

    const timeoutMs = (settings.sessionTimeout || 30) * 60 * 1000;
    const lastActive = Number(localStorage.getItem("bf_last_active") || "0");
    const now = Date.now();

    if (now - lastActive > timeoutMs && lastActive !== 0) {
      // Session expired -- prompt for PIN
      const entered = window.prompt("BrainForge is locked. Enter PIN:");
      if (entered !== settings.pinCode) {
        document.body.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#fff;font-family:monospace;flex-direction:column;gap:12px">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <p style="color:#ef4444;font-size:14px">Incorrect PIN. Reload to try again.</p>
          </div>`;
        throw new Error("PIN locked");
      }
    }
    // Update last active
    localStorage.setItem("bf_last_active", String(now));
    // Refresh last active on user interaction
    document.addEventListener("click", () => localStorage.setItem("bf_last_active", String(Date.now())), { passive: true });
    document.addEventListener("keydown", () => localStorage.setItem("bf_last_active", String(Date.now())), { passive: true });
  } catch (e: any) {
    if (e?.message === "PIN locked") throw e;
    // Ignore other errors (e.g. JSON parse)
  }
})();

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
      <App />
  </QueryClientProvider>,
);
