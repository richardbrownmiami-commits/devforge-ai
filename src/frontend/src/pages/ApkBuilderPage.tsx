import { useEffect, useRef, useState } from "react";
import {
  CheckSquare,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Hammer,
  Loader2,
  RefreshCw,
  Smartphone,
  Square,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const GH_APK_REPO = "richardbrownmiami-commits/MyAI-Android-Build";
const GH_WORKFLOW = "build-apk.yml";

const LANGUAGES = [
  { id: "kotlin", label: "Kotlin", desc: "Android native — Google standard (2025)", recommended: true },
  { id: "flutter", label: "Flutter (Dart)", desc: "Android + iOS from one codebase" },
  { id: "reactnative", label: "React Native", desc: "JavaScript — great for web devs" },
  { id: "java", label: "Java", desc: "Classic Android — enterprise stable" },
  { id: "cpp", label: "C++", desc: "Performance-critical / games" },
] as const;

const APP_TYPES = [
  { id: "utility", label: "Utility", icon: "🔧" },
  { id: "social", label: "Social", icon: "💬" },
  { id: "entertainment", label: "Entertainment", icon: "🎬" },
  { id: "business", label: "Business", icon: "💼" },
  { id: "game", label: "Game", icon: "🎮" },
  { id: "ai_assistant", label: "AI / Assistant", icon: "🤖" },
] as const;

const FEATURES = [
  { id: "notifications", label: "Push Notifications", icon: "🔔" },
  { id: "camera", label: "Camera / Microphone", icon: "📷" },
  { id: "gps", label: "GPS / Location", icon: "📍" },
  { id: "database", label: "Local Database", icon: "🗄️" },
  { id: "background", label: "Background Services", icon: "⚙️" },
  { id: "biometric", label: "Biometric Login", icon: "🔑" },
  { id: "darkmode", label: "Dark / Light Mode", icon: "🌙" },
  { id: "multilang", label: "Multi-language", icon: "🌐" },
] as const;

type NetworkMode = "online" | "offline" | "hybrid";

interface GHRun {
  id: number;
  name: string;
  display_title: string;
  status: "queued" | "in_progress" | "completed" | "waiting";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | null;
  created_at: string;
  html_url: string;
}

function getGHToken(): string {
  try {
    const s = JSON.parse(localStorage.getItem("bf_settings") || "{}");
    return s.githubToken || "";
  } catch {
    return "";
  }
}

function PhoneMockup({ appName, appType, features }: { appName: string; appType: string; features: string[] }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-44 rounded-3xl border-4 overflow-hidden shadow-2xl"
        style={{
          borderColor: "oklch(0.76 0.16 158 / 0.7)",
          background: "oklch(0.06 0.01 280)",
          height: 320,
          boxShadow: "0 0 40px oklch(0.76 0.16 158 / 0.25), 0 0 80px oklch(0.65 0.22 280 / 0.15)",
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-b-2xl z-10" style={{ background: "oklch(0.06 0.01 280)", border: "2px solid oklch(0.76 0.16 158 / 0.4)", borderTop: "none" }} />
        {/* Screen content */}
        <div className="p-3 pt-7 h-full flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "oklch(0.76 0.16 158 / 0.2)", border: "1px solid oklch(0.76 0.16 158 / 0.4)" }}>
              {APP_TYPES.find(t => t.id === appType)?.icon ?? "📱"}
            </div>
            <span className="text-[11px] font-semibold text-foreground truncate max-w-[80px]">{appName || "My App"}</span>
          </div>
          {/* Mock UI blocks */}
          <div className="rounded-lg h-12 w-full" style={{ background: "oklch(0.76 0.16 158 / 0.12)", border: "1px solid oklch(0.76 0.16 158 / 0.2)" }} />
          <div className="grid grid-cols-2 gap-1.5">
            {[0,1,2,3].map(i => (
              <div key={i} className="rounded-md h-10" style={{ background: `oklch(${i % 2 === 0 ? "0.65 0.22 280" : "0.76 0.16 158"} / 0.10)`, border: `1px solid oklch(${i % 2 === 0 ? "0.65 0.22 280" : "0.76 0.16 158"} / 0.18)` }} />
            ))}
          </div>
          <div className="rounded-lg flex-1" style={{ background: "oklch(0.14 0.01 280)", border: "1px solid oklch(0.22 0.03 280)" }}>
            <div className="p-2 space-y-1.5">
              {features.slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.76 0.16 158)" }} />
                  <span className="text-[9px] text-muted-foreground">{FEATURES.find(ft => ft.id === f)?.label}</span>
                </div>
              ))}
              {features.length === 0 && <p className="text-[9px] text-muted-foreground/50 italic">No features selected</p>}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">App preview</p>
    </div>
  );
}

function statusColor(status: GHRun["status"], conclusion: GHRun["conclusion"]): string {
  if (status === "completed") {
    if (conclusion === "success") return "text-green-400";
    if (conclusion === "failure") return "text-red-400";
    if (conclusion === "cancelled") return "text-yellow-500";
    return "text-muted-foreground";
  }
  if (status === "in_progress") return "text-yellow-400";
  if (status === "queued") return "text-blue-400";
  return "text-muted-foreground";
}

function statusLabel(status: GHRun["status"], conclusion: GHRun["conclusion"]): string {
  if (status === "completed") return conclusion ?? "done";
  return status.replace("_", " ");
}

export function ApkBuilderPage() {
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<string>("kotlin");
  const [appType, setAppType] = useState<string>("utility");
  const [networkMode, setNetworkMode] = useState<NetworkMode>("online");
  const [features, setFeatures] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildMsg, setBuildMsg] = useState<{ type: "success" | "error" | "warn"; text: string; url?: string } | null>(null);
  const [runs, setRuns] = useState<GHRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = getGHToken();
      const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const r = await fetch(
        `https://api.github.com/repos/${GH_APK_REPO}/actions/runs?per_page=10`,
        { headers }
      );
      if (r.ok) {
        const data = await r.json();
        setRuns(Array.isArray(data.workflow_runs) ? data.workflow_runs : []);
      }
    } catch {
      // network error — leave existing list intact
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    intervalRef.current = setInterval(fetchHistory, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleBuild = async () => {
    if (!description.trim()) return;
    setBuilding(true);
    setBuildMsg(null);

    const token = getGHToken();
    if (!token) {
      setBuildMsg({
        type: "warn",
        text: "No GitHub token configured. Go to Settings → GitHub & Deploy to add your token, then try again.",
      });
      setBuilding(false);
      return;
    }

    try {
      const res = await fetch(
        `https://api.github.com/repos/${GH_APK_REPO}/actions/workflows/${GH_WORKFLOW}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref: "main" }),
        }
      );

      if (res.status === 204) {
        setBuildMsg({
          type: "success",
          text: "Build triggered! Check GitHub Actions for progress.",
          url: `https://github.com/${GH_APK_REPO}/actions`,
        });
        // Give GitHub a moment then refresh history
        setTimeout(fetchHistory, 3000);
      } else if (res.status === 404) {
        setBuildMsg({
          type: "error",
          text: `Build workflow not found in ${GH_APK_REPO} repo. Please add a .github/workflows/${GH_WORKFLOW} file first.`,
        });
      } else if (res.status === 401 || res.status === 403) {
        setBuildMsg({
          type: "error",
          text: `GitHub token error (${res.status}). Check your token has repo and workflow permissions.`,
        });
      } else {
        let errMsg = `GitHub API error: ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.message) errMsg = errData.message;
        } catch { /* ignore */ }
        setBuildMsg({ type: "error", text: errMsg });
      }
    } catch (e: unknown) {
      setBuildMsg({ type: "error", text: (e as Error).message || "Network error — check your connection." });
    } finally {
      setBuilding(false);
    }
  };

  const selectedLang = LANGUAGES.find(l => l.id === language) ?? LANGUAGES[0];

  return (
    <div className="flex flex-col h-full overflow-auto" data-ocid="apk_builder.page">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            APK Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Describe your app — AI generates the code and builds the APK via GitHub Actions
          </p>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Config */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description */}
          <div
            className="rounded-xl p-5 border"
            style={{ background: "oklch(0.12 0.01 280)", borderColor: "oklch(0.22 0.03 280)" }}
          >
            <label className="text-sm font-medium text-foreground mb-2 block">Describe your app</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. A fitness tracker that logs workouts, shows charts, and sends daily reminders…"
              rows={4}
              className="w-full rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 transition-all"
              style={{
                background: "oklch(0.08 0.005 280)",
                border: "1px solid oklch(0.24 0.04 280)",
                color: "oklch(0.93 0.005 0)",
              }}
              data-ocid="apk_builder.description.input"
            />
          </div>

          {/* Language */}
          <div
            className="rounded-xl p-5 border"
            style={{ background: "oklch(0.12 0.01 280)", borderColor: "oklch(0.22 0.03 280)" }}
          >
            <label className="text-sm font-medium text-foreground mb-3 block">Programming Language</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all"
                style={{ background: "oklch(0.08 0.005 280)", border: "1px solid oklch(0.76 0.16 158 / 0.4)", color: "oklch(0.93 0.005 0)" }}
                data-ocid="apk_builder.language.selector"
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{selectedLang.label}</span>
                  {selectedLang.recommended && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "oklch(0.76 0.16 158 / 0.2)", color: "oklch(0.76 0.16 158)" }}>Recommended</span>
                  )}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", langOpen && "rotate-180")} />
              </button>
              {langOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-lg overflow-hidden shadow-xl" style={{ background: "oklch(0.11 0.01 280)", border: "1px solid oklch(0.22 0.03 280)" }}>
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => { setLanguage(lang.id); setLangOpen(false); }}
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5",
                        language === lang.id && "bg-primary/10"
                      )}
                      data-ocid={`apk_builder.language.${lang.id}`}
                    >
                      <div className="flex-1">
                        <span className="font-medium text-foreground">{lang.label}</span>
                        {lang.recommended && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "oklch(0.76 0.16 158 / 0.2)", color: "oklch(0.76 0.16 158)" }}>Recommended</span>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">{lang.desc}</p>
                      </div>
                      {language === lang.id && <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "oklch(0.76 0.16 158)" }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* App Type */}
          <div
            className="rounded-xl p-5 border"
            style={{ background: "oklch(0.12 0.01 280)", borderColor: "oklch(0.22 0.03 280)" }}
          >
            <label className="text-sm font-medium text-foreground mb-3 block">App Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {APP_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setAppType(type.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all",
                    appType === type.id
                      ? "border-primary/60 text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                  style={appType === type.id ? { background: "oklch(0.76 0.16 158 / 0.1)" } : { background: "oklch(0.09 0.005 280)" }}
                  data-ocid={`apk_builder.type.${type.id}`}
                >
                  <span className="text-lg">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Network Mode */}
          <div
            className="rounded-xl p-5 border"
            style={{ background: "oklch(0.12 0.01 280)", borderColor: "oklch(0.22 0.03 280)" }}
          >
            <label className="text-sm font-medium text-foreground mb-3 block">Network Mode</label>
            <div className="flex gap-2">
              {(["online", "offline", "hybrid"] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setNetworkMode(mode)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm border capitalize transition-all",
                    networkMode === mode
                      ? "border-primary/60 text-primary font-medium"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                  style={networkMode === mode ? { background: "oklch(0.76 0.16 158 / 0.1)" } : { background: "oklch(0.09 0.005 280)" }}
                  data-ocid={`apk_builder.network.${mode}`}
                >
                  {mode === "online" && <Wifi className="w-3.5 h-3.5" />}
                  {mode === "offline" && <WifiOff className="w-3.5 h-3.5" />}
                  {mode === "hybrid" && <Zap className="w-3.5 h-3.5" />}
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div
            className="rounded-xl p-5 border"
            style={{ background: "oklch(0.12 0.01 280)", borderColor: "oklch(0.22 0.03 280)" }}
          >
            <label className="text-sm font-medium text-foreground mb-3 block">Features</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FEATURES.map(feat => {
                const active = features.includes(feat.id);
                return (
                  <button
                    key={feat.id}
                    type="button"
                    onClick={() => toggleFeature(feat.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all text-left",
                      active
                        ? "border-primary/50 text-foreground"
                        : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                    )}
                    style={active ? { background: "oklch(0.76 0.16 158 / 0.08)" } : { background: "oklch(0.09 0.005 280)" }}
                    data-ocid={`apk_builder.feature.${feat.id}`}
                  >
                    {active
                      ? <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                      : <Square className="w-3.5 h-3.5 shrink-0" />}
                    <span>{feat.icon} {feat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right — Preview + Actions */}
        <div className="space-y-5">
          {/* Preview */}
          <div
            className="rounded-xl p-5 border"
            style={{ background: "oklch(0.12 0.01 280)", borderColor: "oklch(0.22 0.03 280)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-foreground">Preview</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(p => !p)}
                className="gap-1.5 text-xs h-7 border-border"
                data-ocid="apk_builder.preview.toggle"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? "Hide" : "Show"}
              </Button>
            </div>
            {showPreview
              ? <PhoneMockup appName={description.slice(0, 20)} appType={appType} features={features} />
              : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Smartphone className="w-10 h-10 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground/60">Click Show to preview your app</p>
                </div>
              )}
          </div>

          {/* Build status message */}
          {buildMsg && (
            <div
              className="rounded-xl px-4 py-3 text-xs border"
              style={{
                background: buildMsg.type === "success"
                  ? "oklch(0.76 0.16 158 / 0.08)"
                  : buildMsg.type === "warn"
                  ? "oklch(0.75 0.18 60 / 0.08)"
                  : "oklch(0.55 0.22 25 / 0.08)",
                borderColor: buildMsg.type === "success"
                  ? "oklch(0.76 0.16 158 / 0.3)"
                  : buildMsg.type === "warn"
                  ? "oklch(0.75 0.18 60 / 0.3)"
                  : "oklch(0.55 0.22 25 / 0.3)",
                color: buildMsg.type === "success"
                  ? "oklch(0.76 0.16 158)"
                  : buildMsg.type === "warn"
                  ? "oklch(0.80 0.18 60)"
                  : "oklch(0.70 0.22 25)",
              }}
              data-ocid="apk_builder.build.status"
            >
              {buildMsg.text}
              {buildMsg.url && (
                <a
                  href={buildMsg.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-1.5 underline"
                >
                  <ExternalLink className="w-3 h-3" /> View on GitHub Actions
                </a>
              )}
            </div>
          )}

          {/* Build */}
          <button
            type="button"
            onClick={handleBuild}
            disabled={building || !description.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: building ? "oklch(0.76 0.16 158 / 0.4)" : "oklch(0.76 0.16 158)",
              color: "oklch(0.08 0 0)",
              boxShadow: building ? "none" : "0 0 20px oklch(0.76 0.16 158 / 0.35)",
            }}
            data-ocid="apk_builder.build.button"
          >
            {building
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Hammer className="w-4 h-4" />}
            {building ? "Triggering Build…" : "Build APK via GitHub Actions"}
          </button>

          {/* Selected summary */}
          <div
            className="rounded-xl p-4 border text-xs space-y-2"
            style={{ background: "oklch(0.10 0.005 280)", borderColor: "oklch(0.20 0.02 280)" }}
          >
            <p className="text-muted-foreground font-medium">Build config</p>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Language</span>
              <span className="text-foreground font-medium">{selectedLang.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="text-foreground font-medium capitalize">{appType.replace("_", " ")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Network</span>
              <span className="text-foreground font-medium capitalize">{networkMode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Features</span>
              <span className="text-foreground font-medium">{features.length} selected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Repo</span>
              <a
                href={`https://github.com/${GH_APK_REPO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-0.5 font-medium"
              >
                MyAI-Android-Build <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Build History */}
      <div className="px-8 pb-8">
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "oklch(0.22 0.03 280)" }}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ background: "oklch(0.12 0.01 280)", borderColor: "oklch(0.22 0.03 280)" }}>
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Build History
              <span className="text-[10px] text-muted-foreground">(from GitHub Actions)</span>
            </span>
            <button
              type="button"
              onClick={fetchHistory}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="apk_builder.history.refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", historyLoading && "animate-spin")} />
            </button>
          </div>
          {historyLoading && runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2" style={{ background: "oklch(0.09 0.005 280)" }}>
              <Loader2 className="w-5 h-5 text-muted-foreground/40 animate-spin" />
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2" style={{ background: "oklch(0.09 0.005 280)" }}>
              <Hammer className="w-7 h-7 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground/50">No builds yet — trigger your first APK build above</p>
            </div>
          ) : (
            <div style={{ background: "oklch(0.09 0.005 280)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground" style={{ borderColor: "oklch(0.20 0.02 280)" }}>
                    <th className="text-left px-5 py-2.5 font-medium">Build</th>
                    <th className="text-left px-5 py-2.5 font-medium">Status</th>
                    <th className="text-left px-5 py-2.5 font-medium">Date</th>
                    <th className="text-right px-5 py-2.5 font-medium">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(run => (
                    <tr key={run.id} className="border-b last:border-0 hover:bg-white/3 transition-colors" style={{ borderColor: "oklch(0.18 0.02 280)" }}>
                      <td className="px-5 py-3 text-foreground truncate max-w-[200px]">{run.display_title || run.name}</td>
                      <td className="px-5 py-3">
                        <span className={cn("font-medium capitalize flex items-center gap-1.5", statusColor(run.status, run.conclusion))}>
                          {(run.status === "in_progress" || run.status === "queued") && (
                            <Loader2 className="w-3 h-3 animate-spin inline" />
                          )}
                          {statusLabel(run.status, run.conclusion)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(run.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <a
                          href={run.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Download className="w-3 h-3" /> View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
