import { useSettings, useSaveSettings } from "../../hooks/useBackend";
import { useState, useEffect } from "react";
import { Terminal, Wifi, WifiOff, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TermuxAdminPage() {
  const { data: settings } = useSettings();
  const save = useSaveSettings();
  const s = settings as any;
  const [url, setUrl] = useState(s?.termuxUrl || "");
  const [status, setStatus] = useState<"idle" | "checking" | "online" | "offline">("idle");
  const [info, setInfo] = useState<any>(null);

  const checkStatus = async () => {
    if (!url) return;
    setStatus("checking");
    setInfo(null);
    try {
      const res = await fetch(`${url}/api/status`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      setStatus(data?.ok ? "online" : "offline");
      setInfo(data);
    } catch {
      setStatus("offline");
    }
  };

  useEffect(() => {
    if (url) checkStatus();
  }, []);

  const handleSave = () => {
    save.mutate({ termuxUrl: url } as any);
    setTimeout(() => { if (url) checkStatus(); }, 500);
  };

  const statusColor = status === "online" ? "text-green-400" : status === "offline" ? "text-red-400" : status === "checking" ? "text-yellow-400" : "text-muted-foreground";
  const statusIcon = status === "online" ? <Wifi className="w-4 h-4" /> : status === "offline" ? <WifiOff className="w-4 h-4" /> : <RefreshCw className={`w-4 h-4 ${status === "checking" ? "animate-spin" : ""}`} />;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.55 0.20 140 / 0.15)", border: "1px solid oklch(0.55 0.20 140 / 0.3)" }}>
          <Terminal className="w-5 h-5" style={{ color: "oklch(0.65 0.20 140)" }} />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground">Termux</h1>
          <p className="text-xs text-muted-foreground">Local BrainForge Worker on Android</p>
        </div>
      </div>

      <div className="p-4 rounded-xl border space-y-3" style={{ background: "oklch(0.09 0.02 280)", borderColor: "oklch(0.20 0.06 280)" }}>
        <p className="text-xs font-semibold text-foreground">Setup Guide</p>
        <div className="space-y-2 text-[11px] text-muted-foreground">
          <p>1. Install Termux from F-Droid on Android</p>
          <p>2. Run: <code className="text-green-400 bg-black/30 px-1 rounded">pkg install nodejs</code></p>
          <p>3. Clone BrainForge repo and run Worker: <code className="text-green-400 bg-black/30 px-1 rounded">node server.js</code></p>
          <p>4. Server runs on port 3000 by default</p>
          <p>5. Use localhost URL if on same device, or LAN IP for cross-device access</p>
        </div>
      </div>

      <div className="p-4 rounded-xl border space-y-4" style={{ background: "oklch(0.09 0.02 280)", borderColor: "oklch(0.20 0.06 280)" }}>
        <p className="text-xs font-semibold text-foreground">Server URL</p>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:3000 or http://192.168.x.x:3000"
            className="h-9 text-xs flex-1"
          />
          <Button onClick={handleSave} disabled={save.isPending} className="h-9 px-4 text-xs">
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {save.isPending ? "..." : "Save"}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 text-xs ${statusColor}`}>
            {statusIcon}
            <span>
              {status === "idle" ? "Not checked" : status === "checking" ? "Checking..." : status === "online" ? "Online" : "Offline"}
            </span>
          </div>
          <button type="button" onClick={checkStatus} disabled={!url || status === "checking"}
            className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 disabled:opacity-40">
            Test Connection
          </button>
        </div>

        {info && (
          <pre className="text-[10px] font-mono bg-black/30 rounded-lg p-3 text-green-300 overflow-auto max-h-32 border border-white/5">
            {JSON.stringify(info, null, 2)}
          </pre>
        )}
      </div>

      <div className="p-4 rounded-xl border space-y-2" style={{ background: "oklch(0.09 0.02 280)", borderColor: "oklch(0.20 0.06 280)" }}>
        <p className="text-xs font-semibold text-foreground">Why Termux?</p>
        <div className="text-[11px] text-muted-foreground space-y-1">
          <p>• Run BrainForge Worker locally without Cloudflare</p>
          <p>• No internet required for basic AI features</p>
          <p>• Full offline capability on Android</p>
          <p>• Execute scripts and local commands</p>
          <p>• Useful when Cloudflare Worker is unreachable</p>
        </div>
      </div>
    </div>
  );
}
