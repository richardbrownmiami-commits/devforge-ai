import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GitBranch,
  Github,
  Loader2,
  Save,
  Send,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_MODEL_ID,
  FREE_MODELS,
  getModelName,
} from "../constants/models";
import { useSaveSettings, useSettings } from "../hooks/useBackend";
import {
  useAvailableModels,
  useClaimMasterModel,
} from "../hooks/useModelClaims";
import { useTermuxStatus } from "../hooks/useTermux";

const STEPS = [
  {
    num: 1,
    title: "Install Node.js in Termux",
    cmd: "pkg install nodejs -y",
    note: "Open Termux on your Android phone and run the command",
  },
  {
    num: 2,
    title: "Install dependencies",
    cmd: "npm install -g express axios cors",
    note: "Wait ~2 minutes for installation to complete",
  },
  {
    num: 3,
    title: "Download brain server",
    cmd: "",
    note: "Downloads the BrainForge server to your phone",
  },
  {
    num: 4,
    title: "Start the brain",
    cmd: "node ~/brain.js YOUR_OPENROUTER_KEY",
    note: "Replace YOUR_OPENROUTER_KEY with your key from openrouter.ai",
  },
  {
    num: 5,
    title: "Install ngrok & expose port",
    cmd: "npm install -g ngrok && ngrok http 3000",
    note: "ngrok gives your phone a public https URL",
  },
  {
    num: 6,
    title: "Paste your ngrok URL above",
    cmd: "https://xxxx-xx-xx-xxx-xx.ngrok-free.app",
    note: 'Copy the Forwarding URL from ngrok and paste it in "Termux Server URL" above',
  },
];

const MASTER_AI_SYSTEM_PROMPT =
  "You are a code editor for BrainForge. The user will ask you to add, modify or remove features from the BrainForge app. " +
  "Respond with ONLY the complete updated file content for the file that needs changing. " +
  "Format your response as: FILE: path/to/file.tsx\n```\n[complete file content]\n```";

interface MasterMessage {
  role: "user" | "assistant";
  content: string;
}

interface PendingChange {
  filePath: string;
  newContent: string;
  userRequest: string;
}

function parseMasterResponse(
  response: string,
): { filePath: string; content: string } | null {
  const fileMatch = response.match(/FILE:\s*([^\n]+)/);
  const codeMatch = response.match(/```(?:[\w.]*)?\n([\s\S]*?)```/);
  if (!fileMatch || !codeMatch) return null;
  return {
    filePath: fileMatch[1].trim(),
    content: codeMatch[1],
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const saveSettings = useSaveSettings();
  const claimMasterModel = useClaimMasterModel();
  const masterAvailableModels = useAvailableModels("master");

  const [termuxUrl, setTermuxUrl] = useState("");
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL_ID);
  const [masterAiModel, setMasterAiModel] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  // Master AI state
  const [masterMessages, setMasterMessages] = useState<MasterMessage[]>([]);
  const [masterInput, setMasterInput] = useState("");
  const [masterLoading, setMasterLoading] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(
    null,
  );
  const [pushingToGitHub, setPushingToGitHub] = useState(false);
  const masterBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settings) {
      setTermuxUrl(settings.termuxUrl || "");
      setOpenRouterApiKey(settings.openRouterApiKey || "");
      setGithubToken(settings.githubToken || "");
      setGithubRepo(settings.githubRepo || "");
      setDefaultModel(settings.defaultModel || DEFAULT_MODEL_ID);
      setMasterAiModel(settings.masterAiModel || "");
    }
  }, [settings]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on messages change
  useEffect(() => {
    masterBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [masterMessages, masterLoading]);

  const { connected, checking, recheck } = useTermuxStatus(termuxUrl);

  const handleSave = async () => {
    try {
      await saveSettings.mutateAsync({
        termuxUrl,
        openRouterApiKey,
        githubToken,
        githubRepo,
        defaultModel,
        masterAiModel,
      });
      toast.success("Settings saved");
      recheck();
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings");
    }
  };

  const handleMasterModelChange = async (modelId: string) => {
    setMasterAiModel(modelId);
    try {
      await claimMasterModel.mutateAsync(modelId);
    } catch (e: any) {
      toast.error(e.message || "Failed to claim model");
    }
  };

  const handleMasterSend = async () => {
    const text = masterInput.trim();
    if (!text || masterLoading) return;
    if (!openRouterApiKey) {
      toast.error("Add your OpenRouter API key first");
      return;
    }
    if (!masterAiModel) {
      toast.error("Select a model for Master AI first");
      return;
    }

    setMasterInput("");
    const userMsg: MasterMessage = { role: "user", content: text };
    setMasterMessages((prev) => [...prev, userMsg]);
    setMasterLoading(true);

    try {
      const history = masterMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: masterAiModel,
          messages: [
            { role: "system", content: MASTER_AI_SYSTEM_PROMPT },
            ...history,
            { role: "user", content: text },
          ],
          stream: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "No response";
      const aiMsg: MasterMessage = { role: "assistant", content };
      setMasterMessages((prev) => [...prev, aiMsg]);

      const parsed = parseMasterResponse(content);
      if (parsed) {
        setPendingChange({
          filePath: parsed.filePath,
          newContent: parsed.content,
          userRequest: text,
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Master AI request failed");
    } finally {
      setMasterLoading(false);
    }
  };

  const handlePushToGitHub = async () => {
    if (!pendingChange || !githubToken || !githubRepo) {
      toast.error("GitHub token and repo required in settings");
      return;
    }
    setPushingToGitHub(true);
    try {
      const { filePath, newContent, userRequest } = pendingChange;
      // Get current file SHA
      const getRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/contents/${filePath}`,
        { headers: { Authorization: `Bearer ${githubToken}` } },
      );

      let sha: string | undefined;
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      } else if (getRes.status !== 404) {
        throw new Error(`GitHub API error: ${getRes.status}`);
      }

      // Push new content
      const putRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/contents/${filePath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `feat: ${userRequest}`,
            content: btoa(unescape(encodeURIComponent(newContent))),
            ...(sha ? { sha } : {}),
          }),
        },
      );

      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err?.message || `GitHub push failed: ${putRes.status}`);
      }

      toast.success("Pushed to GitHub! Cloudflare will deploy shortly.");
      setPendingChange(null);
    } catch (e: any) {
      toast.error(e.message || "GitHub push failed");
    } finally {
      setPushingToGitHub(false);
    }
  };

  const downloadCmd =
    typeof window !== "undefined"
      ? `curl -L ${window.location.origin}/brain.js -o ~/brain.js`
      : "curl -L [your-app-url]/brain.js -o ~/brain.js";

  const resolvedSteps = STEPS.map((s) =>
    s.num === 3 ? { ...s, cmd: downloadCmd } : s,
  );

  return (
    <div
      className="flex flex-col h-full overflow-auto"
      data-ocid="settings.page"
    >
      <div className="px-8 py-6 border-b border-border shrink-0">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure your BrainForge connections and AI
        </p>
      </div>

      <div className="px-8 py-6 space-y-8 max-w-2xl">
        {/* Default AI Model */}
        <section className="space-y-4" data-ocid="settings.model.section">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Default AI Model
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Used when a project has no model selected. All models are free.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Model</Label>
            <Select value={defaultModel} onValueChange={setDefaultModel}>
              <SelectTrigger
                className="bg-card border-border"
                data-ocid="settings.default_model.select"
              >
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {FREE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Termux URL */}
        <section className="space-y-4" data-ocid="settings.termux.section">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Termux Brain Connection
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Optional: connect your phone running the brain server via ngrok
            </p>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="termux-url"
              className="text-xs text-muted-foreground"
            >
              Termux Server URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="termux-url"
                value={termuxUrl}
                onChange={(e) => setTermuxUrl(e.target.value)}
                placeholder="https://xxxx.ngrok-free.app"
                className="bg-card border-border flex-1"
                style={{ fontSize: "16px" }}
                data-ocid="settings.termux_url.input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={recheck}
                disabled={!termuxUrl || checking}
                className="shrink-0 border-border"
                data-ocid="settings.test.button"
              >
                {checking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Test"
                )}
              </Button>
            </div>
            {termuxUrl && (
              <p
                className={cn(
                  "text-xs flex items-center gap-1.5",
                  connected ? "text-primary" : "text-destructive",
                )}
              >
                <span
                  className={cn(
                    "inline-block w-1.5 h-1.5 rounded-full",
                    connected ? "bg-primary" : "bg-destructive",
                  )}
                />
                {checking
                  ? "Checking..."
                  : connected
                    ? "Connected to brain"
                    : "Cannot reach brain server"}
              </p>
            )}
          </div>
        </section>

        {/* API Keys */}
        <section className="space-y-4" data-ocid="settings.api.section">
          <div>
            <h2 className="text-sm font-semibold text-foreground">API Keys</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stored securely on-chain
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="or-key" className="text-xs text-muted-foreground">
                OpenRouter API Key{" "}
                <a
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  openrouter.ai <ExternalLink className="inline w-2.5 h-2.5" />
                </a>
              </Label>
              <Input
                id="or-key"
                type="password"
                value={openRouterApiKey}
                onChange={(e) => setOpenRouterApiKey(e.target.value)}
                placeholder="sk-or-..."
                className="bg-card border-border"
                style={{ fontSize: "16px" }}
                data-ocid="settings.openrouter_key.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="gh-token"
                className="text-xs text-muted-foreground"
              >
                GitHub Token{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  get token <ExternalLink className="inline w-2.5 h-2.5" />
                </a>
              </Label>
              <Input
                id="gh-token"
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="bg-card border-border"
                style={{ fontSize: "16px" }}
                data-ocid="settings.github_token.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="gh-repo"
                className="text-xs text-muted-foreground flex items-center gap-1"
              >
                <GitBranch className="w-3 h-3" />
                GitHub Repo (for Master AI deploy)
              </Label>
              <Input
                id="gh-repo"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="username/repo-name"
                className="bg-card border-border"
                style={{ fontSize: "16px" }}
                data-ocid="settings.github_repo.input"
              />
            </div>
          </div>
        </section>

        {/* Save */}
        <Button
          type="button"
          onClick={handleSave}
          disabled={saveSettings.isPending || isLoading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          data-ocid="settings.save.submit_button"
        >
          {saveSettings.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </Button>

        {/* Setup Guide */}
        <section
          className="border border-border rounded-lg overflow-hidden"
          data-ocid="settings.guide.section"
        >
          <button
            type="button"
            onClick={() => setGuideOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            data-ocid="settings.guide.toggle"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Termux Setup Guide</span>
            </div>
            {guideOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {guideOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="border-t border-border px-4 py-4 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Follow these steps to run the BrainForge AI server on your
                    Android phone using Termux.
                  </p>
                  {resolvedSteps.map((step) => (
                    <div
                      key={step.num}
                      className="flex gap-3"
                      data-ocid={`settings.guide.item.${step.num}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-primary">
                          {step.num}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">
                          {step.title}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <code className="flex-1 font-mono text-[11px] bg-muted/50 border border-border rounded px-2 py-1 text-primary truncate">
                            {step.cmd}
                          </code>
                          <CopyButton text={step.cmd} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {step.note}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-md p-3">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Once ngrok is running, copy the{" "}
                      <strong className="text-foreground">Forwarding</strong>{" "}
                      URL (starts with https://) and paste it in the Termux
                      Server URL field above.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Master AI */}
        <section
          className="border border-border rounded-lg overflow-hidden"
          data-ocid="settings.master_ai.section"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              Master AI — App Controller
            </span>
          </div>
          <div className="px-4 py-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Master AI can modify BrainForge itself. Commands are sent directly
              to your GitHub repo and deployed via Cloudflare Pages.
            </p>

            {/* Master model selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Bot className="w-3 h-3" /> Master AI Model
                <span className="text-[10px] text-muted-foreground/60">
                  (locked to Master AI only)
                </span>
              </Label>
              <Select
                value={masterAiModel || ""}
                onValueChange={handleMasterModelChange}
              >
                <SelectTrigger
                  className="bg-card border-border"
                  data-ocid="settings.master_model.select"
                >
                  <SelectValue placeholder="Select Master AI model…" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {masterAvailableModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                  {masterAiModel &&
                    !masterAvailableModels.find(
                      (m) => m.id === masterAiModel,
                    ) && (
                      <SelectItem value={masterAiModel}>
                        {getModelName(masterAiModel)}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>

            {/* Chat area */}
            <div className="border border-border rounded-lg overflow-hidden">
              <ScrollArea className="h-56 px-3 py-3">
                <div className="space-y-3">
                  {masterMessages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Tell Master AI what to add or change in BrainForge
                    </p>
                  )}
                  {masterMessages.map((msg, i) => (
                    <div
                      key={`master-msg-${msg.content.slice(0, 30)}-${msg.role}`}
                      className={cn(
                        "rounded-md p-2.5 text-xs",
                        msg.role === "user"
                          ? "chat-bubble-user ml-6"
                          : "chat-bubble-ai",
                      )}
                      data-ocid={`settings.master_ai.item.${i + 1}`}
                    >
                      <span className="font-mono text-[10px] text-muted-foreground uppercase block mb-1">
                        {msg.role === "user" ? "you" : "master ai"}
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                  {masterLoading && (
                    <div
                      className="chat-bubble-ai rounded-md p-2.5"
                      data-ocid="settings.master_ai.loading_state"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          master ai
                        </span>
                        <div className="flex gap-1">
                          {["a", "b", "c"].map((k, i) => (
                            <span
                              key={k}
                              className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={masterBottomRef} />
                </div>
              </ScrollArea>

              {/* Pending change preview */}
              <AnimatePresence>
                {pendingChange && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-border"
                    data-ocid="settings.master_ai.panel"
                  >
                    <div className="px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Github className="w-3.5 h-3.5 text-primary" />
                          <span>Ready to push:</span>
                          <code className="text-primary bg-primary/10 px-1 rounded text-[11px]">
                            {pendingChange.filePath}
                          </code>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPendingChange(null)}
                          data-ocid="settings.master_ai.close_button"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="bg-muted/30 rounded border border-border overflow-hidden">
                        <pre className="code-editor p-2 text-[11px] max-h-32 overflow-auto">
                          <code>
                            {pendingChange.newContent.slice(0, 500)}
                            {pendingChange.newContent.length > 500
                              ? "\n… (truncated)"
                              : ""}
                          </code>
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handlePushToGitHub}
                          disabled={
                            pushingToGitHub || !githubToken || !githubRepo
                          }
                          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 flex-1"
                          data-ocid="settings.master_ai.confirm_button"
                        >
                          {pushingToGitHub ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Github className="w-3.5 h-3.5" />
                          )}
                          Push to GitHub
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPendingChange(null)}
                          disabled={pushingToGitHub}
                          className="border-border"
                          data-ocid="settings.master_ai.cancel_button"
                        >
                          Cancel
                        </Button>
                      </div>
                      {(!githubToken || !githubRepo) && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Add GitHub token and repo above to enable push
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              <div className="border-t border-border px-3 py-2 flex gap-2">
                <Input
                  value={masterInput}
                  onChange={(e) => setMasterInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleMasterSend()
                  }
                  placeholder="Tell Master AI what to change in BrainForge…"
                  disabled={masterLoading}
                  className="text-xs bg-card border-border flex-1 h-8"
                  style={{ fontSize: "16px" }}
                  data-ocid="settings.master_ai.input"
                />
                <Button
                  size="icon"
                  onClick={handleMasterSend}
                  disabled={!masterInput.trim() || masterLoading}
                  className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                  data-ocid="settings.master_ai.submit_button"
                >
                  {masterLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
