import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  Code2,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  Loader2,
  Monitor,
  RefreshCw,
  Rocket,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChatMessage } from "../hooks/useTermux";

interface PreviewPanelProps {
  messages: ChatMessage[];
  termuxUrl: string;
  projectName: string;
}

/** Extract latest code from AI messages.
 * Supports full <!DOCTYPE html> documents AND separate html/css/js blocks. */
function extractCode(messages: ChatMessage[]) {
  let fullDoc = "";
  let html = "";
  let css = "";
  let js = "";

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    // Check for full HTML document
    const fullMatch = msg.content.match(/```html\n?([\s\S]*?)```/i);
    if (fullMatch) {
      const code = fullMatch[1].trim();
      if (
        code.toLowerCase().includes("<!doctype html") ||
        code.toLowerCase().includes("<html")
      ) {
        fullDoc = code;
        // Reset partials when full doc found
        html = "";
        css = "";
        js = "";
        continue;
      }
      html = code;
      fullDoc = "";
    }
    // Separate blocks
    const cssMatch = msg.content.match(/```css\n?([\s\S]*?)```/i);
    const jsMatch = msg.content.match(/```(?:javascript|js)\n?([\s\S]*?)```/i);
    if (cssMatch) {
      css = cssMatch[1];
      fullDoc = "";
    }
    if (jsMatch) {
      js = jsMatch[1];
      fullDoc = "";
    }
  }
  return { fullDoc, html, css, js };
}

function buildSafeDoc(
  html: string,
  css: string,
  js: string,
  fullDoc?: string,
): string {
  if (fullDoc) {
    // Inject safety script into full doc
    const safetyScript = `<script>
try {
  Object.defineProperty(window,'parent',{get:function(){return window;},configurable:true});
  Object.defineProperty(window,'top',{get:function(){return window;},configurable:true});
} catch(e){}
window.onerror=function(m,s,l){
  try{window.parent.postMessage({type:'PREVIEW_ERROR',error:m+' (line '+l+')'},'*');}catch(e2){}
  return true;
};
window.addEventListener('unhandledrejection',function(e){
  try{window.parent.postMessage({type:'PREVIEW_ERROR',error:String(e.reason)},'*');}catch(e2){}
});
<\/script>`;
    return (
      fullDoc.replace(/<head>/i, `<head>\n${safetyScript}`) ||
      fullDoc.replace(/<html/i, `<head>${safetyScript}</head><html`)
    );
  }
  if (!html && !css && !js) return "";
  const closeScript = "</" + "script>";
  const safetyScript = `<script>
try {
  Object.defineProperty(window,'parent',{get:function(){return window;},configurable:true});
  Object.defineProperty(window,'top',{get:function(){return window;},configurable:true});
} catch(e){}
window.onerror=function(m,s,l){
  try{window.parent.postMessage({type:'PREVIEW_ERROR',error:m+' (line '+l+')'},'*');}catch(e2){}
  return true;
};
window.addEventListener('unhandledrejection',function(e){
  try{window.parent.postMessage({type:'PREVIEW_ERROR',error:String(e.reason)},'*');}catch(e2){}
});
${closeScript}`;
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
${closeScript}
</body>
</html>`;
}

export function PreviewPanel({ messages, projectName }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [editedHtml, setEditedHtml] = useState("");
  const [editedCss, setEditedCss] = useState("");
  const [editedJs, setEditedJs] = useState("");
  const [editedFullDoc, setEditedFullDoc] = useState("");
  const [selectedFile, setSelectedFile] = useState("index.html");
  const [unsaved, setUnsaved] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [appliedDoc, setAppliedDoc] = useState("");
  const [mobileFrame, setMobileFrame] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string>(
    () => localStorage.getItem(`bf_deploy_url_${projectName}`) || "",
  );

  const { fullDoc, html, css, js } = useMemo(
    () => extractCode(messages),
    [messages],
  );
  const aiSrcDoc = useMemo(
    () => buildSafeDoc(html, css, js, fullDoc || undefined),
    [fullDoc, html, css, js],
  );
  const hasCode = !!(fullDoc || html || css || js);

  // Sync edited state when new AI code arrives
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (fullDoc) {
      setEditedFullDoc(fullDoc);
      setEditedHtml("");
      setEditedCss("");
      setEditedJs("");
    } else {
      setEditedHtml(html);
      setEditedCss(css);
      setEditedJs(js);
      setEditedFullDoc("");
    }
    setUnsaved(false);
    setAppliedDoc("");
  }, [aiSrcDoc]);

  const currentSrcDoc = appliedDoc || aiSrcDoc;

  const isFullDocMode = !!(fullDoc || editedFullDoc);

  const getEditContent = (file: string): string => {
    if (isFullDocMode) return editedFullDoc;
    if (file === "index.html") return editedHtml;
    if (file === "style.css") return editedCss;
    if (file === "script.js") return editedJs;
    return "";
  };

  const setEditContent = (file: string, val: string) => {
    setUnsaved(true);
    if (isFullDocMode) {
      setEditedFullDoc(val);
      return;
    }
    if (file === "index.html") setEditedHtml(val);
    else if (file === "style.css") setEditedCss(val);
    else if (file === "script.js") setEditedJs(val);
  };

  const handleApply = () => {
    const doc = isFullDocMode
      ? buildSafeDoc("", "", "", editedFullDoc)
      : buildSafeDoc(editedHtml, editedCss, editedJs);
    setAppliedDoc(doc);
    setUnsaved(false);
    setPreviewKey((k) => k + 1);
    setActiveTab("preview");
  };

  const handleReset = () => {
    if (fullDoc) {
      setEditedFullDoc(fullDoc);
      setEditedHtml("");
      setEditedCss("");
      setEditedJs("");
    } else {
      setEditedHtml(html);
      setEditedCss(css);
      setEditedJs(js);
    }
    setUnsaved(false);
    setAppliedDoc("");
  };

  const exportZip = async () => {
    if (!hasCode) return;
    setExporting(true);
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).JSZip) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
      });
      const zip = new (window as any).JSZip();
      if (isFullDocMode) {
        zip.file("index.html", editedFullDoc || fullDoc);
      } else {
        zip.file("index.html", editedHtml || html || "");
        zip.file("style.css", editedCss || css || "");
        zip.file("script.js", editedJs || js || "");
      }
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
    if (!token) {
      alert("Add GitHub token in Settings \u2192 GitHub & Deploy.");
      return;
    }
    if (!repo) {
      alert("Add GitHub repo in Settings \u2192 GitHub & Deploy.");
      return;
    }
    if (!hasCode) {
      alert("No code to deploy yet.");
      return;
    }

    const docToUse = appliedDoc || aiSrcDoc;
    setDeploying(true);
    try {
      const path = `docs/${projectName}/index.html`;
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
      const getRes = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const existingSha = getRes.ok ? (await getRes.json()).sha : undefined;
      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `deploy: ${projectName}`,
          content: btoa(unescape(encodeURIComponent(docToUse))),
          ...(existingSha ? { sha: existingSha } : {}),
        }),
      });
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err?.message || `Deploy failed: ${putRes.status}`);
      }
      const url = `https://cdn.jsdelivr.net/gh/${repo}@main/${path}`;
      setDeployUrl(url);
      localStorage.setItem(`bf_deploy_url_${projectName}`, url);
      const projects = JSON.parse(localStorage.getItem("bf_projects") || "[]");
      localStorage.setItem(
        "bf_projects",
        JSON.stringify(
          projects.map((p: any) =>
            p.name === projectName ? { ...p, deployUrl: url } : p,
          ),
        ),
      );
      alert(
        `Deployed! Live at: ${url}\n\nNote: CDN may take 1-2 minutes to update after first deploy.`,
      );
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeploying(false);
    }
  };

  const files = isFullDocMode
    ? [
        {
          name: "index.html",
          icon: <FileText className="w-3.5 h-3.5 text-orange-400" />,
        },
      ]
    : [
        {
          name: "index.html",
          icon: <FileText className="w-3.5 h-3.5 text-orange-400" />,
        },
        {
          name: "style.css",
          icon: <FileCode className="w-3.5 h-3.5 text-blue-400" />,
        },
        {
          name: "script.js",
          icon: <FileCode className="w-3.5 h-3.5 text-yellow-400" />,
        },
      ];

  return (
    <div
      className="flex flex-col h-full bg-background"
      data-ocid="preview.panel"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border shrink-0">
        {/* View toggle */}
        <div className="flex items-center rounded-md border border-border overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-[11px] transition-colors",
              activeTab === "preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
            data-ocid="preview.tab"
          >
            <Monitor className="w-3 h-3" /> Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-[11px] border-l border-border transition-colors",
              activeTab === "edit"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
            data-ocid="preview.edit.tab"
          >
            <Code2 className="w-3 h-3" /> Edit{unsaved ? " *" : ""}
          </button>
        </div>

        <div className="flex-1" />

        {hasCode && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={exportZip}
              disabled={exporting}
              title="Export as ZIP"
              data-ocid="preview.export.button"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
            </Button>
            {activeTab === "preview" && (
              <>
                <Button
                  variant={mobileFrame ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setMobileFrame((v) => !v)}
                  title={mobileFrame ? "Desktop view" : "Mobile view"}
                  data-ocid="preview.mobile.toggle"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setPreviewKey((k) => k + 1)}
                  title="Refresh"
                  data-ocid="preview.refresh.button"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            {activeTab === "edit" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  onClick={handleReset}
                  title="Reset to AI code"
                  data-ocid="preview.reset.button"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={handleApply}
                  disabled={!unsaved}
                  data-ocid="preview.apply.button"
                >
                  <Check className="w-3 h-3" /> Apply
                </Button>
              </>
            )}
            {deployUrl && (
              <a
                href={deployUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-green-400 hover:underline shrink-0"
              >
                <ExternalLink className="w-3 h-3" /> Live
              </a>
            )}
            <button
              type="button"
              onClick={deployApp}
              disabled={deploying}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-medium shrink-0 disabled:opacity-50 transition-colors"
              data-ocid="preview.deploy.button"
            >
              {deploying ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-3 h-3" /> Deploy
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Preview tab */}
      {activeTab === "preview" && (
        <div className="flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {currentSrcDoc ? (
            <div
              className={cn(
                "h-full flex items-center justify-center",
                mobileFrame ? "p-4" : "p-0",
              )}
            >
              <div
                className={cn(
                  mobileFrame
                    ? "w-[375px] h-full max-h-[812px] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-zinc-700 bg-white relative"
                    : "w-full h-full",
                )}
              >
                {mobileFrame && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-700 rounded-b-xl z-10" />
                )}
                <iframe
                  key={previewKey}
                  srcDoc={currentSrcDoc}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                  title="App Preview"
                  className="w-full h-full border-0 bg-white"
                  data-ocid="preview.canvas_target"
                />
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3"
              data-ocid="preview.empty_state"
            >
              <Monitor className="w-10 h-10 opacity-20" />
              <p className="text-sm">Preview will appear here</p>
              <p className="text-xs opacity-50">
                Ask AI to build something in chat
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit tab */}
      {activeTab === "edit" && (
        <div className="flex flex-1 overflow-hidden">
          {!isFullDocMode && (
            <div
              className="w-36 shrink-0 border-r border-border flex flex-col"
              style={{ background: "oklch(0.09 0 0)" }}
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Files
                </p>
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
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20",
                    )}
                  >
                    {file.icon}
                    <span className="truncate font-mono">{file.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isFullDocMode && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0"
                style={{ background: "oklch(0.09 0 0)" }}
              >
                <FileText className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[11px] font-mono text-foreground">
                  index.html
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {(editedFullDoc || fullDoc).split("\n").length} lines
                </span>
              </div>
            )}
            <textarea
              value={getEditContent(selectedFile)}
              onChange={(e) => setEditContent(selectedFile, e.target.value)}
              className="flex-1 resize-none p-3 text-[11px] font-mono leading-relaxed focus:outline-none"
              style={{
                background: "oklch(0.07 0 0)",
                color: "#4ade80",
                minHeight: 0,
              }}
              placeholder="// Code will appear here after AI generates it"
              data-ocid="preview.editor"
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
