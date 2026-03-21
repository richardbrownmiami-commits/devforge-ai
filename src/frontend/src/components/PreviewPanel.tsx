import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, Monitor, Play, RefreshCw, Smartphone, Terminal } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { termuxRunCommand } from "../hooks/useTermux";
import type { ChatMessage } from "../hooks/useTermux";

interface PreviewPanelProps {
  messages: ChatMessage[];
  termuxUrl: string;
  projectName: string;
}

function extractCode(messages: ChatMessage[]) {
  let html = "";
  let css = "";
  let js = "";
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const blocks = msg.content.matchAll(/```(html|css|javascript|js)\n?([\s\S]*?)```/gi);
    for (const m of blocks) {
      const lang = m[1].toLowerCase();
      const code = m[2];
      if (lang === "html") html = code;
      else if (lang === "css") css = code;
      else if (lang === "javascript" || lang === "js") js = code;
    }
  }
  return { html, css, js };
}

function buildPreviewDoc(html: string, css: string, js: string): string {
  if (!html && !css && !js) return "";
  const errorScript = `<script>
window.onerror=function(m,s,l){window.parent.postMessage({type:'PREVIEW_ERROR',error:m+' (line '+l+')'},'*');return true;};
window.addEventListener('unhandledrejection',function(e){window.parent.postMessage({type:'PREVIEW_ERROR',error:String(e.reason)},'*');});
</script>`;
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n${errorScript}\n<style>\n* { box-sizing: border-box; }\n${css}\n</style>\n</head>\n<body>\n${html}\n<script>\n${js}\n</script>\n</body>\n</html>`;
}

const CODE_LANGS = ["html", "css", "js"] as const;

export function PreviewPanel({ messages, termuxUrl, projectName }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "html" | "css" | "js" | "terminal">("preview");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalCmd, setTerminalCmd] = useState("");
  const [running, setRunning] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [mobileView, setMobileView] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { html, css, js } = extractCode(messages);
  const srcDoc = useMemo(() => buildPreviewDoc(html, css, js), [html, css, js]);

  const runCommand = async () => {
    if (!terminalCmd.trim() || !termuxUrl) return;
    setRunning(true);
    setTerminalOutput((prev) => `${prev}\n$ ${terminalCmd}\n`);
    const result = await termuxRunCommand(termuxUrl, terminalCmd, projectName);
    setTerminalOutput((prev) => `${prev}${result.output}\n`);
    setRunning(false);
    setTerminalCmd("");
  };

  const exportZip = async () => {
    if (!srcDoc) return;
    setExporting(true);
    try {
      // Load JSZip from CDN
      await new Promise<void>((resolve, reject) => {
        if ((window as any).JSZip) { resolve(); return; }
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
      });
      const JSZip = (window as any).JSZip;
      const zip = new JSZip();
      zip.file("index.html", html || "<!-- empty -->");
      zip.file("style.css", css || "/* empty */");
      zip.file("script.js", js || "// empty");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName || "project"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Check your connection and try again.");
    } finally {
      setExporting(false);
    }
  };

  const codeForLang = (lang: "html" | "css" | "js") => {
    if (lang === "html") return html || "<!-- No HTML generated yet -->";
    if (lang === "css") return css || "/* No CSS generated yet */";
    return js || "// No JS generated yet";
  };

  return (
    <div className="flex flex-col h-full" data-ocid="preview.panel">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <TabsList className="bg-muted/50 h-8">
            <TabsTrigger value="preview" className="h-6 text-xs gap-1" data-ocid="preview.tab">
              <Monitor className="w-3 h-3" /> Preview
            </TabsTrigger>
            <TabsTrigger value="html" className="h-6 text-xs" data-ocid="preview.html.tab">HTML</TabsTrigger>
            <TabsTrigger value="css" className="h-6 text-xs" data-ocid="preview.css.tab">CSS</TabsTrigger>
            <TabsTrigger value="js" className="h-6 text-xs" data-ocid="preview.js.tab">JS</TabsTrigger>
            <TabsTrigger value="terminal" className="h-6 text-xs gap-1" data-ocid="preview.terminal.tab">
              <Terminal className="w-3 h-3" /> Term
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1">
            {/* Export ZIP */}
            {srcDoc && (
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={exportZip} disabled={exporting}
                title="Export as ZIP"
                data-ocid="preview.export.button"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              </Button>
            )}
            {activeTab === "preview" && (
              <>
                <Button variant={mobileView ? "default" : "ghost"} size="icon"
                  className="h-7 w-7" onClick={() => setMobileView((v) => !v)}
                  title={mobileView ? "Desktop view" : "Mobile view"}>
                  <Smartphone className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setPreviewKey((k) => k + 1)} data-ocid="preview.refresh.button">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        <TabsContent value="preview" className="flex-1 m-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {srcDoc ? (
            <div className={`h-full flex items-center justify-center ${mobileView ? "p-4" : "p-0"}`}>
              <div className={mobileView
                ? "w-[375px] h-full max-h-[812px] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-zinc-700 bg-white relative"
                : "w-full h-full"}>
                {mobileView && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-700 rounded-b-xl z-10" />
                )}
                {/* sandbox WITHOUT allow-same-origin -- prevents cross-origin errors */}
                <iframe
                  key={previewKey}
                  srcDoc={srcDoc}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                  title="Preview"
                  className="w-full h-full border-0 bg-white"
                  data-ocid="preview.canvas_target"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground" data-ocid="preview.empty_state">
              <Monitor className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Preview will appear here</p>
              <p className="text-xs opacity-60 mt-1">Ask AI to build something</p>
            </div>
          )}
        </TabsContent>

        {CODE_LANGS.map((lang) => (
          <TabsContent key={lang} value={lang} className="flex-1 m-0 overflow-auto">
            <pre className="code-editor p-4 text-xs text-foreground h-full" style={{ background: "oklch(0.08 0 0)" }}>
              <code>{codeForLang(lang)}</code>
            </pre>
          </TabsContent>
        ))}

        <TabsContent value="terminal" className="flex-1 m-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 font-mono text-xs"
            style={{ background: "oklch(0.07 0 0)", color: "oklch(0.8 0.1 145)" }}
            data-ocid="preview.editor">
            <div className="whitespace-pre-wrap">{terminalOutput || "Terminal ready. Enter a command below."}</div>
          </div>
          <div className="flex gap-2 p-3 border-t border-border bg-card shrink-0">
            <span className="font-mono text-xs text-primary self-center">$</span>
            <input type="text" value={terminalCmd} onChange={(e) => setTerminalCmd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runCommand()}
              placeholder={termuxUrl ? "Enter command..." : "Connect Termux in Settings"}
              disabled={!termuxUrl || running}
              className="flex-1 bg-transparent text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground"
              style={{ fontSize: "16px" }} data-ocid="preview.terminal.input" />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={runCommand}
              disabled={!termuxUrl || !terminalCmd.trim() || running} data-ocid="preview.terminal.submit_button">
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
