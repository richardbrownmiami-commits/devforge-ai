import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Monitor, X } from "lucide-react";
import { useState } from "react";
import { ChatPanel } from "../components/ChatPanel";
import { PreviewPanel } from "../components/PreviewPanel";
import type { AIProvider } from "../constants/models";
import { useAIChat } from "../hooks/useAIChat";
import { useSettings } from "../hooks/useBackend";

const PROVIDER_DOT: Record<string, string> = {
  openrouter: "bg-violet-400",
  gemini: "bg-blue-400",
  auto: "bg-green-400",
};

export function EditorPage() {
  const { projectName } = useParams({ from: "/editor/$projectName" });
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const [previewOpen, setPreviewOpen] = useState(false);

  const s = settings as any;
  const provider: AIProvider =
    s?.aiProvider === "deepseek" ? "auto" : s?.aiProvider || "auto";
  const openRouterKey: string = s?.openRouterApiKey || "";
  const openRouterModel: string =
    s?.defaultModel || "meta-llama/llama-3.3-70b-instruct:free";
  const geminiKey: string = s?.geminiApiKey || "";
  const geminiModel: string = s?.geminiModel || "gemini-2.0-flash";
  const hasAnyKey = !!(openRouterKey || geminiKey);

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
    projectName,
  });

  const hasCode = messages.some(
    (m) => m.role === "assistant" && m.content.includes("```"),
  );

  return (
    <div
      className="flex flex-col"
      style={{ height: "100dvh" }}
      data-ocid="editor.page"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
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

        {/* Provider dot + label */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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

        {/* Preview button -- always visible on all screen sizes */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-7 text-xs border-border shrink-0"
          onClick={() => setPreviewOpen(true)}
          data-ocid="editor.preview.open_button"
        >
          <Monitor className="w-3.5 h-3.5" /> Preview
        </Button>
      </div>

      {/* Chat fills full screen */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          messages={messages as any}
          isLoading={isLoading}
          error={error}
          onSend={sendMessage}
          onClear={clearMessages}
          apiKeyMissing={!hasAnyKey}
          hasCode={hasCode}
          onPreview={() => setPreviewOpen(true)}
        />
      </div>

      {/* Full-screen preview overlay -- all screen sizes */}
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
    </div>
  );
}
