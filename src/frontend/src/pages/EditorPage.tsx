import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Brain,
  Monitor,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ChatPanel } from "../components/ChatPanel";
import { PreviewPanel } from "../components/PreviewPanel";
import { DEFAULT_MODEL_ID, shortModelName } from "../constants/models";
import { useSettings, useProjects } from "../hooks/useBackend";
import { useAvailableModels, useSetProjectModel } from "../hooks/useModelClaims";
import { useOpenRouterChat } from "../hooks/useOpenRouterChat";

export function EditorPage() {
  const { projectName } = useParams({ from: "/editor/$projectName" });
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { data: projects = [] } = useProjects();
  const [previewOpen, setPreviewOpen] = useState(false);

  const project = projects.find((p: any) => p.name === projectName);
  const apiKey = settings?.openRouterApiKey || "";
  const selectedModel = project?.aiModel || settings?.defaultModel || DEFAULT_MODEL_ID;

  const { messages, isLoading, error, sendMessage, clearMessages, clearMemory, memoryLoaded, rules } =
    useOpenRouterChat(apiKey, selectedModel, projectName);

  const availableModels = useAvailableModels(projectName);
  const setProjectModel = useSetProjectModel();

  const handleModelChange = async (modelId: string) => {
    await setProjectModel.mutateAsync({ projectName, modelId });
  };

  const handleClearMemory = async () => {
    await clearMemory();
    toast.success("Memory cleared");
  };

  // Check if any code was generated
  const hasCode = messages.some(
    (m) => m.role === "assistant" && m.content.includes("```")
  );

  return (
    <div className="flex flex-col h-full relative" data-ocid="editor.page">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => navigate({ to: "/projects" })} data-ocid="editor.back.button">
          <ArrowLeft className="w-3.5 h-3.5" />
        </Button>

        <span className="text-xs font-medium text-foreground truncate flex-1">{projectName}</span>

        {/* Memory badge */}
        {memoryLoaded && messages.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
            <Brain className="w-2.5 h-2.5 text-primary" />
            <span>{messages.length}</span>
          </div>
        )}

        {/* Rules active dot */}
        {rules && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" title="AI rules active" />}

        {/* Model selector */}
        <Select value={selectedModel} onValueChange={handleModelChange}>
          <SelectTrigger className="h-6 text-[11px] bg-card border-border w-[130px] shrink-0" data-ocid="editor.model.select">
            <SelectValue>{shortModelName(selectedModel)}</SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {availableModels.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
            ))}
            {!availableModels.find((m) => m.id === selectedModel) && (
              <SelectItem value={selectedModel} className="text-xs">{shortModelName(selectedModel)}</SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* Clear memory */}
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleClearMemory} title="Clear memory">
          <Trash2 className="w-3 h-3" />
        </Button>

        {/* Preview button -- always visible in header */}
        <Button
          size="sm"
          onClick={() => setPreviewOpen(true)}
          className="h-7 px-2.5 text-[11px] gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
          data-ocid="editor.preview.open_button"
        >
          <Monitor className="w-3 h-3" />
          Preview
        </Button>
      </div>

      {/* ── Full-screen Chat ── */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSend={(msg) => sendMessage(msg)}
          onClear={clearMessages}
          apiKeyMissing={!apiKey}
          onPreview={() => setPreviewOpen(true)}
          hasCode={hasCode}
        />
      </div>

      {/* ── Full-screen Preview Overlay ── */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-50 flex flex-col bg-background"
            data-ocid="editor.preview.overlay"
          >
            {/* Preview header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">{projectName} — Preview</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewOpen(false)}
                className="h-7 px-2.5 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground"
                data-ocid="editor.preview.close_button"
              >
                <X className="w-3 h-3" />
                Close
              </Button>
            </div>
            {/* Preview content -- full remaining height */}
            <div className="flex-1 overflow-hidden">
              <PreviewPanel
                messages={messages}
                termuxUrl=""
                projectName={projectName}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
