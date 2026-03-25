import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  FolderOpen,
  Menu,
  RotateCcw,
  Settings,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatPanel } from "../components/ChatPanel";
import { MatrixOverlay } from "../components/MatrixOverlay";
import { PreviewPanel } from "../components/PreviewPanel";
import type { AIProvider } from "../constants/models";
import { useAIChat } from "../hooks/useAIChat";
import { useSettings } from "../hooks/useBackend";
import type { ChatMessage } from "../hooks/useTermux";

const PROVIDER_DOT: Record<string, string> = {
  openrouter: "bg-violet-400",
  gemini: "bg-blue-400",
  groq: "bg-orange-400",
  github: "bg-green-400",
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
  return JSON.parse(
    localStorage.getItem(`bf_snapshots_${projectName}`) || "[]",
  );
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

function EditorSidebar({
  projectName,
  snapshots,
  onClose,
  onRestore,
}: {
  projectName: string;
  snapshots: Snapshot[];
  onClose: () => void;
  onRestore: (snap: Snapshot) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          BrainForge
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="px-3 py-2 border-b border-border shrink-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          Project
        </p>
        <p className="text-sm font-medium text-foreground truncate">
          {projectName}
        </p>
      </div>

      <div className="px-3 py-2 space-y-1 border-b border-border shrink-0">
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate({ to: "/projects" });
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-left"
          data-ocid="editor.sidebar.projects.link"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          All Projects
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate({ to: "/settings" });
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-left"
          data-ocid="editor.sidebar.settings.link"
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 shrink-0">
        <Clock className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-foreground">
          Version History
        </span>
      </div>

      <ScrollArea className="flex-1 px-3 pb-3">
        {snapshots.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/50 text-center py-6">
            No snapshots yet
          </p>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snap, i) => (
              <div
                key={snap.timestamp}
                className="p-3 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(snap.timestamp)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {snap.messages.length} msgs
                  </span>
                </div>
                <p className="text-[11px] text-foreground truncate mb-2">
                  {snap.messages
                    .filter((m) => m.role === "user")
                    .slice(-1)[0]
                    ?.content.slice(0, 60) || "Empty"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs w-full gap-1"
                  onClick={() => onRestore(snap)}
                  data-ocid={`editor.history.restore.${i + 1}`}
                >
                  <RotateCcw className="w-3 h-3" /> Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export function EditorPage() {
  const { projectName } = useParams({ from: "/editor/$projectName" });
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoFixStatus, setAutoFixStatus] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() =>
    loadSnapshots(projectName),
  );
  const autoFixCount = useRef(0);
  const prevLoadingRef = useRef(false);
  const autoFixCooldown = useRef(false);
  const previewAutoOpened = useRef(false);

  const s = settings as any;
  const provider: AIProvider =
    (s?.aiProvider === "deepseek" ? "auto" : s?.aiProvider) || "auto";
  const openRouterKey: string = s?.openRouterApiKey || "";
  const openRouterModel: string = s?.defaultModel || "qwen/qwen3-coder:free";
  const geminiKey: string = s?.geminiApiKey || "";
  const geminiModel: string = s?.geminiModel || "gemini-2.0-flash";
  const groqKey: string = s?.groqApiKey || "";
  const groqModel: string = s?.groqModel || "llama-3.3-70b-versatile";
  const githubModelsKey: string = s?.githubModelsKey || "";
  const githubModelsModel: string = s?.githubModelsModel || "gpt-4o";
  const hasAnyKey = !!(
    openRouterKey ||
    geminiKey ||
    groqKey ||
    githubModelsKey
  );
  const autoFix: boolean = s?.autoFix !== false;

  const [initialMessage] = useState<string>(() => {
    const key = `bf_starter_${projectName}`;
    const val = localStorage.getItem(key) || "";
    if (val) localStorage.removeItem(key);
    return val;
  });

  const {
    messages,
    isLoading,
    error,
    activeProvider,
    sendMessage,
    clearMessages,
  } = useAIChat({
    provider,
    openRouterKey,
    openRouterModel,
    geminiKey,
    geminiModel,
    groqKey,
    groqModel,
    githubModelsKey,
    githubModelsModel,
    projectName,
  });

  const hasCode = messages.some(
    (m) => m.role === "assistant" && m.content.includes("```"),
  );

  // Save snapshot after each AI response
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && messages.length > 0) {
      saveSnapshot(projectName, messages);
      setSnapshots(loadSnapshots(projectName));
      // Clear autoFixStatus when loading finishes
      setAutoFixStatus(null);
      // Auto reopen preview after fix
      if (autoFixCount.current > 0) {
        setTimeout(() => setPreviewOpen(true), 300);
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, messages, projectName]);

  // Auto-open preview when AI first generates code
  useEffect(() => {
    if (hasCode && !isLoading && !previewAutoOpened.current) {
      previewAutoOpened.current = true;
      setPreviewOpen(true);
    }
  }, [hasCode, isLoading]);

  // Phase 2: listen for PREVIEW_ERROR postMessage
  useEffect(() => {
    if (!autoFix) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "PREVIEW_ERROR") return;
      if (isLoading || autoFixCount.current >= 3 || autoFixCooldown.current)
        return;
      autoFixCooldown.current = true;
      setTimeout(() => {
        autoFixCooldown.current = false;
      }, 3000);
      autoFixCount.current += 1;
      const attempt = autoFixCount.current;
      setPreviewOpen(false);
      setAutoFixStatus(`Auto-fixing error (${attempt}/3)...`);
      sendMessage(
        `Fix this JavaScript error (auto-fix ${attempt}/3): ${e.data.error}`,
      );
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [autoFix, isLoading, sendMessage]);

  const handleSend = (msg: string) => {
    autoFixCount.current = 0;
    saveSnapshot(projectName, messages);
    sendMessage(msg);
  };

  const restoreSnapshot = (snap: Snapshot) => {
    localStorage.setItem(
      `bf_chat_${projectName}`,
      JSON.stringify(snap.messages),
    );
    setSidebarOpen(false);
    window.location.reload();
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: "100dvh" }}
      data-ocid="editor.page"
    >
      <MatrixOverlay visible={isLoading} />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => navigate({ to: "/projects" })}
          data-ocid="editor.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {projectName}
        </span>
        {autoFixStatus && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] shrink-0"
            style={{
              background: "oklch(0.18 0.06 60 / 0.5)",
              color: "oklch(0.75 0.15 60)",
            }}
            data-ocid="editor.autofix.loading_state"
          >
            <Wrench className="w-3 h-3 animate-spin" />
            <span>{autoFixStatus}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              hasAnyKey
                ? (PROVIDER_DOT[provider] ?? "bg-green-400")
                : "bg-muted-foreground/30"
            }`}
          />
          {isLoading && activeProvider ? (
            <span className="text-[10px] font-mono">{activeProvider}</span>
          ) : (
            <span className="text-[10px]">
              {provider === "auto" ? "Auto AI" : provider}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 h-7 text-xs shrink-0 transition-colors ${
            hasCode
              ? "border-primary/50 text-primary bg-primary/5 hover:bg-primary/10"
              : "border-border"
          }`}
          onClick={() => setPreviewOpen(true)}
          data-ocid="editor.preview.open_button"
        >
          {hasCode ? "Preview ✓" : "Preview"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => setSidebarOpen(true)}
          data-ocid="editor.sidebar.open_modal_button"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Chat -- full screen */}
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
          autoFixStatus={autoFixStatus}
        />
      </div>

      {/* Preview overlay -- full screen */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 bg-background flex flex-col"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          data-ocid="editor.preview.overlay"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setPreviewOpen(false)}
              data-ocid="editor.preview.close_button"
            >
              <X className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground flex-1">
              Preview — {projectName}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <PreviewPanel
              messages={messages as any}
              termuxUrl=""
              projectName={projectName}
            />
          </div>
        </div>
      )}

      {/* Right sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="right"
          className="w-[300px] p-0"
          data-ocid="editor.sidebar.sheet"
        >
          <EditorSidebar
            projectName={projectName}
            snapshots={snapshots}
            onClose={() => setSidebarOpen(false)}
            onRestore={restoreSnapshot}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
