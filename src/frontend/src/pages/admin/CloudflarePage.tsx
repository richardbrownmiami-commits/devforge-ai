import { Activity, AlertTriangle, BarChart2, CheckCircle, Cloud, ExternalLink, Globe, Loader2, RefreshCw, Server, XCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const CF_WORKER = "https://brainforge-api.richard-brown-miami.workers.dev";
const WORKER_SECRET = "2200";
const GH_REPO = "richardbrownmiami-commits/devforge-ai";
const PAGES_URL = "https://brainforge-7xn.pages.dev";

function getGHToken() {
  return JSON.parse(localStorage.getItem("bf_settings") || "{}").githubToken || "";
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), dy = Math.floor(h / 24);
  return dy > 0 ? `${dy}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : "Just now";
}

interface ServiceCard {
  id: string;
  label: string;
  subtitle: string;
  status: "checking" | "online" | "degraded" | "offline";
  ping?: number | null;
  detail?: string;
  link?: string;
}

export function CloudflarePage() {
  const [cards, setCards] = useState<ServiceCard[]>([
    { id: "worker", label: "Cloudflare Worker", subtitle: CF_WORKER.replace("https://",""), status: "checking" },
    { id: "d1", label: "D1 Database", subtitle: "brainforge-db", status: "checking" },
    { id: "kv", label: "KV Store", subtitle: "Key-Value storage", status: "checking" },
    { id: "pages", label: "Cloudflare Pages", subtitle: "brainforge-7xn.pages.dev", status: "checking", link: PAGES_URL },
  ]);
  const [lastDeploy, setLastDeploy] = useState<{ status: string; date: string; url: string; duration?: number } | null>(null);
  const [buildHistory, setBuildHistory] = useState<Array<{ status: string; date: string; sha: string; duration?: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [cfToken, setCfToken] = useState(() => localStorage.getItem("bf_cf_api_token") || "");
  const [monthlyStats, setMonthlyStats] = useState<{ used: number; limit: number; remaining: number; runs: any[] } | null>(null);

  const cardStyle = { background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" };

  const updateCard = (id: string, updates: Partial<ServiceCard>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const checkAll = useCallback(async () => {
    setLoading(true);
    // Reset to checking
    setCards(prev => prev.map(c => ({ ...c, status: "checking" as const })));

    // 1. Worker ping
    const workerStart = Date.now();
    try {
      const res = await fetch(`${CF_WORKER}/api/stats`, {
        headers: { "X-BrainForge-Secret": WORKER_SECRET },
        signal: AbortSignal.timeout(8000),
      });
      const ping = Date.now() - workerStart;
      if (res.ok) {
        const data = await res.json();
        updateCard("worker", {
          status: "online",
          ping,
          detail: `${ping}ms · Tables: ${data.tables ?? "?"} · Rows: ${data.rows ?? "?"}`,
        });
        // D1 is connected if Worker responded with stats
        updateCard("d1", {
          status: data.tables !== undefined ? "online" : "degraded",
          detail: data.tables !== undefined
            ? `Connected · ${data.tables} tables · ${data.rows ?? "?"} rows · ${data.size ?? "?"}`
            : "Worker online but D1 stats missing",
        });
        // KV check
        try {
          const kvRes = await fetch(`${CF_WORKER}/api/kv`, {
            headers: { "X-BrainForge-Secret": WORKER_SECRET },
            signal: AbortSignal.timeout(5000),
          });
          updateCard("kv", {
            status: kvRes.ok ? "online" : "degraded",
            detail: kvRes.ok ? "KV namespace accessible" : `KV endpoint returned ${kvRes.status}`,
          });
        } catch {
          updateCard("kv", { status: "degraded", detail: "KV endpoint not configured in Worker" });
        }
      } else {
        updateCard("worker", { status: "offline", ping: null, detail: `HTTP ${res.status}` });
        updateCard("d1", { status: "offline", detail: "Worker offline — D1 unreachable" });
        updateCard("kv", { status: "offline", detail: "Worker offline" });
      }
    } catch {
      updateCard("worker", { status: "offline", ping: null, detail: "Connection failed / timeout" });
      updateCard("d1", { status: "offline", detail: "Worker offline" });
      updateCard("kv", { status: "offline", detail: "Worker offline" });
    }

    // 2. Pages + GitHub Actions
    try {
      const token = getGHToken();
      const runsRes = await fetch(
        `https://api.github.com/repos/${GH_REPO}/actions/runs?per_page=5`,
        { headers: { Authorization: `token ${token}` } }
      );
      if (runsRes.ok) {
        const runsData = await runsRes.json();
        const runs = runsData.workflow_runs || [];
        if (runs.length > 0) {
          const latest = runs[0];
          const isOnline = latest.conclusion === "success";
          const duration = latest.updated_at && latest.created_at
            ? Math.round((new Date(latest.updated_at).getTime() - new Date(latest.created_at).getTime()) / 1000)
            : undefined;
          updateCard("pages", {
            status: isOnline ? "online" : latest.status === "in_progress" ? "checking" : "degraded",
            detail: `${latest.conclusion || latest.status} · ${timeAgo(latest.created_at)}${duration ? ` · ${duration}s` : ""}`,
          });
          setLastDeploy({
            status: latest.conclusion || latest.status,
            date: latest.created_at,
            url: latest.html_url,
            duration,
          });
          setBuildHistory(runs.slice(0, 5).map((r: any) => ({
            status: r.conclusion || r.status,
            date: r.created_at,
            sha: r.head_sha?.slice(0, 7) || "?",
            duration: r.updated_at && r.created_at
              ? Math.round((new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 1000)
              : undefined,
          })));
        }
      }
    } catch {
      updateCard("pages", { status: "degraded", detail: "GitHub API error" });
    }

    // Fetch monthly deployment count
    try {
      const token = getGHToken();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      let page = 1, allRuns: any[] = [];
      while (true) {
        const res = await fetch(
          `https://api.github.com/repos/${GH_REPO}/actions/runs?per_page=100&page=${page}&created=>=${monthStart}`,
          { headers: { Authorization: `token ${token}` } }
        );
        if (!res.ok) break;
        const data = await res.json();
        const runs = data.workflow_runs || [];
        allRuns = [...allRuns, ...runs];
        if (runs.length < 100) break;
        page++;
      }
      const limit = 500; // Cloudflare Pages free tier
      const used = allRuns.length;
      setMonthlyStats({ used, limit, remaining: Math.max(0, limit - used), runs: allRuns });
    } catch {}

    setLoading(false);
  }, []);

  useEffect(() => { checkAll(); }, [checkAll]);

  const StatusIcon = ({ status }: { status: ServiceCard["status"] }) => {
    if (status === "checking") return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
    if (status === "online") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === "degraded") return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const statusBg: Record<string, string> = {
    online: "oklch(0.50 0.20 160 / 0.12)",
    degraded: "oklch(0.55 0.25 60 / 0.12)",
    offline: "oklch(0.55 0.25 25 / 0.12)",
    checking: "oklch(0.55 0.25 280 / 0.08)",
  };
  const statusBorder: Record<string, string> = {
    online: "oklch(0.50 0.20 160 / 0.35)",
    degraded: "oklch(0.55 0.25 60 / 0.35)",
    offline: "oklch(0.55 0.25 25 / 0.35)",
    checking: "oklch(0.55 0.25 280 / 0.25)",
  };

  const ICONS: Record<string, React.ReactNode> = {
    worker: <Server className="w-5 h-5" />,
    d1: <Activity className="w-5 h-5" />,
    kv: <Zap className="w-5 h-5" />,
    pages: <Globe className="w-5 h-5" />,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Cloud className="w-5 h-5 text-orange-400" />
            Cloudflare Status
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Worker, D1, KV, Pages -- sab ka live status</p>
        </div>
        <button type="button" onClick={checkAll} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-all"
          style={{ background: "oklch(0.55 0.25 280 / 0.15)", border: "1px solid oklch(0.55 0.25 280 / 0.3)", color: "oklch(0.70 0.25 280)" }}>
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map(card => (
          <div key={card.id} className="rounded-xl p-4 space-y-2.5 transition-all"
            style={{ background: statusBg[card.status], border: `1px solid ${statusBorder[card.status]}` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="opacity-60" style={{ color: card.status === "online" ? "oklch(0.65 0.20 160)" : card.status === "offline" ? "oklch(0.65 0.25 25)" : "oklch(0.65 0.25 60)" }}>
                  {ICONS[card.id]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{card.label}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{card.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusIcon status={card.status} />
                {card.link && (
                  <a href={card.link} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </a>
                )}
              </div>
            </div>
            {card.detail && (
              <p className="text-[10px] text-muted-foreground">{card.detail}</p>
            )}
            {card.ping !== undefined && card.ping !== null && (
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 rounded-full flex-1" style={{ background: "oklch(0.15 0.05 280)" }}>
                  <div className="h-1.5 rounded-full" style={{
                    width: `${Math.min(100, 100 - (card.ping / 3000 * 100))}%`,
                    background: card.ping < 300 ? "oklch(0.60 0.20 160)" : card.ping < 1000 ? "oklch(0.65 0.25 60)" : "oklch(0.60 0.25 25)"
                  }} />
                </div>
                <span className="text-[10px] font-mono shrink-0"
                  style={{ color: card.ping < 300 ? "oklch(0.65 0.20 160)" : "oklch(0.65 0.25 60)" }}>
                  {card.ping}ms
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Monthly Deployments */}
      {monthlyStats && (
        <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-orange-400" />
            <p className="text-sm font-semibold text-foreground">This Month's Deployments</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground" style={{ background: "oklch(0.12 0.03 280)" }}>
              {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Used", val: monthlyStats.used, color: monthlyStats.used > 400 ? "oklch(0.65 0.25 25)" : "oklch(0.65 0.20 280)" },
              { label: "Remaining", val: monthlyStats.remaining, color: monthlyStats.remaining < 100 ? "oklch(0.65 0.25 40)" : "oklch(0.65 0.20 160)" },
              { label: "Limit", val: monthlyStats.limit, color: "oklch(0.55 0.05 280)" },
            ].map(item => (
              <div key={item.label} className="text-center p-3 rounded-lg" style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.16 0.05 280)" }}>
                <p className="text-xl font-bold" style={{ color: item.color }}>{item.val}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{monthlyStats.used} / {monthlyStats.limit} builds used</span>
              <span>{Math.round((monthlyStats.used / monthlyStats.limit) * 100)}%</span>
            </div>
            <div className="w-full h-3 rounded-full" style={{ background: "oklch(0.15 0.04 280)" }}>
              <div className="h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (monthlyStats.used / monthlyStats.limit) * 100)}%`,
                  background: monthlyStats.used > 400 ? "oklch(0.60 0.25 25)" : monthlyStats.used > 300 ? "oklch(0.65 0.25 60)" : "oklch(0.55 0.20 160)"
                }} />
            </div>
            {monthlyStats.used > 400 && (
              <p className="text-[10px] text-orange-400">⚠️ Monthly limit ke qareeb! Unnecessary deploys rok do.</p>
            )}
          </div>
        </div>
      )}

      {/* Build History */}
      {buildHistory.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(0.18 0.06 280)" }}>
            <p className="text-sm font-semibold text-foreground">Deploy History</p>
            {lastDeploy?.url && (
              <a href={lastDeploy.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ExternalLink className="w-3 h-3" />GitHub Actions
              </a>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: "oklch(0.15 0.05 280)" }}>
            {buildHistory.map((b, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                {b.status === "success"
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  : b.status === "in_progress"
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400 shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] font-mono" style={{ color: "oklch(0.65 0.25 280)" }}>{b.sha}</code>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(b.date)}</span>
                  </div>
                </div>
                {b.duration && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{b.duration}s</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CF API Token (optional -- for enhanced stats) */}
      <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
        <div>
          <p className="text-xs font-semibold text-foreground">Cloudflare API Token (Optional)</p>
          <p className="text-[10px] text-muted-foreground mt-1">Enhanced stats ke liye (request count, CPU time, real-time analytics). Bina is ke bhi basic status kaam karta hai.</p>
        </div>
        <div className="flex gap-2">
          <input type="password" value={cfToken} onChange={e => setCfToken(e.target.value)}
            placeholder="CF API token..."
            className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
            style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.25 0.08 280 / 0.5)" }} />
          <button type="button" onClick={() => { localStorage.setItem("bf_cf_api_token", cfToken); }}
            className="px-4 py-2 rounded-lg text-xs font-medium text-white"
            style={{ background: "oklch(0.50 0.18 50)" }}>Save</button>
        </div>
        {cfToken && <p className="text-[10px] text-orange-400">⚠️ Token stored in localStorage only -- not sent to any server.</p>}
      </div>
    </div>
  );
}

