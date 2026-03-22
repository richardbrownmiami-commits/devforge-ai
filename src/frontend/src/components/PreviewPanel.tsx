import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Code2,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  Loader2,
  Monitor,
  RefreshCw,
  Rocket,
  Smartphone,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ChatMessage } from "../hooks/useTermux";

interface PreviewPanelProps {
  messages: ChatMessage[];
  termuxUrl: string;
  projectName: string;
}

interface CodeFile {
  name: string;
  language: string;
  content: string;
  icon: React.ReactNode;
}

/** Extract latest HTML/CSS/JS blocks from AI messages */
function extractCode(messages: ChatMessage[]) {
  let html = "";
  let css = "";
  let js = "";
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const blocks = msg.content.matchAll(/```(html|css|javascript|js)\n?([\s\S]*?)```/gi);
    for (const m of blocks) {
      const lang = m[1].toLowerCase();
      if (lang === "html") html = m[2];
      else if (lang === "css") css = m[2];
      else if (lang === "javascript" || lang === "js") js = m[2];
    }
  }
  return { html, css, js };
}

/**
 * Build a safe preview document.
 * Injects a script that overrides window.parent and window.top
 * to point back to the iframe window itself -- permanently fixes
 * the cross-origin 'document' error caused by AI-generated apps
 * that try to access window.parent.document.
 */
function buildSafeDoc(html: string, css: string, js: string): string {
  if (!html && !css && !js) return "";
  const safetyScript = `<script>
// Safety: prevent cross-origin errors from AI-generated code
try {
  Object.defineProperty(window, 'parent', { get: function() { return window; }, configurable: true });
  Object.defineProperty(window, 'top', { get: function() { return window; }, configurable: true });
} catch(e) {}
// Error reporter for auto-fix
window.onerror = function(m,s,l) {
  try { window.parent.postMessage({type:'PREVIEW_ERROR',error:m+' (line '+l+')'},'*'); } catch(e) {}
  return true;
};
window.addEventListener('unhandledrejection',function(e){
  try { window.parent.postMessage({type:'PREVIEW_ERROR',error:String(e.reason)},'*'); } catch(e2) {}
});
</script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${safetyScript}
<style>
* { box-sizing: border-box; }
${css}
</style>
</head>
<body>
${html}
<script>
${js}
</scr` + `ipt>
</body>
</html>`;
}

export function PreviewPanel({ messages, projectName }: PreviewPanelProps) {
  const [view, setView] = useState<"preview" | "files">("preview");
  const [selectedFile, setSelectedFile] = useState<string>("index.html");
  const [previewKey, setPreviewKey] = useState(0);
  const [mobileFrame, setMobileFrame] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string>(
    () => localStorage.getItem(`bf_deploy_url_${projectName}`) || ""
  );

  const { html, css, js } = extractCode(messages);
  const srcDoc = useMemo(() => buildSafeDoc(html, css, js), [html, css, js]);
  const hasCode = !!(html || css || js);

  // Code folder files
  const files: CodeFile[] = [
    {
      name: "index.html",
      language: "html",
      content: html || "<!-- No HTML generated yet -->",
      icon: <FileText className="w-3.5 h-3.5 text-orange-400" />,
    },
    {
      name: "style.css",
      language: "css",
      content: css || "/* No CSS generated yet */",
      icon: <FileCode className="w-3.5 h-3.5 text-blue-400" />,
    },
    {
      name: "script.js",
      language: "javascript",
      content: js || "// No JavaScript generated yet",
      icon: <FileCode className="w-3.5 h-3.5 text-yellow-400" />,
    },
  ];

  const activeFile = files.find((f) => f.name === selectedFile) || files[0];

  const exportZip = async () => {
    if (!hasCode) return;
    setExporting(true);
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).JSZip) { resolve(); return; }
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
      });
      const zip = new (window as any).JSZip();
      zip.file("index.html", html || "");
      zip.file("style.css", css || "");
      zip.file("script.js", js || "");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName || "project"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const deployApp = async () => {
    const saved = JSON.parse(localStorage.getItem("bf_settings") || "{}");
    const token = saved.githubToken || "";
    const repo = saved.githubRepo || "";
    if (!token) { alert("Add GitHub token in Settings \u2192 GitHub & Deploy."); return; }
    if (!repo) { alert("Add GitHub repo in Settings \u2192 GitHub & Deploy."); return; }
    if (!hasCode) { alert("No code to deploy yet. Ask the AI to build something first."); return; }

    const fullHtml = buildSafeDoc(html, css, js);
    setDeploying(true);
    try {
      const path = `public/projects/${projectName}/index.html`;
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
      const getRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      const existingSha = getRes.ok ? (await getRes.json()).sha : undefined;
      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `deploy: ${projectName}`,
          content: btoa(unescape(encodeURIComponent(fullHtml))),
          ...(existingSha ? { sha: existingSha } : {}),
        }),
      });
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err?.message || `Deploy failed: ${putRes.status}`);
      }
      const url = `https://raw.githack.com/${repo}/main/${path}`;
      setDeployUrl(url);
      localStorage.setItem(`bf_deploy_url_${projectName}`, url);
      const projects = JSON.parse(localStorage.getItem("bf_projects") || "[]");
      localStorage.setItem("bf_projects", JSON.stringify(
        projects.map((p: any) => p.name === projectName ? { ...p, deployUrl: url } : p)
      ));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" data-ocid="preview.panel">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border shrink-0">
        {/* View toggle: Preview / Code */}
        <div className="flex items-center rounded-md border border-border overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setView("preview")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-[11px] transition-colors",
              view === "preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            data-ocid="preview.tab"
          >
            <Monitor className="w-3 h-3" /> Preview
          </button>
          <button
            type="button"
            onClick={() => setView("files")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-[11px] border-l border-border transition-colors",
              view === "files"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            data-ocid="preview.files.tab"
          >
            <Code2 className="w-3 h-3" /> Code
          </button>
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        {hasCode && (
          <>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={exportZip} disabled={exporting} title="Export as ZIP"
              data-ocid="preview.export.button"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            </Button>
            {view === "preview" && (
              <>
                <Button
                  variant={mobileFrame ? "default" : "ghost"} size="icon"
                  className="h-7 w-7" onClick={() => setMobileFrame(v => !v)}
                  title={mobileFrame ? "Desktop view" : "Mobile view"}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setPreviewKey(k => k + 1)} title="Refresh"
                  data-ocid="preview.refresh.button"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            {deployUrl && (
              <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-green-400 hover:underline shrink-0"
                title="Open live app">
                <ExternalLink className="w-3 h-3" /> Live
              </a>
            )}
            <button
              type="button" onClick={deployApp} disabled={deploying}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-medium shrink-0 disabled:opacity-50 transition-colors"
              data-ocid="preview.deploy.button"
            >
              {deploying
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Deploying...</>
                : <><Rocket className="w-3 h-3" /> Deploy</>}
            </button>
          </>
        )}
      </div>

      {/* Preview view */}
      {view === "preview" && (
        <div className="flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {srcDoc ? (
            <div className={cn("h-full flex items-center justify-center", mobileFrame ? "p-4" : "p-0")}>
              <div className={cn(
                mobileFrame
                  ? "w-[375px] h-full max-h-[812px] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-zinc-700 bg-white relative"
                  : "w-full h-full"
              )}>
                {mobileFrame && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-700 rounded-b-xl z-10" />
                )}
                <iframe
                  key={previewKey}
                  srcDoc={srcDoc}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                  title="App Preview"
                  className="w-full h-full border-0 bg-white"
                  data-ocid="preview.canvas_target"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3" data-ocid="preview.empty_state">
              <Monitor className="w-10 h-10 opacity-20" />
              <p className="text-sm">Preview will appear here</p>
              <p className="text-xs opacity-50">Ask AI to build something in chat</p>
            </div>
          )}
        </div>
      )}

      {/* Code folder view */}
      {view === "files" && (
        <div className="flex flex-1 overflow-hidden">
          {/* File tree sidebar */}
          <div className="w-40 shrink-0 border-r border-border bg-muted/20 flex flex-col">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Code Files</p>
            </div>
            <div className="flex-1 py-1">
              {files.map((file) => (
                <button
                  key={file.name}
                  type="button"
                  onClick={() => setSelectedFile(file.name)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors text-left",
                    selectedFile === file.name
                      ? "bg-primary/15 text-foreground font-medium border-r-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                  data-ocid={`preview.file.${file.name}`}
                >
                  {file.icon}
                  <span className="truncate font-mono">{file.name}</span>
                  {selectedFile === file.name && <ChevronRight className="w-3 h-3 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-border">
              <p className="text-[9px] text-muted-foreground/50">
                {hasCode ? "\u2705 Code ready" : "\u23f3 Waiting for AI"}
              </p>
            </div>
          </div>

          {/* File content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/10 shrink-0">
              {activeFile.icon}
              <span className="text-[11px] font-mono text-foreground">{activeFile.name}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {activeFile.content.split("\n").length} lines
              </span>
            </div>
            <ScrollArea className="flex-1">
              <pre
                className="p-3 text-[11px] font-mono leading-relaxed text-foreground"
                style={{ background: "oklch(0.08 0 0)", minHeight: "100%" }}
                data-ocid="preview.editor"
              >
                <code>{activeFile.content}</code>
              </pre>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
