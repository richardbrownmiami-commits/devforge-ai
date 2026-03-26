import { getActivityLog, getUsers, saveUsers, simpleHash, getSessionRecord, forceLogoutUser, hasActiveSession, getTodayMessageCount, type BFUser } from "../../lib/userUtils";
import { Activity, AlertCircle, Brain, Clock, LogOut, Monitor, Plus, Shield, Trash2, UserCheck, Users, Wifi, WifiOff, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function UsersAdminPage() {
  const [users, setUsers] = useState<BFUser[]>(() => getUsers());
  const [tab, setTab] = useState<"users" | "sessions" | "memories" | "activity">("users");
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
    toast.success(`User "${newUser.username}" add ho gaya!`);
  };

  const handleDelete = (username: string) => {
    if (!confirm(`"${username}" ko delete karo?`)) return;
    const updated = users.filter(u => u.username !== username);
    saveUsers(updated);
    setUsers(updated);
    toast.success("User delete ho gaya");
  };

  const handleResetPw = (username: string) => {
    const pw = prompt(`"${username}" ka naya password:`);
    if (!pw || pw.length < 4) return alert("Password kam se kam 4 characters");
    const updated = users.map(u => u.username === username ? { ...u, passwordHash: simpleHash(pw) } : u);
    saveUsers(updated);
    setUsers(updated);
    toast.success("Password reset ho gaya!");
  };

  const handleForceLogout = (username: string) => {
    forceLogoutUser(username);
    toast.success(`${username} ka session end kar diya`);
  };

  const handleSetQuota = (username: string) => {
    const current = users.find(u => u.username === username);
    const limit = prompt(`${username} ka daily message limit daalo (0 = unlimited):`, String(current?.dailyMessageLimit || 0));
    if (limit === null) return;
    const maxP = prompt(`Max projects (0 = unlimited):`, String(current?.maxProjects || 0));
    if (maxP === null) return;
    const updated = users.map(u => u.username === username
      ? { ...u, dailyMessageLimit: parseInt(limit) || 0, maxProjects: parseInt(maxP) || 0 }
      : u
    );
    saveUsers(updated);
    setUsers(updated);
    toast.success(`Quota updated: ${limit === "0" ? "unlimited" : limit + " msgs/day"}`);
  };

  const saveDefaultKey = () => {
    localStorage.setItem("bf_default_or_key", defaultOrKey);
    setSaved(true);
    toast.success("Default key saved!");
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

  const cardStyle = { background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" };
  const accentColor = "oklch(0.65 0.25 280)";

  const TAB_ITEMS = [
    { id: "users" as const, label: "Users", icon: Users },
    { id: "sessions" as const, label: "Sessions", icon: Monitor },
    { id: "memories" as const, label: "Memories", icon: Brain },
    { id: "activity" as const, label: "Activity", icon: Activity },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2"><Users className="w-5 h-5" />Users & Sessions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Testers manage karo, sessions monitor karo</p>
        </div>
        {tab === "users" && (
          <button type="button" onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: "oklch(0.55 0.25 280 / 0.15)", border: "1px solid oklch(0.55 0.25 280 / 0.3)", color: accentColor }}>
            <Plus className="w-3.5 h-3.5" />
            Add User
          </button>
        )}
      </div>

      {/* Default OR Key */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "oklch(0.55 0.25 280 / 0.08)", border: "1px solid oklch(0.55 0.25 280 / 0.3)" }}>
        <p className="text-xs font-semibold" style={{ color: accentColor }}>🔑 Default OpenRouter Key (Testers ke liye)</p>
        <p className="text-[10px] text-muted-foreground">Yeh key testers ke liye pre-loaded hogi — unhe apni key nahi daalni padegi.</p>
        <div className="flex gap-2">
          <input type="password" value={defaultOrKey} onChange={e => setDefaultOrKey(e.target.value)}
            placeholder="sk-or-xxxx..."
            className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
            style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.30 0.15 280 / 0.5)" }}
          />
          <button type="button" onClick={saveDefaultKey}
            className="px-4 py-2 rounded-lg text-xs font-medium text-white"
            style={{ background: "oklch(0.55 0.25 280)" }}>
            {saved ? "✓" : "Save"}
          </button>
        </div>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
          <p className="text-sm font-semibold text-foreground">Naya User</p>
          {["username", "password", "email"].map(field => (
            <input key={field} type={field === "password" ? "password" : "text"}
              placeholder={field === "email" ? "Email (optional)" : field.charAt(0).toUpperCase() + field.slice(1)}
              value={(newUser as any)[field]}
              onChange={e => setNewUser(p => ({ ...p, [field]: e.target.value }))}
              className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
              style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.25 0.08 280 / 0.5)" }}
            />
          ))}
          {err && <p className="text-xs text-red-400">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "oklch(0.55 0.25 280)" }}>
              Add User
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
              style={{ background: "oklch(0.12 0.03 280)", border: "1px solid oklch(0.22 0.08 280)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.18 0.06 280)" }}>
        {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={tab === id ? { background: "oklch(0.55 0.25 280 / 0.2)", color: accentColor, border: "1px solid oklch(0.55 0.25 280 / 0.3)" } : { color: "oklch(0.55 0.05 280)", border: "1px solid transparent" }}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          {users.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">Koi user nahi -- "Add User" click karo</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "oklch(0.18 0.06 280)" }}>
              {users.map(u => {
                const active = hasActiveSession(u.username);
                const session = getSessionRecord(u.username);
                return (
                  <div key={u.username} className="p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ background: "oklch(0.55 0.25 280 / 0.15)", color: accentColor, border: "1px solid oklch(0.55 0.25 280 / 0.3)" }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{u.username}</p>
                        {active && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "oklch(0.50 0.20 160 / 0.15)", color: "oklch(0.65 0.20 160)", border: "1px solid oklch(0.50 0.20 160 / 0.3)" }}>
                            <Wifi className="w-2.5 h-2.5" />Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {userProjects(u.username)} projects · Last active: {relTime(session?.lastActive || u.lastActive)}
                        {u.email && ` · ${u.email}`}
                        {u.dailyMessageLimit ? ` · ${getTodayMessageCount(u.username)}/${u.dailyMessageLimit} msgs today` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {active && (
                        <button type="button" onClick={() => handleForceLogout(u.username)} title="Force logout"
                          className="p-1.5 rounded-lg transition-colors hover:bg-orange-500/15"
                          style={{ color: "oklch(0.65 0.20 50)" }}>
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button type="button" onClick={() => handleSetQuota(u.username)} title="Set quota"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        style={{ color: u.dailyMessageLimit ? "oklch(0.65 0.25 60)" : undefined }}>
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleResetPw(u.username)} title="Reset password"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDelete(u.username)} title="Delete user"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sessions tab */}
      {tab === "sessions" && (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          {users.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Koi users nahi</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "oklch(0.18 0.06 280)" }}>
              {users.map(u => {
                const session = getSessionRecord(u.username);
                const active = hasActiveSession(u.username);
                return (
                  <div key={u.username} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: "oklch(0.55 0.25 280 / 0.15)", color: accentColor }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{u.username}</span>
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                          style={active
                            ? { background: "oklch(0.50 0.20 160 / 0.15)", color: "oklch(0.65 0.20 160)", border: "1px solid oklch(0.50 0.20 160 / 0.3)" }
                            : { background: "oklch(0.15 0.03 280)", color: "oklch(0.5 0.05 280)", border: "1px solid oklch(0.22 0.06 280)" }
                          }>
                          {active ? <><Wifi className="w-2.5 h-2.5" />Online</> : <><WifiOff className="w-2.5 h-2.5" />Offline</>}
                        </span>
                      </div>
                      {active && (
                        <button type="button" onClick={() => handleForceLogout(u.username)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                          style={{ background: "oklch(0.55 0.25 25 / 0.12)", border: "1px solid oklch(0.55 0.25 25 / 0.3)", color: "oklch(0.65 0.25 30)" }}>
                          <LogOut className="w-3 h-3" />Force Logout
                        </button>
                      )}
                    </div>
                    {session ? (
                      <div className="ml-9 space-y-1">
                        <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>Login: {relTime(session.loginAt)} · Last active: {relTime(session.lastActive)}</span>
                        </div>
                        <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                          <Monitor className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="truncate max-w-xs">{session.deviceInfo}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="ml-9 text-[10px] text-muted-foreground">No session data</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Memories tab */}
      {tab === "memories" && (
        <div className="space-y-3">
          {users.length === 0 ? (
            <div className="rounded-xl p-8 text-center text-xs text-muted-foreground" style={cardStyle}>Koi users nahi</div>
          ) : users.map(u => {
            const userProjs = (() => {
              try { return JSON.parse(localStorage.getItem(`bf_projects_${u.username}`) || "[]"); } catch { return []; }
            })();
            return (
              <div key={u.username} className="rounded-xl overflow-hidden" style={cardStyle}>
                <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid oklch(0.18 0.06 280)" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "oklch(0.55 0.25 280 / 0.15)", color: accentColor }}>
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground">{u.username}</span>
                  <span className="text-[10px] text-muted-foreground">{userProjs.length} projects</span>
                </div>
                {userProjs.length === 0 ? (
                  <div className="px-4 py-3 text-[10px] text-muted-foreground">Koi projects nahi</div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "oklch(0.15 0.05 280)" }}>
                    {userProjs.map((p: any) => {
                      const memKey = `bf_memory_${u.username}_${p.name || p}`;
                      const mem = localStorage.getItem(memKey) || "";
                      return (
                        <div key={p.name || p} className="px-4 py-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Brain className="w-3 h-3 shrink-0" style={{ color: "oklch(0.60 0.20 280)" }} />
                            <span className="text-xs font-medium text-foreground">{p.name || p}</span>
                            <span className="text-[10px] text-muted-foreground">{mem.length} chars</span>
                          </div>
                          {mem ? (
                            <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap line-clamp-4 max-h-16 overflow-hidden rounded px-2 py-1.5"
                              style={{ background: "oklch(0.07 0.02 280)" }}>
                              {mem.substring(0, 300)}{mem.length > 300 ? "..." : ""}
                            </pre>
                          ) : (
                            <p className="text-[10px] text-muted-foreground italic">No memory yet</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Activity tab */}
      {tab === "activity" && (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          {activities.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">Koi activity nahi abhi</p>
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto" style={{ borderColor: "oklch(0.18 0.06 280)" }}>
              {activities.map(a => (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <UserCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: accentColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">{a.username} — {a.action}</p>
                    {a.detail && <p className="text-[10px] text-muted-foreground truncate">{a.detail}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{relTime(a.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
