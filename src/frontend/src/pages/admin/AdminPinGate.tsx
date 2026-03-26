import { Lock, Shield } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminPinGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<
    "loading" | "setup" | "locked" | "unlocked"
  >("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const storedPin = localStorage.getItem("bf_admin_pin");
    const lastUnlock = Number(
      localStorage.getItem("bf_admin_last_unlock") || "0",
    );
    const TIMEOUT = 60 * 60 * 1000; // 1 hour
    if (!storedPin) {
      setStatus("setup");
    } else if (Date.now() - lastUnlock < TIMEOUT) {
      setStatus("unlocked");
    } else {
      setStatus("locked");
    }
  }, []);

  const handleSetup = () => {
    if (pin.length < 4) return setErr("PIN must be at least 4 digits");
    if (pin !== confirmPin) return setErr("PINs do not match");
    localStorage.setItem("bf_admin_pin", pin);
    localStorage.setItem("bf_admin_last_unlock", Date.now().toString());
    setStatus("unlocked");
  };

  const handleUnlock = () => {
    const stored = localStorage.getItem("bf_admin_pin");
    if (pin === stored) {
      localStorage.setItem("bf_admin_last_unlock", Date.now().toString());
      setStatus("unlocked");
      setErr("");
    } else {
      setErr("Wrong PIN. Try again.");
      setPin("");
    }
  };

  if (status === "loading") return null;
  if (status === "unlocked") return <>{children}</>;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "oklch(0.06 0.025 280)" }}
    >
      <div
        className="w-80 p-7 rounded-2xl border space-y-5 shadow-2xl"
        style={{
          background: "oklch(0.10 0.025 280)",
          borderColor: "oklch(0.30 0.15 280 / 0.5)",
        }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "oklch(0.65 0.25 280 / 0.15)",
              border: "1px solid oklch(0.65 0.25 280 / 0.4)",
            }}
          >
            {status === "setup" ? (
              <Shield
                className="w-7 h-7"
                style={{ color: "oklch(0.65 0.25 280)" }}
              />
            ) : (
              <Lock
                className="w-7 h-7"
                style={{ color: "oklch(0.65 0.25 280)" }}
              />
            )}
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {status === "setup" ? "Setup Admin PIN" : "Admin Access"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {status === "setup"
              ? "Create a PIN to protect the admin panel"
              : "Enter PIN to access BrainForge Admin"}
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setErr("");
            }}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              (status === "setup" ? handleSetup() : handleUnlock())
            }
            placeholder={
              status === "setup" ? "Create PIN (4-6 digits)" : "• • • •"
            }
            maxLength={6}
            className="w-full rounded-lg px-3 py-2.5 text-center text-xl tracking-[0.4em] text-foreground focus:outline-none transition-colors"
            style={{
              background: "oklch(0.08 0.02 280)",
              border: "1px solid oklch(0.30 0.15 280 / 0.5)",
            }}
          />
          {status === "setup" && (
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, ""));
                setErr("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSetup()}
              placeholder="Confirm PIN"
              maxLength={6}
              className="w-full rounded-lg px-3 py-2.5 text-center text-xl tracking-[0.4em] text-foreground focus:outline-none transition-colors"
              style={{
                background: "oklch(0.08 0.02 280)",
                border: "1px solid oklch(0.30 0.15 280 / 0.5)",
              }}
            />
          )}
        </div>

        {err && <p className="text-xs text-red-400 text-center">{err}</p>}

        <button
          type="button"
          onClick={status === "setup" ? handleSetup : handleUnlock}
          disabled={pin.length < 4}
          className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "oklch(0.55 0.25 280)" }}
          data-ocid="admin.pin.submit_button"
        >
          {status === "setup" ? "Set PIN & Enter" : "Unlock Admin Panel"}
        </button>
      </div>
    </div>
  );
}
