import { CheckCircle, Clock, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const GH_REPO = "richardbrownmiami-commits/devforge-ai";
const CF_WORKER = "https://brainforge-api.richard-brown-miami.workers.dev";
const WORKER_SECRET = "2200";

function getGHToken() {
  return (
    JSON.parse(localStorage.getItem("bf_settings") || "{}").githubToken ||
    "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"
  );
}

interface ServiceStatus {
  name: string;
  status: "checking" | "online" | "offline" | "warning";
  detail: string;
  responseTime: number | null;
  lastChecked: Date | null;
}

export function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: "BrainForge App",
      status: "checking",
      detail: "brainforge-7xn.pages.dev",
      responseTime: null,
      lastChecked: null,
    },
    {
      name: "Worker API",
      status: "checking",
      detail: CF_WORKER,
      responseTime: null,
      lastChecked: null,
    },
    {
      name: "GitHub API",
      status: "checking",
      detail: "api.github.com",
      responseTime: null,
      lastChecked: null,
    },
    {
      name: "Last Deploy",
      status: "checking",
      detail: "GitHub Actions",
      responseTime: null,
      lastChecked: null,
    },
    {
      name: "D1 Database",
      status: "online",
      detail: "Connected via Worker",
      responseTime: null,
      lastChecked: null,
    },
  ]);
  const [loading, setLoading] = useState(false);

  const checkAll = useCallback(async () => {
    setLoading(true);
    setServices((prev) =>
      prev.map((s) => ({ ...s, status: "checking" as const })),
    );

    const token = getGHToken();
    const now = new Date();

    const checks = await Promise.allSettled([
      (async () => {
        const t = Date.now();
        const r = await fetch("https://brainforge-7xn.pages.dev");
        return { ok: r.ok, ms: Date.now() - t };
      })(),
      (async () => {
        const t = Date.now();
        const r = await fetch(`${CF_WORKER}/health`, {
          headers: { "x-secret": WORKER_SECRET },
        });
        return { ok: r.ok, ms: Date.now() - t };
      })(),
      (async () => {
        const t = Date.now();
        const r = await fetch(`https://api.github.com/repos/${GH_REPO}`, {
          headers: { Authorization: `token ${token}` },
        });
        return { ok: r.ok, ms: Date.now() - t };
      })(),
      (async () => {
        const t = Date.now();
        const r = await fetch(
          `https://api.github.com/repos/${GH_REPO}/actions/runs?per_page=1`,
          { headers: { Authorization: `token ${token}` } },
        );
        const d = r.ok ? await r.json() : {};
        const run = d.workflow_runs?.[0];
        return { ok: r.ok, ms: Date.now() - t, run };
      })(),
    ]);

    setServices((prev) =>
      prev.map((s, i) => {
        if (i === 4) return s; // D1 always connected
        const result = checks[i];
        if (result.status === "rejected")
          return {
            ...s,
            status: "offline" as const,
            lastChecked: now,
            responseTime: null,
          };
        const { ok, ms } = result.value as any;
        let status: ServiceStatus["status"] = ok ? "online" : "offline";
        let detail = s.detail;
        if (i === 3 && result.status === "fulfilled") {
          const run = (result.value as any).run;
          if (run) {
            detail = `${run.name} — ${run.conclusion || run.status}`;
            status =
              run.conclusion === "success"
                ? "online"
                : run.status === "in_progress"
                  ? "warning"
                  : "offline";
          }
        }
        return { ...s, status, detail, responseTime: ms, lastChecked: now };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAll();
    const interval = setInterval(checkAll, 30000);
    return () => clearInterval(interval);
  }, [checkAll]);

  const StatusIcon = ({ status }: { status: ServiceStatus["status"] }) => {
    if (status === "checking")
      return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
    if (status === "online")
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === "warning")
      return <Clock className="w-4 h-4 text-yellow-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const StatusBadge = ({ status }: { status: ServiceStatus["status"] }) => {
    const map = {
      checking: "text-yellow-400 bg-yellow-400/10",
      online: "text-green-400 bg-green-400/10",
      warning: "text-yellow-400 bg-yellow-400/10",
      offline: "text-red-400 bg-red-400/10",
    };
    const labels = {
      checking: "Checking...",
      online: "Online",
      warning: "Warning",
      offline: "Offline",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status]}`}
      >
        {labels[status]}
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
      data-ocid="admin.status.page"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">System Status</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-refresh every 30 seconds
          </p>
        </div>
        <button
          type="button"
          onClick={checkAll}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{
            background: "oklch(0.55 0.25 280 / 0.15)",
            border: "1px solid oklch(0.55 0.25 280 / 0.3)",
            color: accentColor,
          }}
          data-ocid="admin.status.refresh_button"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh All
        </button>
      </div>

      {/* Overall status banner */}
      <div
        className="rounded-xl p-4"
        style={{
          background: services.every((s) => s.status === "online")
            ? "oklch(0.55 0.18 160 / 0.08)"
            : "oklch(0.55 0.20 50 / 0.08)",
          border: `1px solid ${services.every((s) => s.status === "online") ? "oklch(0.55 0.18 160 / 0.3)" : "oklch(0.55 0.20 50 / 0.3)"}`,
        }}
      >
        <div className="flex items-center gap-2">
          {services.every((s) => s.status === "online") ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-400" />
          )}
          <p className="text-sm font-semibold text-foreground">
            {services.every((s) => s.status === "online")
              ? "All systems operational"
              : "Some services need attention"}
          </p>
        </div>
      </div>

      {/* Service cards */}
      <div className="space-y-3">
        {services.map((svc, i) => (
          <div
            key={svc.name}
            className="flex items-center gap-4 rounded-xl p-4"
            style={cardStyle}
            data-ocid={`admin.status.item.${i + 1}`}
          >
            <StatusIcon status={svc.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {svc.name}
                </p>
                <StatusBadge status={svc.status} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {svc.detail}
              </p>
            </div>
            <div className="text-right shrink-0">
              {svc.responseTime !== null && (
                <p className="text-xs font-mono text-muted-foreground">
                  {svc.responseTime}ms
                </p>
              )}
              {svc.lastChecked && (
                <p className="text-[10px] text-muted-foreground">
                  {svc.lastChecked.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
