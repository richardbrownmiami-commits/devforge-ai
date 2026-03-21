import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Monitor, Play, RefreshCw, Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    const blocks = msg.content.matchAll(
      /```(html|css|javascript|js)\n?([\s\S]*?)```/gi,
    );
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
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${css}</style>
</head>
<body>
${html}
<script>${js}</script>
</body>
</html>`;
}

const CODE_LANGS = ["html", "css", "js"] as const;

export function PreviewPanel({
  messages,
  termuxUrl,
  projectName,
}: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "preview" | "html" | "css" | "js" | "terminal"
  >("preview");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalCmd, setTerminalCmd] = useState("");
  const [running, setRunning] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { html, css, js } = extractCode(messages);
  const previewDoc = buildPreviewDoc(html, css, js);

  useEffect(() => {
    if (!iframeRef.current || !previewDoc) return;
    const doc =
      iframeRef.current.contentDocument ||
      iframeRef.current.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(previewDoc);
    doc.close();
  }, [previewDoc]);

  const runCommand = async () => {
    if (!terminalCmd.trim() || !termuxUrl) return;
    setRunning(true);
    setTerminalOutput((prev) => `${prev}\n$ ${terminalCmd}\n`);
    const result = await termuxRunCommand(termuxUrl, terminalCmd, projectName);
    setTerminalOutput((prev) => `${prev}${result.output}\n`);
    setRunning(false);
    setTerminalCmd("");
  };

  const codeForLang = (lang: "html" | "css" | "js") => {
    if (lang === "html") return html;
    if (lang === "css") return css;
    return js || "// No JS generated yet";
  };

  return (
    <div className="flex flex-col h-full" data-ocid="preview.panel">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex flex-col h-full"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <TabsList className="bg-muted/50 h-8">
            <TabsTrigger
              value="preview"
              className="h-6 text-xs gap-1.5"
              data-ocid="preview.tab"
            >
              <Monitor className="w-3 h-3" /> Preview
            </TabsTrigger>
            <TabsTrigger
              value="html"
              className="h-6 text-xs"
              data-ocid="preview.html.tab"
            >
              HTML
            </TabsTrigger>
            <TabsTrigger
              value="css"
              className="h-6 text-xs"
              data-ocid="preview.css.tab"
            >
              CSS
            </TabsTrigger>
            <TabsTrigger
              value="js"
              className="h-6 text-xs"
              data-ocid="preview.js.tab"
            >
              JS
            </TabsTrigger>
            <TabsTrigger
              value="terminal"
              className="h-6 text-xs gap-1.5"
              data-ocid="preview.terminal.tab"
            >
              <Terminal className="w-3 h-3" /> Terminal
            </TabsTrigger>
          </TabsList>
          {activeTab === "preview" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setPreviewKey((k) => k + 1)}
              data-ocid="preview.refresh.button"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
          {previewDoc ? (
            <iframe
              key={previewKey}
              ref={iframeRef}
              sandbox="allow-scripts"
              title="Preview"
              className="w-full h-full border-0 bg-white"
              data-ocid="preview.canvas_target"
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center h-full text-muted-foreground"
              data-ocid="preview.empty_state"
            >
              <Monitor className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Preview will appear here</p>
              <p className="text-xs opacity-60 mt-1">
                Chat with your Termux brain to generate code
              </p>
            </div>
          )}
        </TabsContent>

        {CODE_LANGS.map((lang) => (
          <TabsContent
            key={lang}
            value={lang}
            className="flex-1 m-0 overflow-auto"
          >
            <pre
              className="code-editor p-4 text-xs text-foreground h-full"
              style={{ background: "oklch(0.08 0 0)" }}
            >
              <code>{codeForLang(lang)}</code>
            </pre>
          </TabsContent>
        ))}

        <TabsContent
          value="terminal"
          className="flex-1 m-0 flex flex-col overflow-hidden"
        >
          <div
            className="flex-1 overflow-auto p-4 font-mono text-xs"
            style={{
              background: "oklch(0.07 0 0)",
              color: "oklch(0.8 0.1 145)",
            }}
            data-ocid="preview.editor"
          >
            <div className="whitespace-pre-wrap">
              {terminalOutput || "Terminal ready. Enter a command below."}
            </div>
          </div>
          <div className="flex gap-2 p-3 border-t border-border bg-card shrink-0">
            <span className="font-mono text-xs text-primary self-center">
              $
            </span>
            <input
              type="text"
              value={terminalCmd}
              onChange={(e) => setTerminalCmd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runCommand()}
              placeholder={
                termuxUrl ? "Enter command..." : "Connect Termux in Settings"
              }
              disabled={!termuxUrl || running}
              className="flex-1 bg-transparent text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground"
              style={{ fontSize: "16px" }}
              data-ocid="preview.terminal.input"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={runCommand}
              disabled={!termuxUrl || !terminalCmd.trim() || running}
              data-ocid="preview.terminal.submit_button"
            >
              {running ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
