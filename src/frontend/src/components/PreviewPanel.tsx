import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronRight, Code2, Download, ExternalLink, FileCode, FileText, Loader2, Monitor, RefreshCw, Rocket, RotateCcw, Save, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppLanguage } from "../hooks/useAIChat";
import type { ChatMessage } from "../hooks/useTermux";

interface PreviewPanelProps {
  messages: ChatMessage[];
  termuxUrl: string;
  projectName: string;
  language?: AppLanguage;
}

function extractCode(messages: ChatMessage[]) {
  let html = "", css = "", js = "";
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const full = msg.content.match(/```html\n?([\s\S]*?)```/i);
    if (full && (full[1].includes("<!DOCTYPE") || full[1].includes("<html"))) { html = full[1]; css = ""; js = ""; continue; }
    for (const m of msg.content.matchAll(/```(html|css|javascript|js|jsx|tsx|ts)\n?([\s\S]*?)```/gi)) {
      const l = m[1].toLowerCase();
      if (l === "html") html = m[2]; else if (l === "css") css = m[2]; else js = m[2];
    }
  }
  return { html, css, js };
}

// Detect if project looks like a website (needs deploy) vs a tool/app
function detectIsWebsite(html: string, projectName: string, messages: ChatMessage[]): boolean {
  const combined = (html + " " + projectName + " " + messages.map(m => m.content).join(" ")).toLowerCase();
  const websiteKeywords = ["landing page", "website", "portfolio", "blog", "homepage", "about us", "contact", "hero section", "navbar", "header", "footer", "seo", "og:", "meta description", "business website", "company site"];
  const appKeywords = ["todo", "calculator", "game", "expense", "tracker", "timer", "converter", "generator", "tool", "quiz", "chat", "pomodoro", "notes app", "budget", "counter", "stopwatch", "puzzle"];
  const websiteScore = websiteKeywords.filter(k => combined.includes(k)).length;
  const appScore = appKeywords.filter(k => combined.includes(k)).length;
  if (websiteScore > 0 && websiteScore >= appScore) return true;
  if (appScore > 0) return false;
  // Default: if has nav + multiple sections = website
  return html.includes("<nav") || html.includes("hero") || (html.match(/<section/g) || []).length >= 2;
}

const SAFETY = `<scr`+`ipt>try{Object.defineProperty(window,'parent',{get:()=>window,configurable:true});Object.defineProperty(window,'top',{get:()=>window,configurable:true});}catch(e){}var _ce=console.error;console.error=function(){try{window.parent.postMessage({type:'PREVIEW_ERROR',error:[...arguments].join(' ')},'*');}catch(e){}_ce.apply(console,arguments);};window.onerror=function(m,s,l){try{window.parent.postMessage({type:'PREVIEW_ERROR',error:m+' (line '+l+')'},'*');}catch(e){}return true;};window.addEventListener('unhandledrejection',e=>{try{window.parent.postMessage({type:'PREVIEW_ERROR',error:String(e.reason)},'*');}catch(e2){}});</scr`+`ipt>`;

function buildDoc(html: string, css: string, js: string, language: AppLanguage = "html"): string {
  if (!html && !css && !js) return "";
  if (html.includes("<!DOCTYPE") || html.includes("<html")) {
    return html.replace(/<head>/i, `<head>${SAFETY}`);
  }
  if (language === "react" || language === "react-tailwind") {
    const tailwindCDN = language === "react-tailwind" ? '<script src="https://cdn.tailwindcss.com"></script>' : "";
    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
${tailwindCDN}
${SAFETY}
<style>body{margin:0;background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif}${css}</style>
</head><body><div id="root"></div>
<scr`+`ipt type="text/babel">
${js || html}
</scr`+`ipt></body></html>`;
  }
  if (language === "typescript") {
    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
${SAFETY}
<style>body{margin:0;background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif}${css}</style>
</head><body><div id="app"></div>
<scr`+`ipt type="text/babel" data-presets="typescript">
${js || html}
</scr`+`ipt></body></html>`;
  }
  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${SAFETY}<style>*{box-sizing:border-box}${css}</style>
</head><body>${html}<scr`+`ipt>${js}</scr`+`ipt></body></html>`;
}

// ===== APK Export Modal =====
function ApkModal({ projectName, onClose, onPublishFirst, publishedUrl }: {
  projectName: string; onClose: () => void; onPublishFirst: () => Promise<string | null>; publishedUrl?: string;
}) {
  const [step, setStep] = useState<"choice" | "publishing" | "pwabuilder" | "iphone">("choice");
  const [liveUrl, setLiveUrl] = useState(publishedUrl || "");
  const [publishing, setPublishing] = useState(false);

  const handleAndroid = async () => {
    if (liveUrl) { setStep("pwabuilder"); return; }
    setPublishing(true);
    const url = await onPublishFirst();
    setPublishing(false);
    if (url) { setLiveUrl(url); setStep("pwabuilder"); }
    else { alert("Pehle app publish karo ya GitHub deploy karo."); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "oklch(0 0 0 / 0.7)" }}>
      <div className="w-full max-w-sm rounded-2xl border p-6 space-y-4 shadow-2xl" style={{ background: "oklch(0.10 0.025 280)", borderColor: "oklch(0.30 0.15 280 / 0.5)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">📱 App Export</h3>
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        {step === "choice" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Platform chunno:</p>
            <button type="button" onClick={handleAndroid} disabled={publishing}
              className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{ background: "oklch(0.55 0.25 120 / 0.1)", border: "1px solid oklch(0.55 0.25 120 / 0.3)" }}>
              <div className="flex items-center gap-3">
                {publishing ? <Loader2 className="w-5 h-5 animate-spin text-green-400" /> : <span className="text-xl">🤖</span>}
                <div>
                  <p className="text-sm font-semibold text-foreground">Android APK</p>
                  <p className="text-xs text-muted-foreground">PWABuilder se APK banao</p>
                </div>
              </div>
            </button>
            <button type="button" onClick={() => setStep("iphone")}
              className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{ background: "oklch(0.55 0.10 240 / 0.1)", border: "1px solid oklch(0.55 0.10 240 / 0.3)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🍎</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">iPhone (iOS)</p>
                  <p className="text-xs text-muted-foreground">Home Screen pe add karo (PWA)</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {step === "pwabuilder" && (
          <div className="space-y-3">
            <div className="rounded-lg p-3 text-xs" style={{ background: "oklch(0.55 0.25 120 / 0.1)", border: "1px solid oklch(0.55 0.25 120 / 0.3)" }}>
              <p className="text-green-300 font-semibold mb-2">✅ App URL ready hai!</p>
              <p className="font-mono text-[10px] text-muted-foreground break-all">{liveUrl}</p>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Steps:</p>
              <p>1. Neeche wala button dabao → PWABuilder khulega</p>
              <p>2. URL already fill hoga → "Package for stores" click karo</p>
              <p>3. Android → "Generate Package" → APK download karo</p>
              <p>4. Phone mein install karo (Unknown sources allow karo)</p>
            </div>
            <a href={`https://www.pwabuilder.com/?url=${encodeURIComponent(liveUrl)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: "oklch(0.55 0.25 120)" }}>
              <ExternalLink className="w-4 h-4" /> PWABuilder Kholo
            </a>
            <button type="button" onClick={() => setStep("choice")} className="w-full text-xs text-center py-1 text-muted-foreground">← Wapas</button>
          </div>
        )}

        {step === "iphone" && (
          <div className="space-y-3">
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-foreground">iPhone pe App Install Karne Ka Tarika:</p>
              <div className="space-y-1.5 text-muted-foreground">
                <p>1. <span className="text-foreground">App publish karo</span> → Live URL lo</p>
                <p>2. iPhone mein <span className="text-foreground">Safari</span> se woh URL kholo</p>
                <p>3. Neeche Share button <span className="text-foreground">⎋</span> dabao</p>
                <p>4. <span className="text-foreground">"Add to Home Screen"</span> select karo</p>
                <p>5. Name confirm karo → <span className="text-foreground">Add</span></p>
              </div>
              <div className="rounded-lg p-2.5 mt-2" style={{ background: "oklch(0.50 0.15 40 / 0.15)", border: "1px solid oklch(0.50 0.15 40 / 0.3)" }}>
                <p className="text-amber-300 text-[10px]">⚠️ Data Warning: iOS mein agar 7 din app na kholo toh Safari data clear kar sakta hai. Backup/Restore feature use karo.</p>
              </div>
            </div>
            {liveUrl ? (
              <a href={liveUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: "oklch(0.50 0.10 240)" }}>
                <ExternalLink className="w-4 h-4" /> App URL Kholo
              </a>
            ) : (
              <button type="button" onClick={handleAndroid} disabled={publishing}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: "oklch(0.50 0.10 240)" }}>
                {publishing ? "Publishing..." : "Pehle Publish Karo"}
              </button>
            )}
            <button type="button" onClick={() => setStep("choice")} className="w-full text-xs text-center py-1 text-muted-foreground">← Wapas</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PreviewPanel({ messages, projectName, language = "html" }: PreviewPanelProps) {
  const [view, setView] = useState<"preview"|"edit">("preview");
  const [selFile, setSelFile] = useState<"index.html"|"style.css"|"script.js">("index.html");
  const [previewKey, setPreviewKey] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState(() => localStorage.getItem(`bf_deploy_url_${projectName}`) || "");
  const [publishedUrl, setPublishedUrl] = useState(() => localStorage.getItem(`bf_published_url_${projectName}`) || "");
  const [editHtml, setEditHtml] = useState("");
  const [editCss, setEditCss] = useState("");
  const [editJs, setEditJs] = useState("");
  const [unsaved, setUnsaved] = useState(false);
  const [liveDoc, setLiveDoc] = useState("");
  const [showApkModal, setShowApkModal] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const prevHtml = useRef("");

  const { html: aiHtml, css: aiCss, js: aiJs } = extractCode(messages);

  useEffect(() => {
    if (aiHtml && aiHtml !== prevHtml.current) {
      prevHtml.current = aiHtml; setEditHtml(aiHtml); setEditCss(aiCss); setEditJs(aiJs);
      setUnsaved(false); setLiveDoc("");
    }
  }, [aiHtml, aiCss, aiJs]);

  const html = editHtml || aiHtml, css = editCss || aiCss, js = editJs || aiJs;
  const srcDoc = useMemo(() => liveDoc || buildDoc(html, css, js, language), [liveDoc, html, css, js, language]);
  const hasCode = !!(html || css || js);

  // Smart deploy: show deploy only for websites
  const isWebsite = hasCode ? detectIsWebsite(html, projectName, messages) : false;

  const getContent = (f: string) => f === "index.html" ? (html || "<!-- No HTML yet -->") : f === "style.css" ? (css || "/* No CSS yet */") : (js || "// No JS yet");
  const setContent = (f: string, v: string) => { if (f === "index.html") setEditHtml(v); else if (f === "style.css") setEditCss(v); else setEditJs(v); setUnsaved(true); };

  const applyEdits = () => {
    const h = selFile === "index.html" ? (taRef.current?.value || editHtml) : editHtml;
    const c = selFile === "style.css" ? (taRef.current?.value || editCss) : editCss;
    const j = selFile === "script.js" ? (taRef.current?.value || editJs) : editJs;
    setLiveDoc(buildDoc(h, c, j, language)); setPreviewKey(k => k+1); setUnsaved(false); setView("preview");
  };

  const resetToAi = () => { setEditHtml(aiHtml); setEditCss(aiCss); setEditJs(aiJs); setLiveDoc(""); setUnsaved(false); setPreviewKey(k => k+1); };

  const files = [
    { name: "index.html" as const, icon: <FileText className="w-3.5 h-3.5 text-orange-400" /> },
    { name: "style.css" as const, icon: <FileCode className="w-3.5 h-3.5 text-blue-400" /> },
    { name: "script.js" as const, icon: <FileCode className="w-3.5 h-3.5 text-yellow-400" /> },
  ];

  const exportZip = async () => {
    if (!hasCode) return; setExporting(true);
    try {
      await new Promise<void>((res, rej) => { if ((window as any).JSZip) { res(); return; } const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; sc.onload = () => res(); sc.onerror = rej; document.head.appendChild(sc); });
      const zip = new (window as any).JSZip();
      if (html.includes("<!DOCTYPE") || html.includes("<html")) { zip.file("index.html", html); }
      else { zip.file("index.html", srcDoc || buildDoc(html, css, js, language)); if (css) zip.file("style.css", css); if (js) zip.file("script.js", js); }
      const blob = await zip.generateAsync({ type: "blob" }); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${projectName}.zip`; a.click(); URL.revokeObjectURL(url);
    } catch { alert("Export failed."); } finally { setExporting(false); }
  };

  // Publish to BrainForge KV (for APK export URL)
  const publishToKv = async (): Promise<string | null> => {
    const doc = liveDoc || buildDoc(html, css, js, language);
    if (!doc) return null;
    try {
      const saved = JSON.parse(localStorage.getItem("bf_settings") || "{}");
      const workerUrl = saved.workerUrl || "https://brainforge-api.richard-brown-miami.workers.dev";
      const secret = saved.workerSecret || "";
      const res = await fetch(`${workerUrl}/api/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BrainForge-Secret": secret },
        body: JSON.stringify({ html: doc, projectName }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const url = `https://brainforge-7xn.pages.dev${data.url}`;
      setPublishedUrl(url);
      localStorage.setItem(`bf_published_url_${projectName}`, url);
      return url;
    } catch { return null; }
  };

  const deployApp = async () => {
    const saved = JSON.parse(localStorage.getItem("bf_settings") || "{}");
    const token = saved.githubToken || "", repo = saved.githubRepo || "";
    if (!token) { alert("Add GitHub token in Settings → GitHub & Deploy."); return; }
    if (!repo) { alert("Add GitHub repo in Settings → GitHub & Deploy."); return; }
    if (!hasCode) { alert("No code to deploy yet."); return; }
    setDeploying(true);
    try {
      const doc = liveDoc || buildDoc(html, css, js, language);
      const path = `docs/${projectName}/index.html`;
      const api = `https://api.github.com/repos/${repo}/contents/${path}`;
      const get = await fetch(api, { headers: { Authorization: `Bearer ${token}` } });
      const sha = get.ok ? (await get.json()).sha : undefined;
      const put = await fetch(api, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ message: `deploy: ${projectName}`, content: btoa(unescape(encodeURIComponent(doc))), ...(sha ? { sha } : {}) }) });
      if (!put.ok) { const e = await put.json().catch(() => ({})); throw new Error(e?.message || "Deploy failed"); }
      const u = `https://cdn.jsdelivr.net/gh/${repo}@main/${path}`;
      setDeployUrl(u); localStorage.setItem(`bf_deploy_url_${projectName}`, u);
      const ps = JSON.parse(localStorage.getItem("bf_projects") || "[]");
      localStorage.setItem("bf_projects", JSON.stringify(ps.map((p: any) => p.name === projectName ? { ...p, deployUrl: u } : p)));
      alert(`Deployed! Live at: ${u}`);
    } catch (e: any) { alert(e.message); } finally { setDeploying(false); }
  };

  return (
    <div className="flex flex-col h-full bg-background" data-ocid="preview.panel">
      {showApkModal && (
        <ApkModal
          projectName={projectName}
          onClose={() => setShowApkModal(false)}
          onPublishFirst={publishToKv}
          publishedUrl={publishedUrl || deployUrl}
        />
      )}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border shrink-0 flex-wrap">
        <div className="flex items-center rounded-md border border-border overflow-hidden shrink-0">
          <button type="button" onClick={() => setView("preview")} className={cn("flex items-center gap-1 px-2.5 py-1 text-[11px] transition-colors", view==="preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}><Monitor className="w-3 h-3" /> Preview</button>
          <button type="button" onClick={() => setView("edit")} className={cn("flex items-center gap-1 px-2.5 py-1 text-[11px] border-l border-border transition-colors", view==="edit" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}><Code2 className="w-3 h-3" /> Edit{unsaved?" *":""}</button>
        </div>
        <div className="flex-1" />
        {hasCode && (<>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={exportZip} disabled={exporting} title="Download ZIP">{exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}</Button>

          {/* APK/PWA Export Button - always show when has code */}
          <button type="button" onClick={() => setShowApkModal(true)}
            title="Export as Android APK or iOS PWA"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all hover:scale-105"
            style={{ background: "oklch(0.55 0.25 120 / 0.15)", border: "1px solid oklch(0.55 0.25 120 / 0.3)", color: "oklch(0.70 0.25 120)" }}>
            <Smartphone className="w-3 h-3" /> App
          </button>

          {view==="preview" && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setPreviewKey(k=>k+1)} title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></Button>
          )}
          {(deployUrl || publishedUrl) && <a href={deployUrl || publishedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-green-400 hover:underline shrink-0" title="Open live app"><ExternalLink className="w-3 h-3" /> Live</a>}

          {/* Smart Deploy - only show for websites */}
          {isWebsite ? (
            <button type="button" onClick={deployApp} disabled={deploying} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-medium shrink-0 disabled:opacity-50">
              {deploying ? <><Loader2 className="w-3 h-3 animate-spin" /> Deploying...</> : <><Rocket className="w-3 h-3" /> Deploy</>}
            </button>
          ) : (
            <button type="button" onClick={publishToKv}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-all hover:scale-105"
              style={{ background: "oklch(0.55 0.25 280 / 0.15)", border: "1px solid oklch(0.55 0.25 280 / 0.3)", color: "oklch(0.75 0.25 280)" }}>
              <Rocket className="w-3 h-3" /> Publish
            </button>
          )}
        </>)}
      </div>

      {view === "preview" && (
        <div className="flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {srcDoc ? (
            <div className={cn("h-full flex items-center justify-center", mobile?"p-4":"p-0")}>
              <div className={cn(mobile?"w-[375px] h-full max-h-[812px] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-zinc-700 bg-white relative":"w-full h-full")}>
                {mobile && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-700 rounded-b-xl z-10" />}
                <iframe key={previewKey} srcDoc={srcDoc} sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups" title="Preview" className="w-full h-full border-0 bg-white" data-ocid="preview.canvas_target" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Monitor className="w-10 h-10 opacity-20" />
              <p className="text-sm">Preview will appear here</p>
              <p className="text-xs opacity-50">Ask AI to build something in chat</p>
            </div>
          )}
        </div>
      )}

      {view === "edit" && (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-32 shrink-0 border-r border-border">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {files.map(f => (
                  <button type="button" key={f.name} onClick={() => setSelFile(f.name)}
                    className={cn("w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] transition-colors", selFile===f.name ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30")}>
                    {f.icon}{f.name.split(".")[1].toUpperCase()}
                  </button>
                ))}
                <div className="pt-2 space-y-1">
                  <button type="button" onClick={applyEdits} className="w-full flex items-center gap-1 px-2 py-1.5 rounded text-[11px] text-green-400 hover:bg-green-400/10 transition-colors"><Save className="w-3 h-3" /> Apply</button>
                  {unsaved && <button type="button" onClick={resetToAi} className="w-full flex items-center gap-1 px-2 py-1.5 rounded text-[11px] text-muted-foreground hover:bg-muted/30 transition-colors"><RotateCcw className="w-3 h-3" /> Reset</button>}
                </div>
              </div>
            </ScrollArea>
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <textarea ref={taRef} value={getContent(selFile)} onChange={e => setContent(selFile, e.target.value)}
              className="flex-1 resize-none font-mono text-[12px] p-3 bg-background text-foreground outline-none"
              spellCheck={false} />
          </div>
        </div>
      )}
    </div>
  );
}
