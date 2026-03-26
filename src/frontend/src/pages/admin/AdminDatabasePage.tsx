import { Database, HardDrive, RefreshCw, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CF_WORKER = "https://brainforge-api.richard-brown-miami.workers.dev";
const WORKER_SECRET = "2200";

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

export function AdminDatabasePage() {
  // Supabase
  const [supUrl, setSupUrl] = useState(() => localStorage.getItem("bf_supabase_url") || "");
  const [supKey, setSupKey] = useState(() => localStorage.getItem("bf_supabase_key") || "");
  const [supSaved, setSupSaved] = useState(false);

  // D1 stats
  const [d1Stats, setD1Stats] = useState<{ tables?: number; rows?: number; size?: string } | null>(null);
  const [d1Loading, setD1Loading] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");

  const cardStyle = { background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" };

  const fetchD1Stats = async () => {
    setD1Loading(true);
    try {
      const res = await fetch(`${CF_WORKER}/api/stats`, {
        headers: { "X-BrainForge-Secret": WORKER_SECRET },
      });
      if (res.ok) setD1Stats(await res.json());
      else setD1Stats({ tables: 0, rows: 0, size: "N/A" });
    } catch { setD1Stats({ tables: 0, rows: 0, size: "Error" }); }
    setD1Loading(false);
  };

  const handleBackup = async () => {
    setBackupMsg("Backing up...");
    try {
      const res = await fetch(`${CF_WORKER}/api/backup`, {
        method: "POST",
        headers: { "X-BrainForge-Secret": WORKER_SECRET },
      });
      if (res.ok) {
        setBackupMsg("✓ Backup complete");
        toast.success("D1 backup complete!");
      } else {
        setBackupMsg("Backup failed");
        toast.error("Backup failed");
      }
    } catch {
      setBackupMsg("Error");
      toast.error("Backup error");
    }
    setTimeout(() => setBackupMsg(""), 4000);
  };

  const handleSupabaseSave = () => {
    localStorage.setItem("bf_supabase_url", supUrl);
    localStorage.setItem("bf_supabase_key", supKey);
    setSupSaved(true);
    toast.success("Supabase keys saved!");
    setTimeout(() => setSupSaved(false), 2500);
  };

  // Local storage meter
  let localUsed = 0;
  try { for (const k of Object.keys(localStorage)) localUsed += (localStorage.getItem(k) || "").length * 2; } catch {}
  const localMB = (localUsed / 1024 / 1024).toFixed(2);
  const localPct = Math.min(100, (localUsed / (1024 * 1024 * 50)) * 100);

  // Clear local data
  const clearLocalData = () => {
    if (!confirm("Sab local BrainForge data delete kar do? (projects, settings, history)")) return;
    const keepKeys = ["bf_users", "bf_feedback", "bf_activity_log"];
    const toDelete = Object.keys(localStorage).filter(k => k.startsWith("bf_") && !keepKeys.includes(k));
    toDelete.forEach(k => localStorage.removeItem(k));
    toast.success(`${toDelete.length} items cleared`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5" style={{ color: "oklch(0.65 0.25 220)" }} />
          Database
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">D1, Supabase, aur local storage manage karo</p>
      </div>

      {/* Cloudflare D1 */}
      <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Cloudflare D1</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">BrainForge ka primary database</p>
          </div>
          <button type="button" onClick={fetchD1Stats} disabled={d1Loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-all"
            style={{ background: "oklch(0.55 0.25 220 / 0.15)", border: "1px solid oklch(0.55 0.25 220 / 0.3)", color: "oklch(0.70 0.25 220)" }}>
            <RefreshCw className={`w-3 h-3 ${d1Loading ? "animate-spin" : ""}`} />
            {d1Loading ? "Loading..." : "Refresh Stats"}
          </button>
        </div>

        {d1Stats ? (
          <div className="grid grid-cols-3 gap-3">
            {[{ label: "Tables", val: d1Stats.tables ?? "?" }, { label: "Rows", val: d1Stats.rows ?? "?" }, { label: "Size", val: d1Stats.size ?? "?" }].map(item => (
              <div key={item.label} className="text-center p-3 rounded-lg" style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.18 0.06 280)" }}>
                <p className="text-base font-bold text-foreground">{String(item.val)}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground rounded-lg"
            style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.18 0.06 280)" }}>
            Click "Refresh Stats" to load D1 data
          </div>
        )}

        <button type="button" onClick={handleBackup}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ background: "oklch(0.55 0.25 220 / 0.1)", border: "1px solid oklch(0.55 0.25 220 / 0.3)", color: "oklch(0.70 0.25 220)" }}>
          <HardDrive className="w-4 h-4 inline mr-2" />
          {backupMsg || "Backup D1 → GitHub"}
        </button>
      </div>

      {/* Supabase */}
      <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Supabase
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            BrainForge ka apna data D1+GitHub mein hai. Yeh keys sirf tumhare banaye apps ke liye hain.
          </p>
        </div>
        <FieldGroup label="Supabase URL">
          <input value={supUrl} onChange={e => setSupUrl(e.target.value)}
            placeholder="https://xxx.supabase.co"
            className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
            style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.25 0.08 280 / 0.5)" }}
          />
        </FieldGroup>
        <FieldGroup label="Anon Key">
          <input type="password" value={supKey} onChange={e => setSupKey(e.target.value)}
            placeholder="eyJhbGci..."
            className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
            style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.25 0.08 280 / 0.5)" }}
          />
        </FieldGroup>
        {(supUrl || supKey) && (
          <p className="text-[10px] text-emerald-400">✓ Supabase configured — projects will use this DB</p>
        )}
        <button type="button" onClick={handleSupabaseSave}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
          style={{ background: "oklch(0.50 0.18 160)" }}>
          <Save className="w-4 h-4" />
          {supSaved ? "Saved ✓" : "Save Supabase Keys"}
        </button>
      </div>

      {/* Local Storage */}
      <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Local Storage</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Browser mein BrainForge ka data</p>
          </div>
          <span className="text-xs font-medium" style={{ color: localPct > 80 ? "oklch(0.65 0.25 25)" : "oklch(0.65 0.20 220)" }}>
            {localMB} MB / ~50 MB
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full" style={{ background: "oklch(0.15 0.04 280)" }}>
          <div className="h-2.5 rounded-full transition-all"
            style={{
              width: `${localPct}%`,
              background: localPct > 80 ? "oklch(0.60 0.25 25)" : localPct > 50 ? "oklch(0.65 0.25 60)" : "oklch(0.60 0.20 220)"
            }} />
        </div>
        <button type="button" onClick={clearLocalData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
          style={{ background: "oklch(0.55 0.25 25 / 0.08)", border: "1px solid oklch(0.55 0.25 25 / 0.25)", color: "oklch(0.65 0.25 25)" }}>
          <Trash2 className="w-3.5 h-3.5" />
          Clear Local BrainForge Data
        </button>
      </div>
    </div>
  );
}
