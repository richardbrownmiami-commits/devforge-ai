import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Github, MessageSquare, Monitor } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatPanel } from "../components/ChatPanel";
import { PreviewPanel } from "../components/PreviewPanel";
import { DEFAULT_MODEL_ID, shortModelName } from "../constants/models";
import { useSettings } from "../hooks/useBackend";
import { useProjects } from "../hooks/useBackend";
import {
  useAvailableModels,
  useSetProjectModel,
} from "../hooks/useModelClaims";
import { useOpenRouterChat } from "../hooks/useOpenRouterChat";
import { cfApi } from "../lib/cloudflareApi";
import type { CFSnapshot } from "../lib/cloudflareApi";

async function pushToGitHub(
  token: string,
  repo: string,
  projectName: string,
  content: string,
) {
  const path = `projects/${projectName}/index.html`;
  const getRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const sha = getRes.ok ? (await getRes.json()).sha : undefined;
  const putRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `feat: update ${projectName}`,
        content: btoa(unescape(encodeURIComponent(content))),
        ...(sha ? { sha } : {}),
      }),
    },
  );
  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || `GitHub push failed: ${putRes.status}`);
  }
}

function extractFullCode(
  messages: { role: string; content: string }[],
): string {
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

export function EditorPage() {
  const { projectName } = useParams({ from: "/editor/$projectName" });
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { data: projects = [] } = useProjects();
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [snapshots, setSnapshots] = useState<CFSnapshot[]>([]);
  const [isPushingGithub, setIsPushingGithub] = useState(false);
  const autoFixAttemptsRef = useRef(0);

  const project = projects.find((p) => p.name === projectName);
  const apiKey = settings?.openRouterApiKey || "";
  const selectedModel =
    project?.aiModel || settings?.defaultModel || DEFAULT_MODEL_ID;

  const handleSnapshot = useCallback(
    async (code: string) => {
      try {
        const snap = await cfApi.saveSnapshot({
          project_id: projectName,
          code,
          description: `Before change at ${new Date().toLocaleTimeString()}`,
        });
        setSnapshots((prev) => [...prev, snap]);
      } catch {
        // Snapshot failure is non-critical
      }
    },
    [projectName],
  );

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    autoFixError,
    clearMessages,
  } = useOpenRouterChat(apiKey, selectedModel, projectName, {
    onSnapshot: handleSnapshot,
  });

  const handlePreviewError = useCallback(
    (errMsg: string) => {
      if (autoFixAttemptsRef.current < 3) {
        autoFixAttemptsRef.current += 1;
        autoFixError(errMsg);
      }
    },
    [autoFixError],
  );

  const handleRestore = useCallback((code: string) => {
    toast.success("Code restored from snapshot");
    void code;
  }, []);

  const handleGithubPush = async () => {
    const code = extractFullCode(messages);
    if (!code) {
      toast.error("No generated code to push");
      return;
    }
    if (!settings?.githubToken || !settings?.githubRepo) {
      toast.error("GitHub token and repo not set in Settings");
      return;
    }
    setIsPushingGithub(true);
    try {
      await pushToGitHub(
        settings.githubToken,
        settings.githubRepo,
        projectName,
        code,
      );
      toast.success(
        `Pushed to GitHub: ${settings.githubRepo}/projects/${projectName}`,
      );
    } catch (e: any) {
      toast.error(e.message || "GitHub push failed");
    } finally {
      setIsPushingGithub(false);
    }
  };

  const availableModels = useAvailableModels(projectName);
  const setProjectModel = useSetProjectModel();

  const handleModelChange = async (modelId: string) => {
    await setProjectModel.mutateAsync({ projectName, modelId });
  };

  const hasGithubConfig = !!(settings?.githubToken && settings?.githubRepo);
  const apiKeyMissing = !apiKey;

  const modelSelector = (
    <Select value={selectedModel} onValueChange={handleModelChange}>
      <SelectTrigger
        className="h-7 text-xs bg-card border-border max-w-[180px] truncate"
        data-ocid="editor.model.select"
      >
        <SelectValue placeholder="Model">
          {shortModelName(selectedModel)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {availableModels.map((m) => (
          <SelectItem key={m.id} value={m.id} className="text-xs">
            {m.name}
          </SelectItem>
        ))}
        {!availableModels.find((m) => m.id === selectedModel) && (
          <SelectItem value={selectedModel} className="text-xs">
            {shortModelName(selectedModel)}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-col h-full" data-ocid="editor.page">
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
        {apiKeyMissing && (
          <span
            className="text-xs text-destructive font-medium px-2 py-0.5 bg-destructive/10 rounded border border-destructive/20"
            data-ocid="editor.apikey.error_state"
          >
            No API Key
          </span>
        )}
        {hasGithubConfig && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleGithubPush}
            disabled={isPushingGithub}
            title="Push to GitHub"
            data-ocid="editor.github.button"
          >
            <Github className="w-3.5 h-3.5" />
          </Button>
        )}
        {modelSelector}
      </div>

      {/* Desktop: side by side -- chat panel is wider (55%) */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-[55%] min-w-[340px] border-r border-border flex flex-col overflow-hidden">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSend={(msg) => sendMessage(msg)}
            onClear={clearMessages}
            apiKeyMissing={apiKeyMissing}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <PreviewPanel
            messages={messages}
            termuxUrl=""
            projectName={projectName}
            snapshots={snapshots}
            onRestore={handleRestore}
            onError={handlePreviewError}
          />
        </div>
      </div>

      {/* Mobile: fullscreen chat or preview with floating toggle button */}
      <div
        className="md:hidden flex-1 overflow-hidden flex flex-col min-h-0"
        data-ocid="editor.mobile.panel"
      >
        {mobileTab === "chat" ? (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <ChatPanel
              messages={messages}
              isLoading={isLoading}
              error={error}
              onSend={(msg) => sendMessage(msg)}
              onClear={clearMessages}
              apiKeyMissing={apiKeyMissing}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <PreviewPanel
              messages={messages}
              termuxUrl=""
              projectName={projectName}
              snapshots={snapshots}
              onRestore={handleRestore}
              onError={handlePreviewError}
            />
          </div>
        )}
        {/* Floating tab switcher */}
        <div className="fixed bottom-6 right-4 z-50">
          <Button
            size="icon"
            variant={mobileTab === "preview" ? "default" : "outline"}
            className="h-11 w-11 rounded-full shadow-xl border-border bg-card hover:bg-accent"
            onClick={() =>
              setMobileTab(mobileTab === "chat" ? "preview" : "chat")
            }
            data-ocid="editor.mobile.toggle"
          >
            {mobileTab === "chat" ? (
              <Monitor className="w-4 h-4" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
