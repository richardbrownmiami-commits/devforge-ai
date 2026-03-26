import { AlertOctagon, Download, FileText, Package, Power, RefreshCw, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const AUDIT_KEY = "bf_admin_audit_log";
const ERROR_KEY = "bf_error_log";
const MAINTENANCE_KEY = "bf_maintenance_mode";

export function logAdminAction(action: string, detail = "") {
  try {
    const log = JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
    log.unshift({ id: Date.now().toString(), action, detail, timestamp: new Date().toISOString() });
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, 200)));
  } catch {}
}

export function SystemPage() {
  const [tab, setTab] = useState<"audit"|"errors"|"maintenance"|"export">("maintenance");
  const [auditLog, setAuditLog] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]"); } catch { return []; }
  });
  const [errorLog, setErrorLog] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem(ERROR_KEY) || "[]"); } catch { return []; }
  });
  const [maintenance, setMaintenance] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MAINTENANCE_KEY) || "false"); } catch { return false; }
  });
  const [exporting, setExporting] = useState(false);
  const cardStyle = { background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" };

  const toggleMaintenance = () => {
    const next = !maintenance;
    localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(next));
    setMaintenance(next);
    logAdminAction("Maintenance Mode", next ? "Enabled" : "Disabled");
    toast[next ? "warning" : "success"](`Maintenance mode ${next ? "ON" : "OFF"}`);
  };

  const exportAll = async () => {
    setExporting(true);
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("bf_"));
      const data: Record<string, any> = {};
      for (const k of keys) {
        try { data[k] = JSON.parse(localStorage.getItem(k) || "null"); } catch { data[k] = localStorage.getItem(k); }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `brainforge-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      logAdminAction("Full Export", `${keys.length} keys exported`);
      toast.success("Export complete!");
    } catch { toast.error("Export failed"); }
    setExporting(false);
  };

  const clearAudit = () => {
    localStorage.removeItem(AUDIT_KEY);
    setAuditLog([]);
    toast.success("Audit log cleared");
  };

  const clearErrors = () => {
    localStorage.removeItem(ERROR_KEY);
    setErrorLog([]);
    toast.success("Error log cleared");
  };

  const relTime = (ts: string) => {
    const d = Date.now() - new Date(ts).getTime();
    const m = Math.floor(d / 60000), h = Math.floor(m / 60), dy = Math.floor(h / 24);
    return dy > 0 ? `${dy}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : "Just now";
  };

  const TABS = [
    { id: "maintenance" as const, label: "Maintenance", icon: Power },
    { id: "export" as const, label: "Export", icon: Download },
    { id: "audit" as const, label: "Audit Log", icon: Shield },
    { id: "errors" as const, label: "Error Log", icon: AlertOctagon },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-pink-400" /> System
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Maintenance, export, audit aur error logs</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl" style={{ background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.18 0.06 280)" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className="flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-all"
            style={tab === id
              ? { background: "oklch(0.55 0.25 280 / 0.2)", color: "oklch(0.75 0.25 280)", border: "1px solid oklch(0.55 0.25 280 / 0.3)" }
              : { color: "oklch(0.55 0.05 280)", border: "1px solid transparent" }
            }>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Maintenance */}
      {tab === "maintenance" && (
        <div className="space-y-4">
          <div className="rounded-xl p-5 space-y-4" style={maintenance
            ? { background: "oklch(0.55 0.25 40 / 0.1)", border: "1px solid oklch(0.55 0.25 40 / 0.4)" }
            : cardStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Maintenance Mode</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {maintenance ? "🔴 ON -- Sab users ko maintenance screen dikh raha hai" : "🟢 OFF -- App normal chal raha hai"}
                </p>
              </div>
              <div className="w-12 h-6 rounded-full cursor-pointer transition-all relative"
                style={{ background: maintenance ? "oklch(0.55 0.25 40)" : "oklch(0.25 0.05 280)" }}
                onClick={toggleMaintenance}>
                <div className="absolute top-1 transition-all w-4 h-4 rounded-full bg-white"
                  style={{ left: maintenance ? "28px" : "4px" }} />
              </div>
            </div>
            {maintenance && (
              <div className="p-3 rounded-lg text-xs" style={{ background: "oklch(0.55 0.25 40 / 0.15)", border: "1px solid oklch(0.55 0.25 40 / 0.3)" }}>
                ⚠️ Admin access pehle jaisa kaam karta rahega (/admin seedha open hoga). Sirf main app ka access blocked hai.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export */}
      {tab === "export" && (
        <div className="space-y-4">
          <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
            <div>
              <p className="text-sm font-semibold text-foreground">Full Data Export</p>
              <p className="text-[10px] text-muted-foreground mt-1">Sab BrainForge data ek JSON file mein download karo -- users, projects, memories, feedback, settings, sab kuch.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
              {["Users & Sessions","Project Data","AI Memories","Feedback & Replies","Activity Log","Settings & Keys"].map(item => (
                <div key={item} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.55 0.25 280)" }} />
                  {item}
                </div>
              ))}
            </div>
            <button type="button" onClick={exportAll} disabled={exporting}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "oklch(0.50 0.20 220)" }}>
              <Download className="w-4 h-4" />
              {exporting ? "Exporting..." : "Export All Data (.json)"}
            </button>
          </div>
        </div>
      )}

      {/* Audit Log */}
      {tab === "audit" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{auditLog.length} entries</p>
            {auditLog.length > 0 && (
              <button type="button" onClick={clearAudit}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                <Trash2 className="w-3 h-3" />Clear
              </button>
            )}
          </div>
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            {auditLog.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Koi admin actions abhi tak nahi</div>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto" style={{ borderColor: "oklch(0.15 0.05 280)" }}>
                {auditLog.map((a: any) => (
                  <div key={a.id} className="px-4 py-2.5 flex items-start gap-3">
                    <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0 text-violet-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">{a.action}</p>
                      {a.detail && <p className="text-[10px] text-muted-foreground truncate">{a.detail}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{relTime(a.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Log */}
      {tab === "errors" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{errorLog.length} errors</p>
            {errorLog.length > 0 && (
              <button type="button" onClick={clearErrors}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                <Trash2 className="w-3 h-3" />Clear
              </button>
            )}
          </div>
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            {errorLog.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <AlertOctagon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Koi errors log nahi hain 🎉
              </div>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto" style={{ borderColor: "oklch(0.15 0.05 280)" }}>
                {errorLog.map((e: any, i: number) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertOctagon className="w-3.5 h-3.5 shrink-0 text-red-400" />
                      <p className="text-xs font-medium text-red-300 truncate">{e.message}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">{relTime(e.timestamp)}</span>
                    </div>
                    {e.stack && <p className="text-[9px] text-muted-foreground font-mono truncate ml-5">{e.stack.split("\n")[0]}</p>}
                    {e.url && <p className="text-[9px] text-muted-foreground truncate ml-5">{e.url}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
