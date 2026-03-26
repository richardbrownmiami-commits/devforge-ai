import { BarChart2, Brain, FolderOpen, MessageSquare, Users, Zap } from "lucide-react";

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" }}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function AnalyticsPage() {
  // Collect data from localStorage
  const users = (() => { try { return JSON.parse(localStorage.getItem("bf_users") || "[]"); } catch { return []; } })();
  const activities = (() => { try { return JSON.parse(localStorage.getItem("bf_activity_log") || "[]"); } catch { return []; } })();
  const feedback = (() => { try { return JSON.parse(localStorage.getItem("bf_feedback") || "[]"); } catch { return []; } })();

  // Per-user project counts
  const allProjects: any[] = [];
  for (const u of users) {
    try {
      const ps = JSON.parse(localStorage.getItem(`bf_projects_${u.username}`) || "[]");
      allProjects.push(...ps.map((p: any) => ({ ...p, owner: u.username })));
    } catch {}
  }
  // Also owner projects
  try {
    const ownerPs = JSON.parse(localStorage.getItem("bf_projects") || "[]");
    allProjects.push(...ownerPs.map((p: any) => ({ ...p, owner: "owner" })));
  } catch {}

  // Message counts from chat storage
  let totalMessages = 0;
  const modelCounts: Record<string, number> = {};
  for (const u of users) {
    for (const p of allProjects.filter((x: any) => x.owner === u.username)) {
      try {
        const chat = JSON.parse(localStorage.getItem(`bf_chat_${u.username}_${p.name || p}`) || "[]");
        totalMessages += chat.length;
      } catch {}
    }
  }

  // Activity by day (last 7 days)
  const now = Date.now();
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    return d.toLocaleDateString("en", { weekday: "short" });
  });
  const actByDay = dayLabels.map((_, i) => {
    const dayStart = now - (6 - i) * 86400000;
    const dayEnd = dayStart + 86400000;
    return activities.filter((a: any) => {
      const t = new Date(a.timestamp).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
  });
  const maxAct = Math.max(...actByDay, 1);

  // Project per user
  const projPerUser = users.map((u: any) => ({
    name: u.username,
    count: allProjects.filter((p: any) => p.owner === u.username).length,
  })).sort((a: any, b: any) => b.count - a.count);

  // Recent activities (last 10)
  const recent = activities.slice(0, 10);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-teal-400" /> Analytics
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">BrainForge usage ka overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Users" value={users.length} color="oklch(0.65 0.25 280)" />
        <StatCard icon={FolderOpen} label="Projects" value={allProjects.length} color="oklch(0.65 0.20 160)" sub={`${(allProjects.length / Math.max(users.length,1)).toFixed(1)} avg/user`} />
        <StatCard icon={MessageSquare} label="AI Messages" value={totalMessages} color="oklch(0.65 0.25 220)" />
        <StatCard icon={Zap} label="Feedbacks" value={feedback.length} color="oklch(0.65 0.25 60)" sub={`${feedback.filter((f: any) => f.status === "open").length} open`} />
      </div>

      {/* Activity last 7 days */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" }}>
        <p className="text-sm font-semibold text-foreground">Activity — Last 7 Days</p>
        <div className="flex items-end gap-2 h-24">
          {actByDay.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-muted-foreground">{count || ""}</span>
              <div className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${Math.max(4, (count / maxAct) * 80)}px`,
                  background: count > 0 ? "oklch(0.55 0.25 280 / 0.7)" : "oklch(0.15 0.04 280)",
                }} />
              <span className="text-[9px] text-muted-foreground">{dayLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Projects per user */}
      {projPerUser.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid oklch(0.18 0.06 280)" }}>
            <p className="text-sm font-semibold text-foreground">Projects per User</p>
          </div>
          <div className="p-4 space-y-2">
            {projPerUser.map((u: any) => (
              <div key={u.name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 truncate">{u.name}</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: "oklch(0.15 0.04 280)" }}>
                  <div className="h-2 rounded-full" style={{
                    width: `${Math.max(4, (u.count / Math.max(...projPerUser.map((x: any) => x.count), 1)) * 100)}%`,
                    background: "oklch(0.55 0.25 280 / 0.7)",
                  }} />
                </div>
                <span className="text-xs font-medium text-foreground w-8 text-right">{u.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recent.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid oklch(0.18 0.06 280)" }}>
            <p className="text-sm font-semibold text-foreground">Recent Activity</p>
          </div>
          <div className="divide-y" style={{ borderColor: "oklch(0.15 0.05 280)" }}>
            {recent.map((a: any) => (
              <div key={a.id} className="px-4 py-2.5 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "oklch(0.55 0.25 280)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{a.username} · {a.action}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(a.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
