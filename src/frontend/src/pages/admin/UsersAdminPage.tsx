import { getActivityLog, getUsers, saveUsers, simpleHash, type BFUser } from "../../lib/userUtils";
import { Activity, Clock, Plus, Shield, Trash2, UserCheck, Users } from "lucide-react";
import { useState } from "react";

export function UsersAdminPage() {
  const [users, setUsers] = useState<BFUser[]>(() => getUsers());
  const [tab, setTab] = useState<"users" | "activity">("users");
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", email: "" });
  const [defaultOrKey, setDefaultOrKey] = useState(() => localStorage.getItem("bf_default_or_key") || "");
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  const activities = getActivityLog();

  const handleAdd = () => {
    setErr("");
    if (!newUser.username.trim()) return setErr("Username daalo");
    if (newUser.password.length < 4) return setErr("Password kam se kam 4 characters");
    if (users.find(u => u.username.toLowerCase() === newUser.username.toLowerCase())) return setErr("Username already exist karta hai");
    const updated = [...users, {
      username: newUser.username.trim(),
      passwordHash: simpleHash(newUser.password),
      email: newUser.email.trim() || undefined,
      createdAt: new Date().toISOString(),
    }];
    saveUsers(updated);
    setUsers(updated);
    setNewUser({ username: "", password: "", email: "" });
    setShowAdd(false);
  };

  const handleDelete = (username: string) => {
    if (!confirm(`"${username}" ko delete karo?`)) return;
    const updated = users.filter(u => u.username !== username);
    saveUsers(updated);
    setUsers(updated);
  };

  const handleResetPw = (username: string) => {
    const pw = prompt(`"${username}" ka naya password:`);
    if (!pw || pw.length < 4) return alert("Password kam se kam 4 characters");
    const updated = users.map(u => u.username === username ? { ...u, passwordHash: simpleHash(pw) } : u);
    saveUsers(updated);
    setUsers(updated);
    alert("Password reset ho gaya!");
  };

  const saveDefaultKey = () => {
    localStorage.setItem("bf_default_or_key", defaultOrKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const relTime = (ts?: string) => {
    if (!ts) return "Never";
    const d = Date.now() - new Date(ts).getTime();
    const m = Math.floor(d / 60000), h = Math.floor(m / 60), dy = Math.floor(h / 24);
    return dy > 0 ? `${dy}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : "Just now";
  };

  const userProjects = (username: string) => {
    try { return JSON.parse(localStorage.getItem(`bf_projects_${username}`) || "[]").length; } catch { return 0; }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2"><Users className="w-5 h-5" /> Users</h1>
        <p className="text-xs text-muted-foreground mt-1">Testers manage karo, activity dekho</p>
      </div>

      {/* Default OR Key */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "oklch(0.55 0.25 280 / 0.08)", border: "1px solid oklch(0.55 0.25 280 / 0.3)" }}>
        <p className="text-xs font-semibold" style={{ color: "oklch(0.75 0.25 280)" }}>🔑 Default OpenRouter Key (Testers ke liye)</p>
        <p className="text-[10px] text-muted-foreground">Yeh key testers ke liye pre-loaded hogi -- unhe apni key nahi daalni padegi.</p>
        <div className="flex gap-2">
          <input type="password" value={defaultOrKey} onChange={e => setDefaultOrKey(e.target.value)}
            placeholder="sk-or-xxxx..."
            className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
            style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.25 0.08 280 / 0.5)" }}
          />
          <button type="button" onClick={saveDefaultKey}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: "oklch(0.55 0.25 280)" }}>
            {saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "oklch(0.10 0.02 280)" }}>
        {[{ id: "users", label: "Users", icon: UserCheck }, { id: "activity", label: "Activity", icon: Activity }].map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id as any)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={tab === t.id ? { background: "oklch(0.55 0.25 280)", color: "white" } : { color: "oklch(0.55 0.05 280)" }}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === "users" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">{users.length} user(s) registered</p>
            <button type="button" onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ background: "oklch(0.55 0.25 280)" }}>
              <Plus className="w-3 h-3" /> Add User
            </button>
          </div>

          {showAdd && (
            <div className="rounded-xl p-4 space-y-2.5" style={{ background: "oklch(0.10 0.02 280)", border: "1px solid oklch(0.25 0.08 280 / 0.4)" }}>
              <p className="text-xs font-semibold text-foreground">Naya User Banao</p>
              {[
                { key: "username", placeholder: "Username", type: "text" },
                { key: "password", placeholder: "Password (4+ chars)", type: "password" },
                { key: "email", placeholder: "Email (optional)", type: "email" },
              ].map(f => (
                <input key={f.key} type={f.type} value={(newUser as any)[f.key]}
                  onChange={e => setNewUser(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
                  style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.20 0.05 280 / 0.5)" }}
                />
              ))}
              {err && <p className="text-xs text-red-400">{err}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={handleAdd}
                  className="flex-1 py-2 rounded-lg text-white text-xs font-medium"
                  style={{ background: "oklch(0.55 0.25 280)" }}>Create Karo</button>
                <button type="button" onClick={() => { setShowAdd(false); setErr(""); }}
                  className="px-3 py-2 rounded-lg text-xs text-muted-foreground"
                  style={{ background: "oklch(0.12 0.02 280)" }}>Cancel</button>
              </div>
            </div>
          )}

          {users.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Koi user nahi hai abhi. "Add User" se testers banao.</p>
            </div>
          ) : users.map(u => (
            <div key={u.username} className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: "oklch(0.10 0.02 280)", border: "1px solid oklch(0.20 0.05 280 / 0.4)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                style={{ background: "oklch(0.55 0.25 280 / 0.2)", color: "oklch(0.75 0.25 280)" }}>
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{u.username}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {relTime(u.lastActive)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{userProjects(u.username)} projects</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => handleResetPw(u.username)}
                  className="p-1.5 rounded-lg text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  style={{ background: "oklch(0.15 0.03 280)" }} title="Reset Password">
                  <Shield className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => handleDelete(u.username)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition-colors"
                  style={{ background: "oklch(0.15 0.03 280)" }} title="Delete User">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity Tab */}
      {tab === "activity" && (
        <div className="space-y-2">
          {activities.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Koi activity nahi abhi</p>
            </div>
          ) : activities.slice(0, 100).map(a => (
            <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: "oklch(0.09 0.02 280)", border: "1px solid oklch(0.18 0.04 280 / 0.4)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                style={{ background: "oklch(0.55 0.25 280 / 0.2)", color: "oklch(0.75 0.25 280)" }}>
                {a.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground">{a.username}</span>
                <span className="text-xs text-muted-foreground"> — {a.action}</span>
                {a.detail && <span className="text-xs text-muted-foreground"> ({a.detail})</span>}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{relTime(a.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
