import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Clock, Monitor, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatPanel } from "../components/ChatPanel";
import { MatrixOverlay } from "../components/MatrixOverlay";
import { PreviewPanel } from "../components/PreviewPanel";
import type { AIProvider } from "../constants/models";
import type { ChatMessage } from "../hooks/useTermux";
import { useAIChat } from "../hooks/useAIChat";
import { useSettings } from "../hooks/useBackend";

const PROVIDER_DOT: Record<string, string> = {
  openrouter: "bg-violet-400",
  gemini: "bg-blue-400",
  auto: "bg-green-400",
};

interface Snapshot {
  timestamp: number;
  messages: ChatMessage[];
}

function saveSnapshot(projectName: string, messages: ChatMessage[]) {
  if (messages.length === 0) return;
  const key = `bf_snapshots_${projectName}`;
  const existing: Snapshot[] = JSON.parse(localStorage.getItem(key) || "[]");
  const snap: Snapshot = { timestamp: Date.now(), messages };
  const updated = [snap, ...existing].slice(0, 10);
  localStorage.setItem(key, JSON.stringify(updated));
}

function loadSnapshots(projectName: string): Snapshot[] {
  return JSON.parse(localStorage.getItem(`bf_snapshots_${projectName}`) || "[]");
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

export function EditorPage() {
  const { projectName } = useParams({ from: "/editor/$projectName" });
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => loadSnapshots(projectName));
  const autoFixCount = useRef(0);
  const prevLoadingRef = useRef(false);

  const s = settings as any;
  const provider: AIProvider = s?.aiProvider === "deepseek" ? "auto" : s?.aiProvider || "auto";
  const openRouterKey: string = s?.openRouterApiKey || "";
  const openRouterModel: string = s?.defaultModel || "meta-llama/llama-3.3-70b-instruct:free";
  const geminiKey: string = s?.geminiApiKey || "";
  const geminiModel: string = s?.geminiModel || "gemini-2.0-flash";
  const hasAnyKey = !!(openRouterKey || geminiKey);
  const autoFix: boolean = s?.autoFix !== false;

  // Template starter prompt
  const [initialMessage] = useState<string>(() => {
    const key = `bf_starter_${projectName}`;
    const val = localStorage.getItem(key) || "";
    if (val) localStorage.removeItem(key);
    return val;
  });

  const { messages, isLoading, error, activeProvider, sendMessage, clearMessages } = useAIChat({
    provider, openRouterKey, openRouterModel, geminiKey, geminiModel, projectName,
  });

  const hasCode = messages.some((m) => m.role === "assistant" && m.content.includes("```"));

  // Save snapshot when AI finishes responding
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && messages.length > 0) {
      saveSnapshot(projectName, messages);
      setSnapshots(loadSnapshots(projectName));
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, messages, projectName]);

  // Auto error fix: listen for postMessage errors from preview iframe
  useEffect(() => {
    if (!autoFix) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "PREVIEW_ERROR") return;
      if (isLoading || autoFixCount.current >= 3) return;
      autoFixCount.current += 1;
      sendMessage(`Fix this JavaScript error in the code (auto-fix attempt ${autoFixCount.current}/3): ${e.data.error}`);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [autoFix, isLoading, sendMessage]);

  // Reset auto-fix counter when user sends a manual message
  const handleSend = (msg: string) => {
    autoFixCount.current = 0;
    saveSnapshot(projectName, messages);
    sendMessage(msg);
  };

  const restoreSnapshot = (snap: Snapshot) => {
    // Persist restored messages
    localStorage.setItem(`bf_chat_${projectName}`, JSON.stringify(snap.messages));
    setHistoryOpen(false);
    window.location.reload();
  };

  return (
    <div className="flex flex-col" style={{ height: "100dvh" }} data-ocid="editor.page">
      {/* Matrix overlay when AI is coding */}
      <MatrixOverlay visible={isLoading} />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => navigate({ to: "/projects" })} data-ocid="editor.back.button">
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <span className="text-sm font-medium text-foreground truncate flex-1">{projectName}</span>

        {/* Provider dot */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`w-1.5 h-1.5 rounded-full ${
            hasAnyKey ? (PROVIDER_DOT[provider] ?? "bg-green-400") : "bg-muted-foreground/30"
          }`} />
          {isLoading && activeProvider
            ? <span className="text-[10px] font-mono">{activeProvider}</span>
            : <span className="text-[10px]">{provider === "auto" ? "Auto AI" : provider}</span>}
        </div>

        {/* History button */}
        {snapshots.length > 0 && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setHistoryOpen(true)} title="Version history" data-ocid="editor.history.button">
            <Clock className="w-3.5 h-3.5" />
          </Button>
        )}

        {/* Preview button */}
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs border-border shrink-0"
          onClick={() => setPreviewOpen(true)} data-ocid="editor.preview.open_button">
          <Monitor className="w-3.5 h-3.5" /> Preview
        </Button>
      </div>

      {/* Chat full screen */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          messages={messages as any}
          isLoading={isLoading}
          error={error}
          initialMessage={initialMessage}
          onSend={handleSend}
          onClear={clearMessages}
          apiKeyMissing={!hasAnyKey}
          hasCode={hasCode}
          onPreview={() => setPreviewOpen(true)}
        />
      </div>

      {/* Full-screen preview overlay */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          data-ocid="editor.preview.overlay">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setPreviewOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground flex-1">Preview — {projectName}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <PreviewPanel messages={messages as any} termuxUrl="" projectName={projectName} />
          </div>
        </div>
      )}

      {/* Version history drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setHistoryOpen(false)}>
          <div className="w-[300px] h-full bg-card border-l border-border flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Version History
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHistoryOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <ScrollArea className="flex-1 px-3 py-3">
              <div className="space-y-2">
                {snapshots.map((snap, i) => (
                  <div key={snap.timestamp}
                    className="p-3 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{relativeTime(snap.timestamp)}</span>
                      <span className="text-[10px] text-muted-foreground">{snap.messages.length} messages</span>
                    </div>
                    <p className="text-[11px] text-foreground truncate mb-2">
                      {snap.messages.filter(m => m.role === "user").slice(-1)[0]?.content.slice(0, 60) || "Empty"}
                    </p>
                    <Button size="sm" variant="outline" className="h-6 text-xs w-full gap-1"
                      onClick={() => restoreSnapshot(snap)} data-ocid={`editor.history.restore.${i+1}`}>
                      <RotateCcw className="w-3 h-3" /> Restore
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
