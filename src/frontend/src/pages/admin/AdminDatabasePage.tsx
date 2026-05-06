import { AlertTriangle, Database, Download, HardDrive, Play, RefreshCw, Save, Table, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CF_WORKER = "https://brainforge-api.richard-brown-miami.workers.dev";
const WORKER_SECRET = "2200";
const GH_REPO = "richardbrownmiami-commits/devforge-ai";

function getGHToken() {
  return JSON.parse(localStorage.getItem("bf_settings") || "{}").githubToken || """";
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

interface D1Stats { tables?: number; rows?: number; size?: string; tableList?: { name: string; rows: number }[]; }

export function AdminDatabasePage() {
  const [supUrl, setSupUrl] = useState(() => localStorage.getItem("bf_supabase_url") || "");
  const [supKey, setSupKey] = useState(() => localStorage.getItem("bf_supabase_key") || "");
  const [supSaved, setSupSaved] = useState(false);
  const [d1Stats, setD1Stats] = useState<D1Stats | null>(null);
  const [d1Loading, setD1Loading] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM sqlite_master WHERE type='table';");
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlLoading, setSqlLoading] = useState(false);

  const cardStyle = { background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" };
  const accentColor = "oklch(0.65 0.25 220)";

  const fetchD1Stats = async () => {
    setD1Loading(true);
    try {
      const [statsRes, backupRes] = await Promise.allSettled([
        fetch(`${CF_WORKER}/api/stats`, { headers: { "X-BrainForge-Secret": WORKER_SECRET } }).then(r => r.json()),
        fetch(`https://api.github.com/repos/${GH_REPO}/contents/backups`, {
          headers: { Authorization: `token ${getGHToken()}` }
        }).then(r => r.json()).catch(() => []),
      ]);
      if (statsRes.status === "fulfilled") {
        const data = statsRes.value;
        setD1Stats(data);
        // Check storage warning
        const sizeNum = parseFloat(data.size || "0");
        if (sizeNum > 400) toast.warning("D1 storage 80%+ full! Backup lo.");
      } else {
        setD1Stats({ tables: 0, rows: 0, size: "Error" });
      }
      if (backupRes.status === "fulfilled" && Array.isArray(backupRes.value)) {
        const files = backupRes.value as any[];
        if (files.length > 0) {
          const latest = files.sort((a: any, b: any) => b.name.localeCompare(a.name))[0];
          setLastBackup(latest.name);
        }
      }
    } catch { setD1Stats({ tables: 0, rows: 0, size: "Error" }); }
    setD1Loading(false);
  };

  const fetchTableRows = async (tableName: string) => {
    setSelectedTable(tableName);
    setTableLoading(true);
    setTableRows([]);
    try {
      const res = await fetch(`${CF_WORKER}/api/table/${tableName}?limit=20`, {
        headers: { "X-BrainForge-Secret": WORKER_SECRET }
      });
      if (res.ok) {
        const data = await res.json();
        setTableRows(Array.isArray(data) ? data : data.rows || []);
      } else {
        setTableRows([]);
        toast.error("Table data load nahi hui");
      }
    } catch { setTableRows([]); }
    setTableLoading(false);
  };

  const runSQL = async () => {
    if (!sqlQuery.trim()) return;
    setSqlLoading(true);
    setSqlResult(null);
    try {
      const res = await fetch(`${CF_WORKER}/api/query`, {
        method: "POST",
        headers: { "X-BrainForge-Secret": WORKER_SECRET, "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlQuery }),
      });
      const data = await res.json();
      setSqlResult(data);
      if (!res.ok) toast.error("Query failed");
    } catch (e: any) {
      setSqlResult({ error: e.message });
      toast.error("Query error");
    }
    setSqlLoading(false);
  };

  const exportCSV = (rows: any[], filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${filename}.csv`;
    a.click();
    toast.success("CSV downloaded!");
  };

  const handleBackup = async () => {
    setBackupMsg("Backing up...");
    try {
      const res = await fetch(`${CF_WORKER}/api/backup`, {
        method: "POST", headers: { "X-BrainForge-Secret": WORKER_SECRET }
      });
      if (res.ok) { setBackupMsg("✓ Done"); toast.success("D1 backup complete!"); }
      else { setBackupMsg("Failed"); toast.error("Backup failed"); }
    } catch { setBackupMsg("Error"); }
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

  const sizeNum = parseFloat(d1Stats?.size || "0");
  const sizeWarning = sizeNum > 400;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5" style={{ color: accentColor }} />
          Database
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">D1, Supabase, aur local storage manage karo</p>
      </div>

      {/* Storage warning */}
      {sizeWarning && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "oklch(0.55 0.25 40 / 0.1)", border: "1px solid oklch(0.55 0.25 40 / 0.4)" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "oklch(0.75 0.25 50)" }} />
          <p className="text-xs" style={{ color: "oklch(0.80 0.20 50)" }}>D1 storage almost full ({d1Stats?.size}). Abhi backup lo aur purana data clear karo.</p>
        </div>
      )}

      {/* Cloudflare D1 -- Main Section */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(0.18 0.06 280)" }}>
          <div>
            <p className="text-sm font-semibold text-foreground">Cloudflare D1</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {lastBackup ? `Last backup: ${lastBackup}` : "No backup found"}
            </p>
          </div>
          <button type="button" onClick={fetchD1Stats} disabled={d1Loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-all"
            style={{ background: "oklch(0.55 0.25 220 / 0.15)", border: "1px solid oklch(0.55 0.25 220 / 0.3)", color: accentColor }}>
            <RefreshCw className={`w-3 h-3 ${d1Loading ? "animate-spin" : ""}`} />
            {d1Loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* Stats */}
        {d1Stats ? (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[{ label: "Tables", val: d1Stats.tables ?? "?", color: "oklch(0.65 0.25 220)" },
                { label: "Rows", val: d1Stats.rows ?? "?", color: "oklch(0.65 0.20 160)" },
                { label: "Size", val: d1Stats.size ?? "?", color: sizeWarning ? "oklch(0.65 0.25 40)" : "oklch(0.65 0.18 280)" }
              ].map(item => (
                <div key={item.label} className="text-center p-3 rounded-lg" style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.16 0.05 280)" }}>
                  <p className="text-base font-bold" style={{ color: item.color }}>{String(item.val)}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Tables Explorer */}
            {d1Stats.tableList && d1Stats.tableList.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5" style={{ color: accentColor }} />
                  Tables Explorer
                </p>
                <div className="space-y-1">
                  {d1Stats.tableList.map(t => (
                    <button key={t.name} type="button" onClick={() => fetchTableRows(t.name)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left"
                      style={selectedTable === t.name
                        ? { background: "oklch(0.55 0.25 220 / 0.2)", border: "1px solid oklch(0.55 0.25 220 / 0.4)", color: accentColor }
                        : { background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.16 0.05 280)", color: "oklch(0.70 0.05 280)" }
                      }>
                      <span className="font-mono">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground">{t.rows} rows</span>
                    </button>
                  ))}
                </div>

                {/* Table rows preview */}
                {selectedTable && (
                  <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid oklch(0.18 0.06 280)" }}>
                    <div className="px-3 py-2 flex items-center justify-between" style={{ background: "oklch(0.08 0.02 280)", borderBottom: "1px solid oklch(0.15 0.05 280)" }}>
                      <p className="text-[10px] font-mono text-muted-foreground">{selectedTable}</p>
                      <div className="flex gap-2">
                        {tableRows.length > 0 && (
                          <button type="button" onClick={() => exportCSV(tableRows, selectedTable)}
                            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-all"
                            style={{ background: "oklch(0.55 0.20 160 / 0.15)", border: "1px solid oklch(0.55 0.20 160 / 0.3)", color: "oklch(0.65 0.20 160)" }}>
                            <Download className="w-2.5 h-2.5" />CSV
                          </button>
                        )}
                        <button type="button" onClick={() => setSelectedTable(null)}
                          className="text-[10px] text-muted-foreground hover:text-foreground">✕</button>
                      </div>
                    </div>
                    {tableLoading ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">Loading rows...</div>
                    ) : tableRows.length > 0 ? (
                      <div className="overflow-x-auto max-h-48">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr style={{ background: "oklch(0.08 0.02 280)" }}>
                              {Object.keys(tableRows[0]).map(col => (
                                <th key={col} className="px-3 py-1.5 text-left font-medium text-muted-foreground border-r last:border-r-0"
                                  style={{ borderColor: "oklch(0.15 0.05 280)" }}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tableRows.slice(0, 10).map((row, i) => (
                              <tr key={i} style={{ borderTop: "1px solid oklch(0.13 0.04 280)" }}>
                                {Object.values(row).map((val: any, j) => (
                                  <td key={j} className="px-3 py-1.5 text-muted-foreground border-r last:border-r-0 max-w-32 truncate"
                                    style={{ borderColor: "oklch(0.13 0.04 280)" }}>
                                    {String(val ?? "null")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {tableRows.length >= 10 && (
                          <p className="text-center py-1.5 text-[10px] text-muted-foreground" style={{ background: "oklch(0.08 0.02 280)" }}>
                            Showing 10 of {tableRows.length}+ rows
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-muted-foreground">No rows / Table not accessible via API</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground">Click "Refresh" to load D1 stats</div>
        )}

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <button type="button" onClick={handleBackup}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
            style={{ background: "oklch(0.55 0.25 220 / 0.1)", border: "1px solid oklch(0.55 0.25 220 / 0.3)", color: accentColor }}>
            <HardDrive className="w-3.5 h-3.5" />
            {backupMsg || "Backup → GitHub"}
          </button>
        </div>
      </div>

      {/* SQL Query Runner */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid oklch(0.18 0.06 280)" }}>
          <Play className="w-3.5 h-3.5" style={{ color: "oklch(0.65 0.25 160)" }} />
          <p className="text-sm font-semibold text-foreground">SQL Query Runner</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.55 0.25 40 / 0.15)", color: "oklch(0.70 0.25 50)" }}>Admin Only</span>
        </div>
        <div className="p-4 space-y-3">
          <textarea value={sqlQuery} onChange={e => setSqlQuery(e.target.value)} rows={3}
            className="w-full px-3 py-2 rounded-lg text-xs font-mono text-foreground resize-none focus:outline-none"
            style={{ background: "oklch(0.07 0.02 280)", border: "1px solid oklch(0.20 0.07 280 / 0.6)" }}
            placeholder="SELECT * FROM users LIMIT 10;" />
          <div className="flex gap-2">
            <button type="button" onClick={runSQL} disabled={sqlLoading || !sqlQuery.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50"
              style={{ background: "oklch(0.50 0.20 160)" }}>
              <Play className="w-3.5 h-3.5" />
              {sqlLoading ? "Running..." : "Run Query"}
            </button>
            {sqlResult?.rows?.length > 0 && (
              <button type="button" onClick={() => exportCSV(sqlResult.rows, "query-result")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{ background: "oklch(0.55 0.20 220 / 0.12)", border: "1px solid oklch(0.55 0.20 220 / 0.3)", color: accentColor }}>
                <Download className="w-3.5 h-3.5" />Export CSV
              </button>
            )}
          </div>
          {sqlResult && (
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid oklch(0.18 0.06 280)" }}>
              {sqlResult.error ? (
                <div className="p-3 text-xs text-red-400">{sqlResult.error}</div>
              ) : sqlResult.rows?.length > 0 ? (
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-[10px]">
                    <thead><tr style={{ background: "oklch(0.08 0.02 280)" }}>
                      {Object.keys(sqlResult.rows[0]).map((col: string) => (
                        <th key={col} className="px-3 py-1.5 text-left font-medium text-muted-foreground">{col}</th>
                      ))}
                    </tr></thead>
                    <tbody>{sqlResult.rows.slice(0,20).map((row: any, i: number) => (
                      <tr key={i} style={{ borderTop: "1px solid oklch(0.12 0.04 280)" }}>
                        {Object.values(row).map((val: any, j: number) => (
                          <td key={j} className="px-3 py-1.5 text-muted-foreground max-w-40 truncate">{String(val ?? "null")}</td>
                        ))}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-xs text-muted-foreground">
                  {sqlResult.success ? "Query successful — 0 rows returned" : JSON.stringify(sqlResult).substring(0, 200)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Supabase */}
      <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />Supabase
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Sirf tumhare banaye apps ke liye -- BrainForge D1 use karta hai.</p>
        </div>
        <FieldGroup label="Supabase URL">
          <input value={supUrl} onChange={e => setSupUrl(e.target.value)} placeholder="https://xxx.supabase.co"
            className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
            style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.25 0.08 280 / 0.5)" }} />
        </FieldGroup>
        <FieldGroup label="Anon Key">
          <input type="password" value={supKey} onChange={e => setSupKey(e.target.value)} placeholder="eyJhbGci..."
            className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
            style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.25 0.08 280 / 0.5)" }} />
        </FieldGroup>
        {(supUrl || supKey) && <p className="text-[10px] text-emerald-400">✓ Configured</p>}
        <button type="button" onClick={handleSupabaseSave}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
          style={{ background: "oklch(0.50 0.18 160)" }}>
          <Save className="w-4 h-4" />{supSaved ? "Saved ✓" : "Save Supabase Keys"}
        </button>
      </div>

      {/* Local Storage */}
      <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Local Storage</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Browser cache</p>
          </div>
          <span className="text-xs font-medium" style={{ color: localPct > 80 ? "oklch(0.65 0.25 25)" : accentColor }}>
            {localMB} MB / ~50 MB
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full" style={{ background: "oklch(0.15 0.04 280)" }}>
          <div className="h-2.5 rounded-full transition-all"
            style={{ width: `${localPct}%`, background: localPct > 80 ? "oklch(0.60 0.25 25)" : localPct > 50 ? "oklch(0.65 0.25 60)" : "oklch(0.60 0.20 220)" }} />
        </div>
        <button type="button" onClick={() => {
          if (!confirm("Sab local BrainForge data delete karo?")) return;
          const keep = ["bf_users","bf_feedback","bf_activity_log","bf_settings","bf_global_ai_rules"];
          Object.keys(localStorage).filter(k => k.startsWith("bf_") && !keep.includes(k)).forEach(k => localStorage.removeItem(k));
          toast.success("Local data cleared");
        }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
          style={{ background: "oklch(0.55 0.25 25 / 0.08)", border: "1px solid oklch(0.55 0.25 25 / 0.25)", color: "oklch(0.65 0.25 25)" }}>
          <Trash2 className="w-3.5 h-3.5" />Clear Local Data
        </button>
      </div>
    </div>
  );
}
