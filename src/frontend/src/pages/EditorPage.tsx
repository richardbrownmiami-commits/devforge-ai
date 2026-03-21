import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, Monitor, Pencil, X } from "lucide-react";
import { useRef, useState } from "react";
import { ChatPanel } from "../components/ChatPanel";
import { PreviewPanel } from "../components/PreviewPanel";
import {
  type AIProvider,
  DEEPSEEK_MODELS,
  DEFAULT_MODEL_ID,
  GEMINI_MODELS,
  OPENROUTER_MODELS,
  shortModelName,
} from "../constants/models";
import { useAIChat } from "../hooks/useAIChat";
import { useProjects, useSettings } from "../hooks/useBackend";
import {
  useAvailableModels,
  useSetProjectModel,
} from "../hooks/useModelClaims";
import type { ChatMessage } from "../hooks/useTermux";

const _PROVIDER_LABELS: Record<AIProvider, string> = {
  openrouter: "OpenRouter",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  auto: "Auto",
};

const PROVIDER_COLORS: Record<AIProvider, string> = {
  openrouter: "text-violet-400",
  gemini: "text-blue-400",
  deepseek: "text-cyan-400",
  auto: "text-green-400",
};

export function EditorPage() {
  const { projectName } = useParams({ from: "/editor/$projectName" });
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { data: projects = [] } = useProjects();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  const project = projects.find((p) => p.name === projectName);
  const s = settings as any;

  // AI provider from settings
  const provider: AIProvider = s?.aiProvider || "openrouter";
  const openRouterKey = s?.openRouterApiKey || "";
  const openRouterModel =
    project?.aiModel || s?.defaultModel || DEFAULT_MODEL_ID;
  const geminiKey = s?.geminiApiKey || "";
  const geminiModel = s?.geminiModel || "gemini-2.0-flash";
  const deepSeekKey = s?.deepSeekApiKey || "";
  const deepSeekModel = s?.deepSeekModel || "deepseek-chat";

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
    deepSeekKey,
    deepSeekModel,
    projectName,
  });

  const availableModels = useAvailableModels(projectName);
  const setProjectModel = useSetProjectModel();

  // Pick correct model list based on provider
  const modelList =
    provider === "gemini"
      ? GEMINI_MODELS
      : provider === "deepseek"
        ? DEEPSEEK_MODELS
        : OPENROUTER_MODELS;

  // Current model display
  const currentModel =
    provider === "gemini"
      ? geminiModel
      : provider === "deepseek"
        ? deepSeekModel
        : openRouterModel;

  const handleModelChange = async (modelId: string) => {
    if (modelId === "__custom__") {
      setCustomMode(true);
      setCustomInput("");
      setTimeout(() => customInputRef.current?.focus(), 50);
      return;
    }
    await setProjectModel.mutateAsync({ projectName, modelId });
  };

  const handleCustomConfirm = async () => {
    const id = customInput.trim();
    if (!id) {
      setCustomMode(false);
      return;
    }
    await setProjectModel.mutateAsync({ projectName, modelId: id });
    setCustomMode(false);
    setCustomInput("");
  };

  // Provider availability dots
  const hasOpenRouter = !!openRouterKey;
  const hasGemini = !!geminiKey;
  const hasDeepSeek = !!deepSeekKey;

  const modelSelector = customMode ? (
    <div className="flex items-center gap-1">
      <Input
        ref={customInputRef}
        value={customInput}
        onChange={(e) => setCustomInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCustomConfirm();
          if (e.key === "Escape") setCustomMode(false);
        }}
        placeholder="provider/model:free"
        className="h-7 text-xs bg-card border-border px-2 w-44"
        style={{ fontSize: "13px" }}
        data-ocid="editor.custom_model.input"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-primary shrink-0"
        onClick={handleCustomConfirm}
      >
        <Check className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground shrink-0"
        onClick={() => setCustomMode(false)}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-1">
      <Select value={currentModel} onValueChange={handleModelChange}>
        <SelectTrigger
          className="h-7 text-xs bg-card border-border max-w-[150px] truncate"
          data-ocid="editor.model.select"
        >
          <SelectValue>{shortModelName(currentModel)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {provider === "openrouter"
            ? availableModels.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.name}
                </SelectItem>
              ))
            : modelList.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.name}
                </SelectItem>
              ))}
          {provider === "openrouter" &&
            !availableModels.find((m) => m.id === currentModel) && (
              <SelectItem value={currentModel} className="text-xs">
                {shortModelName(currentModel)}
              </SelectItem>
            )}
          {provider === "openrouter" && (
            <SelectItem value="__custom__" className="text-xs text-primary">
              ✏️ Type custom model ID...
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {/* Pencil for custom model -- OpenRouter only */}
      {provider === "openrouter" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          title="Type a custom model ID"
          onClick={() => {
            setCustomMode(true);
            setCustomInput(currentModel);
            setTimeout(() => customInputRef.current?.focus(), 50);
          }}
          data-ocid="editor.model.edit_button"
        >
          <Pencil className="w-3 h-3" />
        </Button>
      )}
    </div>
  );

  return (
    <div
      className="flex flex-col"
      style={{ height: "100dvh" }}
      data-ocid="editor.page"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => navigate({ to: "/projects" })}
          data-ocid="editor.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
          {projectName}
        </span>

        {/* Provider + model */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Provider availability indicators */}
          <div className="flex items-center gap-1 mr-1">
            <span
              title="OpenRouter"
              className={`w-1.5 h-1.5 rounded-full ${hasOpenRouter ? "bg-violet-400" : "bg-muted-foreground/30"}`}
            />
            <span
              title="Gemini"
              className={`w-1.5 h-1.5 rounded-full ${hasGemini ? "bg-blue-400" : "bg-muted-foreground/30"}`}
            />
            <span
              title="DeepSeek"
              className={`w-1.5 h-1.5 rounded-full ${hasDeepSeek ? "bg-cyan-400" : "bg-muted-foreground/30"}`}
            />
          </div>
          {/* Active provider badge */}
          {isLoading && activeProvider && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 ${PROVIDER_COLORS[provider]}`}
            >
              {activeProvider}
            </span>
          )}
          {modelSelector}
        </div>

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

      {/* Chat fills full height */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          messages={messages as any}
          isLoading={isLoading}
          error={error}
          onSend={(msg) => sendMessage(msg)}
          onClear={clearMessages}
          apiKeyMissing={!openRouterKey && !geminiKey && !deepSeekKey}
        />
      </div>

      {/* Full-screen preview overlay */}
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
