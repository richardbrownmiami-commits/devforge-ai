import { LogIn, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { getUsers, setCurrentUser, simpleHash, hasActiveSession, validateCurrentSession, logoutUser } from "../lib/userUtils";

export function UserLoginGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "skip" | "login" | "conflict">("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [conflictUser, setConflictUser] = useState("");

  useEffect(() => {
    const users = getUsers();
    if (users.length === 0) { setStatus("skip"); return; }
    const session = sessionStorage.getItem("bf_session_user");
    if (session && users.find(u => u.username === session)) {
      if (validateCurrentSession()) {
        setStatus("skip");
      } else {
        logoutUser();
        setStatus("login");
      }
    } else {
      setStatus("login");
    }

    // Poll every 30s to check if session was force-logged out by admin
    const interval = setInterval(() => {
      const currentUser = sessionStorage.getItem("bf_session_user");
      if (currentUser && !validateCurrentSession()) {
        logoutUser();
        setStatus("login");
        setErr("Tumhara session admin ne ya doosre device ne end kar diya.");
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const tryLogin = () => {
    setErr("");
    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) return setErr("Username nahi mila.");
    if (user.passwordHash !== simpleHash(password)) return setErr("Password galat hai.");

    // Check for active session on another device/browser
    if (hasActiveSession(user.username)) {
      setConflictUser(user.username);
      setStatus("conflict");
      return;
    }

    setCurrentUser(user.username);
    setStatus("skip");
  };

  const forceLogin = () => {
    // Override the existing session and login anyway
    setCurrentUser(conflictUser);
    setStatus("skip");
  };

  if (status === "loading") return null;
  if (status === "skip") return <>{children}</>;

  const boxStyle = {
    background: "oklch(0.10 0.025 280)",
    borderColor: "oklch(0.30 0.15 280 / 0.5)",
  };
  const inputStyle = {
    background: "oklch(0.08 0.02 280)",
    border: "1px solid oklch(0.30 0.15 280 / 0.5)",
  };

  if (status === "conflict") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "oklch(0.06 0.02 280)" }}>
        <div className="w-80 p-7 rounded-2xl border space-y-5 shadow-2xl" style={boxStyle}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "oklch(0.55 0.25 40 / 0.15)", border: "1px solid oklch(0.55 0.25 40 / 0.4)" }}>
              <AlertTriangle className="w-7 h-7" style={{ color: "oklch(0.75 0.25 60)" }} />
            </div>
            <h2 className="text-base font-semibold text-foreground">Session Active Hai</h2>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{conflictUser}</span> pehle se kisi device pe login hai.
            </p>
          </div>
          <div className="p-3 rounded-lg text-xs text-muted-foreground"
            style={{ background: "oklch(0.55 0.25 40 / 0.08)", border: "1px solid oklch(0.55 0.25 40 / 0.2)" }}>
            ⚠️ Agar continue karoge toh purana session automatically band ho jaayega.
          </div>
          <div className="space-y-2">
            <button type="button" onClick={forceLogin}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{ background: "oklch(0.55 0.25 40)" }}>
              Continue — Purana Session Band Karo
            </button>
            <button type="button" onClick={() => setStatus("login")}
              className="w-full py-2.5 rounded-xl text-sm transition-all"
              style={{ background: "oklch(0.12 0.03 280)", border: "1px solid oklch(0.25 0.08 280 / 0.5)", color: "oklch(0.6 0.05 280)" }}>
              Wapas Jao
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "oklch(0.06 0.02 280)" }}>
      <div className="w-80 p-7 rounded-2xl border space-y-5 shadow-2xl" style={boxStyle}>
        <div className="text-center">
          <img src="/assets/generated/brainforge-icon-3d.dim_512x512.png" alt="BrainForge"
            className="w-14 h-14 rounded-2xl mx-auto mb-3 object-cover" />
          <h2 className="text-base font-semibold text-foreground">BrainForge</h2>
          <p className="text-xs text-muted-foreground mt-1">Login karo apne account se</p>
        </div>
        <div className="space-y-2.5">
          <input type="text" value={username}
            onChange={e => { setUsername(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && tryLogin()}
            placeholder="Username"
            className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none"
            style={inputStyle}
          />
          <input type="password" value={password}
            onChange={e => { setPassword(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && tryLogin()}
            placeholder="Password"
            className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none"
            style={inputStyle}
          />
        </div>
        {err && <p className="text-xs text-red-400 text-center">{err}</p>}
        <button type="button" onClick={tryLogin} disabled={!username || !password}
          className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "oklch(0.55 0.25 280)" }}>
          <LogIn className="w-4 h-4" /> Login Karo
        </button>
        <p className="text-[10px] text-center text-muted-foreground">
          Account nahi hai? Admin se contact karo.
        </p>
      </div>
    </div>
  );
}
