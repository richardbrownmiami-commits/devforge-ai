import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, MessageSquare, Monitor } from "lucide-react";
import { useState } from "react";
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

export function EditorPage() {
  const { projectName } = useParams({ from: "/editor/$projectName" });
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { data: projects = [] } = useProjects();
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");

  const project = projects.find((p) => p.name === projectName);
  const apiKey = settings?.openRouterApiKey || "";
  const selectedModel =
    project?.aiModel || settings?.defaultModel || DEFAULT_MODEL_ID;

  const { messages, isLoading, error, sendMessage, clearMessages } =
    useOpenRouterChat(apiKey, selectedModel);

  const availableModels = useAvailableModels(projectName);
  const setProjectModel = useSetProjectModel();

  const handleModelChange = async (modelId: string) => {
    await setProjectModel.mutateAsync({ projectName, modelId });
  };

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
        {modelSelector}
      </div>

      {/* Desktop: 50/50 split -- preview same height as chat */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-border flex flex-col overflow-hidden">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSend={(msg) => sendMessage(msg, projectName)}
            onClear={clearMessages}
            apiKeyMissing={!apiKey}
          />
        </div>
        <div className="w-1/2 flex flex-col overflow-hidden">
          <PreviewPanel
            messages={messages}
            termuxUrl=""
            projectName={projectName}
          />
        </div>
      </div>

      {/* Mobile: tabbed -- both full height */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        <Tabs
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v as "chat" | "preview")}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <TabsList className="mx-4 mt-2 bg-muted/50 shrink-0 grid grid-cols-2">
            <TabsTrigger value="chat" className="gap-1.5 text-xs" data-ocid="editor.chat.tab">
              <MessageSquare className="w-3.5 h-3.5" /> Chat
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5 text-xs" data-ocid="editor.preview.tab">
              <Monitor className="w-3.5 h-3.5" /> Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="flex-1 m-0 mt-2 overflow-hidden flex flex-col">
            <ChatPanel
              messages={messages}
              isLoading={isLoading}
              error={error}
              onSend={(msg) => sendMessage(msg, projectName)}
              onClear={clearMessages}
              apiKeyMissing={!apiKey}
            />
          </TabsContent>
          <TabsContent value="preview" className="flex-1 m-0 mt-2 overflow-hidden flex flex-col">
            <PreviewPanel
              messages={messages}
              termuxUrl=""
              projectName={projectName}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
