import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Rocket,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const GH_REPO = "richardbrownmiami-commits/devforge-ai";

function getGHToken() {
  return (
    JSON.parse(localStorage.getItem("bf_settings") || "{}").githubToken ||
    """"
  );
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

function duration(start: string, end: string | null): string {
  if (!end) return "running...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

interface Run {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  event: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  run_number: number;
  head_branch: string;
}

export function DeployLogPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const token = getGHToken();
      const res = await fetch(
        `https://api.github.com/repos/${GH_REPO}/actions/runs?per_page=20`,
        { headers: { Authorization: `token ${token}` } },
      );
      if (!res.ok) throw new Error("GitHub API error");
      const data = await res.json();
      setRuns(data.workflow_runs || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load deploy log");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 60000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  const triggerDeploy = async () => {
    setDeploying(true);
    try {
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
      if (res.ok || res.status === 204) {
        toast.success("Deploy triggered! Refreshing in 5s...");
        setTimeout(fetchRuns, 5000);
      } else {
        const e = await res.json();
        toast.error(e.message || "Trigger failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setDeploying(false);
  };

  const StatusBadge = ({
    status,
    conclusion,
  }: { status: string; conclusion: string | null }) => {
    const effective = conclusion || status;
    if (effective === "success")
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
          <CheckCircle className="w-3 h-3" />
          Success
        </span>
      );
    if (effective === "failure")
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    if (effective === "in_progress")
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" />
          Running
        </span>
      );
    if (effective === "queued")
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" />
          Queued
        </span>
      );
    if (effective === "cancelled")
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/10 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3" />
          Cancelled
        </span>
      );
    return (
      <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/10">
        {effective}
      </span>
    );
  };

  const cardStyle = {
    background: "oklch(0.10 0.025 280)",
    border: "1px solid oklch(0.20 0.08 280)",
  };
  const accentColor = "oklch(0.65 0.25 280)";

  return (
    <div
      className="p-4 md:p-6 space-y-5 max-w-3xl"
      data-ocid="admin.deploy_log.page"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Deploy Log</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-refresh every 60s
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchRuns}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{
              background: "oklch(0.55 0.25 280 / 0.15)",
              border: "1px solid oklch(0.55 0.25 280 / 0.3)",
              color: accentColor,
            }}
            data-ocid="admin.deploy_log.refresh_button"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={triggerDeploy}
            disabled={deploying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "oklch(0.55 0.25 280)" }}
            data-ocid="admin.deploy_log.primary_button"
          >
            {deploying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Rocket className="w-3.5 h-3.5" />
            )}
            Deploy Now
          </button>
        </div>
      </div>

      {loading && runs.length === 0 ? (
        <div
          className="flex items-center justify-center py-16"
          data-ocid="admin.deploy_log.loading_state"
        >
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: accentColor }}
          />
        </div>
      ) : runs.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-xl"
          style={cardStyle}
          data-ocid="admin.deploy_log.empty_state"
        >
          <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No deploy runs found</p>
          <p className="text-xs text-muted-foreground mt-1">
            GitHub Actions workflow may not be set up
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <div
            className="divide-y"
            style={{ borderColor: "oklch(0.18 0.05 280)" }}
          >
            {runs.map((run, i) => (
              <div
                key={run.id}
                className="flex items-start gap-4 px-4 py-3"
                data-ocid={`admin.deploy_log.item.${i + 1}`}
              >
                <div className="shrink-0 mt-0.5">
                  <StatusBadge
                    status={run.status}
                    conclusion={run.conclusion}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-medium text-foreground">
                      {run.name}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      #{run.run_number}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: "oklch(0.15 0.04 280)",
                        color: "oklch(0.55 0.10 280)",
                      }}
                    >
                      {run.event}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {timeAgo(run.created_at)} ·{" "}
                    {duration(run.created_at, run.updated_at)} ·{" "}
                    {run.head_branch}
                  </p>
                </div>
                <a
                  href={run.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="View on GitHub"
                  data-ocid={`admin.deploy_log.link.${i + 1}`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
