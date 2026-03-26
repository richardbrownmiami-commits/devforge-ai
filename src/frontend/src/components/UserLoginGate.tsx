import { LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { getUsers, setCurrentUser, simpleHash } from "../lib/userUtils";

export function UserLoginGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "skip" | "login">("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const users = getUsers();
    if (users.length === 0) { setStatus("skip"); return; } // No users = owner mode, skip
    const session = sessionStorage.getItem("bf_session_user");
    if (session && users.find(u => u.username === session)) {
      setStatus("skip"); // Already logged in
    } else {
      setStatus("login");
    }
  }, []);

  const handleLogin = () => {
    setErr("");
    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) return setErr("Username nahi mila.");
    if (user.passwordHash !== simpleHash(password)) return setErr("Password galat hai.");
    setCurrentUser(user.username);
    setStatus("skip");
  };

  if (status === "loading") return null;
  if (status === "skip") return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "oklch(0.06 0.02 280)" }}>
      <div className="w-80 p-7 rounded-2xl border space-y-5 shadow-2xl"
        style={{ background: "oklch(0.10 0.025 280)", borderColor: "oklch(0.30 0.15 280 / 0.5)" }}>
        {/* Logo */}
        <div className="text-center">
          <img src="/assets/generated/brainforge-icon-3d.dim_512x512.png" alt="BrainForge"
            className="w-14 h-14 rounded-2xl mx-auto mb-3 object-cover" />
          <h2 className="text-base font-semibold text-foreground">BrainForge</h2>
          <p className="text-xs text-muted-foreground mt-1">Login karo apne account se</p>
        </div>
        {/* Form */}
        <div className="space-y-2.5">
          <input type="text" value={username}
            onChange={e => { setUsername(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Username"
            className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none"
            style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.30 0.15 280 / 0.5)" }}
          />
          <input type="password" value={password}
            onChange={e => { setPassword(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none"
            style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.30 0.15 280 / 0.5)" }}
          />
        </div>
        {err && <p className="text-xs text-red-400 text-center">{err}</p>}
        <button type="button" onClick={handleLogin} disabled={!username || !password}
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
