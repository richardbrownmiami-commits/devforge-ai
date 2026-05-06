import {
  AlertCircle,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const GH_REPO = "richardbrownmiami-commits/devforge-ai";
const CF_WORKER = "https://brainforge-api.richard-brown-miami.workers.dev";
function getWorkerSecret(): string { return JSON.parse(localStorage.getItem("bf_settings") || "{}").workerSecret || ""; }

function getGHToken() {
  return (
    JSON.parse(localStorage.getItem("bf_settings") || "{}").githubToken ||
    """"
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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

interface BackupFile {
  name: string;
  size: number;
  sha: string;
  date: string;
  downloadUrl: string;
}

export function BackupPage() {
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [totalSize, setTotalSize] = useState(0);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const token = getGHToken();
      const res = await fetch(
        `https://api.github.com/repos/${GH_REPO}/git/trees/main?recursive=1`,
        { headers: { Authorization: `token ${token}` } },
      );
      const data = await res.json();
      const backupFiles = (data.tree || []).filter(
        (f: any) => f.path.startsWith("backups/") && f.type === "blob",
      );

      // Get commit dates for files
      const filesWithDates = await Promise.all(
        backupFiles.slice(0, 10).map(async (f: any) => {
          try {
            const commitRes = await fetch(
              `https://api.github.com/repos/${GH_REPO}/commits?path=${f.path}&per_page=1`,
              { headers: { Authorization: `token ${token}` } },
            );
            const commits = commitRes.ok ? await commitRes.json() : [];
            return {
              name: f.path.split("/").pop() || f.path,
              size: f.size || 0,
              sha: f.sha,
              date:
                commits[0]?.commit?.author?.date || new Date().toISOString(),
              downloadUrl: `https://raw.githubusercontent.com/${GH_REPO}/main/${f.path}`,
            };
          } catch {
            return {
              name: f.path.split("/").pop() || f.path,
              size: f.size || 0,
              sha: f.sha,
              date: new Date().toISOString(),
              downloadUrl: `https://raw.githubusercontent.com/${GH_REPO}/main/${f.path}`,
            };
          }
        }),
      );

      setFiles(filesWithDates);
      setTotalSize(filesWithDates.reduce((acc, f) => acc + f.size, 0));
    } catch {
      toast.error("Failed to load backups");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const backupNow = async () => {
    setBackingUp(true);
    try {
      const res = await fetch(`${CF_WORKER}/backup`, {
        method: "POST",
        headers: { "x-secret": getWorkerSecret() },
      });
      if (res.ok) {
        toast.success("Backup triggered! Refreshing...");
        setTimeout(fetchBackups, 3000);
      } else toast.error("Backup request failed");
    } catch {
      toast.error("Backup failed — Worker may be offline");
    }
    setBackingUp(false);
  };

  const cardStyle = {
    background: "oklch(0.10 0.025 280)",
    border: "1px solid oklch(0.20 0.08 280)",
  };
  const accentColor = "oklch(0.65 0.25 280)";
  const MAX_STORAGE = 50 * 1024 * 1024; // 50MB estimate
  const usagePercent = Math.min((totalSize / MAX_STORAGE) * 100, 100);

  return (
    <div
      className="p-4 md:p-6 space-y-5 max-w-3xl"
      data-ocid="admin.backup.page"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Backup Manager</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            D1 database backups stored on GitHub
          </p>
        </div>
        <button
          type="button"
          onClick={fetchBackups}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
          style={{
            background: "oklch(0.55 0.25 280 / 0.15)",
            border: "1px solid oklch(0.55 0.25 280 / 0.3)",
            color: accentColor,
          }}
          data-ocid="admin.backup.refresh_button"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Storage meter */}
      <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" style={{ color: accentColor }} />
            <span className="text-sm font-medium text-foreground">
              Storage Usage
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatBytes(totalSize)} / 50 MB
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "oklch(0.15 0.03 280)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${usagePercent}%`,
              background:
                usagePercent > 80
                  ? "oklch(0.65 0.20 50)"
                  : usagePercent > 60
                    ? "oklch(0.65 0.18 80)"
                    : accentColor,
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          {files.length} backup files found
        </p>
      </div>

      {/* Backup now */}
      <button
        type="button"
        onClick={backupNow}
        disabled={backingUp}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
        style={{
          background: "oklch(0.55 0.20 160 / 0.8)",
          border: "1px solid oklch(0.65 0.20 160 / 0.4)",
        }}
        data-ocid="admin.backup.primary_button"
      >
        {backingUp ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <HardDrive className="w-4 h-4" />
        )}
        {backingUp ? "Creating backup..." : "Backup Now"}
      </button>

      {/* Files list */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Backup Files
        </h2>
        {loading ? (
          <div
            className="flex items-center justify-center py-12"
            data-ocid="admin.backup.loading_state"
          >
            <Loader2
              className="w-5 h-5 animate-spin"
              style={{ color: accentColor }}
            />
          </div>
        ) : files.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 rounded-xl text-center"
            style={cardStyle}
            data-ocid="admin.backup.empty_state"
          >
            <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No backups found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Backup Now" to create the first backup
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div
                key={f.sha}
                className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={cardStyle}
                data-ocid={`admin.backup.item.${i + 1}`}
              >
                <HardDrive className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {f.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatBytes(f.size)} · {timeAgo(f.date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={f.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    title="Download"
                    data-ocid={`admin.backup.download_button.${i + 1}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg transition-colors text-muted-foreground hover:text-yellow-400"
                    title="Restore"
                    onClick={() =>
                      toast.info("Contact admin to restore from backup")
                    }
                    data-ocid={`admin.backup.edit_button.${i + 1}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
