import {
  CheckCircle,
  ClipboardList,
  Clock,
  ExternalLink,
  GitBranch,
  HardDrive,
  Loader2,
  RefreshCw,
  Rocket,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const GH_REPO = "richardbrownmiami-commits/devforge-ai";
const CF_WORKER = "https://brainforge-api.richard-brown-miami.workers.dev";
const WORKER_SECRET = "2200";

function getGHToken(): string {
  const s = JSON.parse(localStorage.getItem("bf_settings") || "{}");
  return s.githubToken || "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";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface CommitEntry {
  message: string;
  date: string;
  sha: string;
  author: string;
}

interface StatsState {
  liveStatus: "loading" | "online" | "offline";
  workerStatus: "loading" | "online" | "offline";
  lastCommit: { message: string; date: string; sha: string } | null;
  lastDeploy: {
    status: string;
    name: string;
    date: string;
    url: string;
  } | null;
  recentCommits: CommitEntry[];
  loading: boolean;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsState>({
    liveStatus: "loading",
    workerStatus: "loading",
    lastCommit: null,
    lastDeploy: null,
    recentCommits: [],
    loading: true,
  });

  const fetchAll = useCallback(async () => {
    setStats((p) => ({
      ...p,
      loading: true,
      liveStatus: "loading",
      workerStatus: "loading",
    }));
    const token = getGHToken();
    const headers = { Authorization: `token ${token}` };

    const [liveRes, workerRes, commitsRes, deploysRes] =
      await Promise.allSettled([
        fetch("https://brainforge-7xn.pages.dev")
          .then((r) => (r.ok ? "online" : "offline"))
          .catch(() => "offline"),
        fetch(`${CF_WORKER}/api/stats`, { headers: { "X-BrainForge-Secret": WORKER_SECRET } })
          .then((r) => (r.ok ? "online" : "offline"))
          .catch(() => "offline"),
        fetch(`https://api.github.com/repos/${GH_REPO}/commits?per_page=5`, {
          headers,
        })
          .then((r) => r.json())
          .catch(() => []),
        fetch(
          `https://api.github.com/repos/${GH_REPO}/actions/runs?per_page=1`,
          { headers },
        )
          .then((r) => r.json())
          .catch(() => ({ workflow_runs: [] })),
      ]);

    const liveStatus =
      liveRes.status === "fulfilled"
        ? (liveRes.value as "online" | "offline")
        : "offline";
    const workerStatus =
      workerRes.status === "fulfilled"
        ? (workerRes.value as "online" | "offline")
        : "offline";
    const commits =
      commitsRes.status === "fulfilled" && Array.isArray(commitsRes.value)
        ? commitsRes.value
        : [];
    const deployData =
      deploysRes.status === "fulfilled"
        ? deploysRes.value
        : { workflow_runs: [] };
    const runs = deployData?.workflow_runs || [];

    setStats({
      liveStatus,
      workerStatus,
      lastCommit: commits[0]
        ? {
            message: commits[0].commit.message.split("\n")[0],
            date: commits[0].commit.author.date,
            sha: commits[0].sha.slice(0, 7),
          }
        : null,
      lastDeploy: runs[0]
        ? {
            status: runs[0].conclusion || runs[0].status,
            name: runs[0].name,
            date: runs[0].created_at,
            url: runs[0].html_url,
          }
        : null,
      recentCommits: commits.map((c: any) => ({
        message: c.commit.message.split("\n")[0],
        date: c.commit.author.date,
        sha: c.sha.slice(0, 7),
        author: c.commit.author.name,
      })),
      loading: false,
    });
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const triggerDeploy = async () => {
    const token = getGHToken();
    const res = await fetch(
      `https://api.github.com/repos/${GH_REPO}/actions/workflows/deploy.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );
    if (res.ok || res.status === 204) toast.success("Deploy triggered!");
    else toast.error("Failed to trigger deploy");
  };

  const backupNow = async () => {
    const res = await fetch(`${CF_WORKER}/backup`, {
      method: "POST",
      headers: { "x-secret": WORKER_SECRET },
    });
    if (res.ok) toast.success("Backup triggered!");
    else toast.error("Backup failed");
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "loading")
      return (
        <span className="flex items-center gap-1 text-yellow-400 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading
        </span>
      );
    if (status === "online" || status === "success")
      return (
        <span className="flex items-center gap-1 text-green-400 text-xs">
          <CheckCircle className="w-3 h-3" />
          Online
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-red-400 text-xs">
        <XCircle className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const cardStyle = {
    background: "oklch(0.10 0.025 280)",
    border: "1px solid oklch(0.20 0.08 280)",
  };
  const accentColor = "oklch(0.65 0.25 280)";

  const quickActions = [
    {
      icon: Rocket,
      label: "Trigger Deploy",
      color: "oklch(0.65 0.20 160)",
      action: triggerDeploy,
      ocid: "admin.dashboard.deploy_button",
    },
    {
      icon: HardDrive,
      label: "Backup Now",
      color: "oklch(0.65 0.18 220)",
      action: backupNow,
      ocid: "admin.dashboard.backup_button",
    },
    {
      icon: GitBranch,
      label: "Sync GitHub",
      color: "oklch(0.65 0.18 280)",
      action: fetchAll,
      ocid: "admin.dashboard.sync_button",
    },
    {
      icon: ClipboardList,
      label: "View Issues",
      color: "oklch(0.65 0.18 50)",
      action: () => {
        window.location.href = "/admin/issues";
      },
      ocid: "admin.dashboard.issues_button",
    },
  ];

  return (
    <div
      className="p-4 md:p-6 space-y-6 max-w-5xl"
      data-ocid="admin.dashboard.page"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            BrainForge system overview
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAll}
          disabled={stats.loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{
            background: "oklch(0.55 0.25 280 / 0.15)",
            border: "1px solid oklch(0.55 0.25 280 / 0.3)",
            color: accentColor,
          }}
          data-ocid="admin.dashboard.refresh_button"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${stats.loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
            Live App
          </p>
          <StatusBadge status={stats.liveStatus} />
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
            Worker API
          </p>
          <StatusBadge status={stats.workerStatus} />
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
            Last Commit
          </p>
          {stats.lastCommit ? (
            <div>
              <p className="text-xs font-medium text-foreground truncate">
                {stats.lastCommit.message}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                <span className="font-mono opacity-50">{stats.lastCommit.sha}</span> · {timeAgo(stats.lastCommit.date)}
              </p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
            Last Deploy
          </p>
          {stats.lastDeploy ? (
            <StatusBadge status={stats.lastDeploy.status} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ icon: Icon, label, color, action, ocid }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="flex flex-col items-start gap-3 p-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `${color.replace(")", " / 0.08)")}`,
                border: `1px solid ${color.replace(")", " / 0.25)")}`,
                color,
              }}
              data-ocid={ocid}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium text-foreground">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Recent Commits
        </h2>
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          {stats.recentCommits.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {stats.loading ? "Loading..." : "No commits found"}
            </div>
          ) : (
            <div
              className="divide-y"
              style={{ borderColor: "oklch(0.18 0.05 280)" }}
            >
              {stats.recentCommits.map((c) => (
                <div
                  key={c.sha}
                  className="flex items-start gap-3 px-4 py-3"
                  data-ocid={`admin.commits.item.${c.sha}`}
                >
                  <code
                    className="text-[10px] font-mono shrink-0 mt-0.5"
                    style={{ color: accentColor }}
                  >
                    {c.sha}
                  </code>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">
                      {c.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {c.author} · {timeAgo(c.date)}
                    </p>
                  </div>
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer links */}
      <div className="flex gap-3">
        <a
          href="https://brainforge-7xn.pages.dev"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Live App
        </a>
        <a
          href={`https://github.com/${GH_REPO}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          GitHub Repo
        </a>
      </div>
    </div>
  );
}
