import { CheckCircle, Key, Loader2, RefreshCw, XCircle, AlertTriangle } from "lucide-react";
import { useState, useCallback } from "react";

interface KeyStatus { name: string; key: string; model: string; status: "idle"|"checking"|"ok"|"rate_limited"|"invalid"|"missing"; latency?: number; detail?: string; }

export function APIMonitorPage() {
  const s = JSON.parse(localStorage.getItem("bf_settings") || "{}");
  const defaultOrKey = localStorage.getItem("bf_default_or_key") || "";

  const [statuses, setStatuses] = useState<KeyStatus[]>([
    { name: "OpenRouter (User)", key: s.openRouterApiKey || "", model: s.defaultModel || "deepseek/deepseek-v3:free", status: "idle" },
    { name: "OpenRouter (Default/Testers)", key: defaultOrKey, model: "deepseek/deepseek-v3:free", status: "idle" },
    { name: "Gemini", key: s.geminiApiKey || "", model: s.geminiModel || "gemini-2.0-flash", status: "idle" },
    { name: "Groq", key: s.groqApiKey || "", model: s.groqModel || "llama-3.3-70b-versatile", status: "idle" },
    { name: "GitHub Models", key: s.githubModelsKey || "", model: s.githubModelsModel || "gpt-4o", status: "idle" },
  ]);
  const [checking, setChecking] = useState(false);
  const cardStyle = { background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" };

  const update = (name: string, patch: Partial<KeyStatus>) =>
    setStatuses(p => p.map(k => k.name === name ? { ...k, ...patch } : k));

  const checkKey = async (ks: KeyStatus) => {
    if (!ks.key) { update(ks.name, { status: "missing", detail: "Key set nahi hai" }); return; }
    update(ks.name, { status: "checking" });
    const start = Date.now();
    try {
      if (ks.name.startsWith("OpenRouter")) {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${ks.key}`, "Content-Type": "application/json", "HTTP-Referer": "https://brainforge-7xn.pages.dev" },
          body: JSON.stringify({ model: ks.model, messages: [{ role: "user", content: "Hi" }], max_tokens: 5 }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        const lat = Date.now() - start;
        if (res.status === 429) update(ks.name, { status: "rate_limited", latency: lat, detail: "Rate limited -- thodi der baad try karo" });
        else if (res.ok && data.choices) update(ks.name, { status: "ok", latency: lat, detail: `${lat}ms · model: ${ks.model}` });
        else update(ks.name, { status: "invalid", detail: data.error?.message || `HTTP ${res.status}` });
      } else if (ks.name === "Gemini") {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ks.model}:generateContent?key=${ks.key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }], generationConfig: { maxOutputTokens: 5 } }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        const lat = Date.now() - start;
        if (res.status === 429) update(ks.name, { status: "rate_limited", latency: lat, detail: "Quota exceeded" });
        else if (res.ok && data.candidates) update(ks.name, { status: "ok", latency: lat, detail: `${lat}ms · model: ${ks.model}` });
        else update(ks.name, { status: "invalid", detail: data.error?.message || `HTTP ${res.status}` });
      } else if (ks.name === "Groq") {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${ks.key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: ks.model, messages: [{ role: "user", content: "Hi" }], max_tokens: 5 }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        const lat = Date.now() - start;
        if (res.status === 429) update(ks.name, { status: "rate_limited", latency: lat, detail: "Rate limited" });
        else if (res.ok && data.choices) update(ks.name, { status: "ok", latency: lat, detail: `${lat}ms · model: ${ks.model}` });
        else update(ks.name, { status: "invalid", detail: data.error?.message || `HTTP ${res.status}` });
      } else {
        update(ks.name, { status: "idle", detail: "Manual check required" });
      }
    } catch (e: any) {
      update(ks.name, { status: "invalid", detail: e.name === "TimeoutError" ? "Timeout (10s)" : e.message });
    }
  };

  const checkAll = useCallback(async () => {
    setChecking(true);
    const current = JSON.parse(localStorage.getItem("bf_settings") || "{}");
    const dKey = localStorage.getItem("bf_default_or_key") || "";
    const fresh: KeyStatus[] = [
      { name: "OpenRouter (User)", key: current.openRouterApiKey || "", model: current.defaultModel || "deepseek/deepseek-v3:free", status: "idle" },
      { name: "OpenRouter (Default/Testers)", key: dKey, model: "deepseek/deepseek-v3:free", status: "idle" },
      { name: "Gemini", key: current.geminiApiKey || "", model: current.geminiModel || "gemini-2.0-flash", status: "idle" },
      { name: "Groq", key: current.groqApiKey || "", model: current.groqModel || "llama-3.3-70b-versatile", status: "idle" },
      { name: "GitHub Models", key: current.githubModelsKey || "", model: current.githubModelsModel || "gpt-4o", status: "idle" },
    ];
    setStatuses(fresh);
    await Promise.allSettled(fresh.map(checkKey));
    setChecking(false);
  }, []);

  const StatusIcon = ({ s }: { s: KeyStatus["status"] }) => {
    if (s === "checking") return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
    if (s === "ok") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (s === "rate_limited") return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    if (s === "missing") return <div className="w-4 h-4 rounded-full border-2 border-dashed border-muted-foreground/40" />;
    if (s === "invalid") return <XCircle className="w-4 h-4 text-red-400" />;
    return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />;
  };

  const statusLabel: Record<string, string> = {
    idle: "Not checked", checking: "Checking...", ok: "Working ✓",
    rate_limited: "Rate Limited", invalid: "Invalid / Error", missing: "Not Set",
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Key className="w-5 h-5 text-violet-400" /> API Keys Monitor
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Sab API keys ka live status check karo</p>
        </div>
        <button type="button" onClick={checkAll} disabled={checking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-all"
          style={{ background: "oklch(0.55 0.25 280 / 0.15)", border: "1px solid oklch(0.55 0.25 280 / 0.3)", color: "oklch(0.70 0.25 280)" }}>
          <RefreshCw className={`w-3 h-3 ${checking ? "animate-spin" : ""}`} />
          Check All
        </button>
      </div>
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="divide-y" style={{ borderColor: "oklch(0.18 0.06 280)" }}>
          {statuses.map(ks => (
            <div key={ks.name} className="px-4 py-3.5 flex items-center gap-4">
              <StatusIcon s={ks.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{ks.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {ks.key ? `${ks.key.slice(0,8)}...${ks.key.slice(-4)}` : "No key"} · {ks.detail || statusLabel[ks.status]}
                </p>
              </div>
              <button type="button" onClick={() => checkKey(ks)} disabled={ks.status === "checking"}
                className="text-[10px] px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                style={{ background: "oklch(0.55 0.25 280 / 0.1)", border: "1px solid oklch(0.55 0.25 280 / 0.25)", color: "oklch(0.65 0.25 280)" }}>
                Test
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl p-4 text-xs text-muted-foreground" style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.16 0.05 280)" }}>
        💡 Keys Settings → API Keys mein change karo. Yeh page sirf status check karta hai, keys change nahi karta.
      </div>
    </div>
  );
}
