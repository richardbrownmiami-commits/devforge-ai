/**
 * SettingsPage.tsx
 * Hub-style settings: each section opens its own full page.
 * NO tab layout. Color-coded sub-pages.
 * Includes AI provider settings: OpenRouter, Gemini (direct), DeepSeek (direct).
 */
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Bot,
  ChevronLeft,
  ExternalLink,
  FileText,
  GitBranch,
  Github,
  Key,
  Loader2,
  Save,
  Send,
  Settings,
  Sparkles,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type AIProvider,
  DEEPSEEK_MODELS,
  DEFAULT_MODEL_ID,
  FREE_MODELS,
  GEMINI_MODELS,
  OPENROUTER_MODELS,
  getModelName,
} from "../constants/models";
import { useProjects, useSaveSettings, useSettings } from "../hooks/useBackend";
import {
  useAvailableModels,
  useClaimMasterModel,
} from "../hooks/useModelClaims";
import { useTermuxStatus } from "../hooks/useTermux";

type Page =
  | "hub"
  | "api"
  | "ai"
  | "termux"
  | "github"
  | "master-ai"
  | "ai-files";

const HUB_BUTTONS = [
  {
    id: "api" as Page,
    label: "API Keys",
    description: "OpenRouter, Gemini, DeepSeek",
    icon: Key,
    gradient: "from-violet-600/20 to-violet-600/5",
    border: "border-violet-500/30 hover:border-violet-400/60",
    iconColor: "text-violet-400",
  },
  {
    id: "ai" as Page,
    label: "AI Settings",
    description: "Provider, model, behaviour",
    icon: Zap,
    gradient: "from-blue-600/20 to-blue-600/5",
    border: "border-blue-500/30 hover:border-blue-400/60",
    iconColor: "text-blue-400",
  },
  {
    id: "termux" as Page,
    label: "Termux Brain",
    description: "Connect your phone server",
    icon: Terminal,
    gradient: "from-green-600/20 to-green-600/5",
    border: "border-green-500/30 hover:border-green-400/60",
    iconColor: "text-green-400",
  },
  {
    id: "github" as Page,
    label: "GitHub & Deploy",
    description: "Token, repo, deploy status",
    icon: Github,
    gradient: "from-orange-600/20 to-orange-600/5",
    border: "border-orange-500/30 hover:border-orange-400/60",
    iconColor: "text-orange-400",
  },
  {
    id: "master-ai" as Page,
    label: "Master AI",
    description: "App-level AI controller",
    icon: Bot,
    gradient: "from-pink-600/20 to-pink-600/5",
    border: "border-pink-500/30 hover:border-pink-400/60",
    iconColor: "text-pink-400",
  },
  {
    id: "ai-files" as Page,
    label: "AI Files",
    description: "Memory & rules for all AIs",
    icon: FileText,
    gradient: "from-cyan-600/20 to-cyan-600/5",
    border: "border-cyan-500/30 hover:border-cyan-400/60",
    iconColor: "text-cyan-400",
  },
];

const MASTER_SYSTEM_PROMPT =
  "You are the Master AI controller for BrainForge. " +
  "When asked to modify the app, return the complete updated file. " +
  "Format: FILE: path/to/file.tsx\n```\n[content]\n```";

function BackHeader({
  title,
  onBack,
  accent = "text-foreground",
}: { title: string; onBack: () => void; accent?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
      <button
        type="button"
        onClick={onBack}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h1 className={`text-base font-semibold ${accent}`}>{title}</h1>
    </div>
  );
}

function SaveBtn({
  onClick,
  pending,
  color = "bg-primary hover:bg-primary/90",
}: { onClick: () => void; pending: boolean; color?: string }) {
  return (
    <Button
      onClick={onClick}
      disabled={pending}
      className={`${color} text-white gap-2 w-full`}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Save className="w-4 h-4" />
      )}
      Save
    </Button>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-muted-foreground transition-colors shrink-0"
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

export function SettingsPage() {
  const [page, setPage] = useState<Page>("hub");
  const { data: settings } = useSettings();
  const saveSettings = useSaveSettings();
  const { data: projects = [] } = useProjects();
  const claimMasterModel = useClaimMasterModel();
  const masterAvailableModels = useAvailableModels("master");

  // Form state
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [deepSeekApiKey, setDeepSeekApiKey] = useState("");
  const [termuxUrl, setTermuxUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [aiProvider, setAiProvider] = useState<AIProvider>("openrouter");
  const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL_ID);
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [deepSeekModel, setDeepSeekModel] = useState("deepseek-chat");
  const [masterAiModel, setMasterAiModel] = useState("");
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [autoFix, setAutoFix] = useState(true);
  const [proactiveAI, setProactiveAI] = useState(false);

  // Master AI
  const [masterMsgs, setMasterMsgs] = useState<
    { role: string; content: string }[]
  >([]);
  const [masterInput, setMasterInput] = useState("");
  const [masterLoading, setMasterLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    path: string;
    content: string;
    req: string;
  } | null>(null);
  const [pushing, setPushing] = useState(false);
  const masterEndRef = useRef<HTMLDivElement>(null);

  // AI Files
  const [selectedFile, setSelectedFile] = useState<{
    key: string;
    label: string;
    content: string;
  } | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (!settings) return;
    const s = settings as any;
    setOpenRouterApiKey(s.openRouterApiKey || "");
    setGeminiApiKey(s.geminiApiKey || "");
    setDeepSeekApiKey(s.deepSeekApiKey || "");
    setTermuxUrl(s.termuxUrl || "");
    setGithubToken(s.githubToken || "");
    setGithubRepo(s.githubRepo || "");
    setAiProvider(s.aiProvider || "openrouter");
    setDefaultModel(s.defaultModel || DEFAULT_MODEL_ID);
    setGeminiModel(s.geminiModel || "gemini-2.0-flash");
    setDeepSeekModel(s.deepSeekModel || "deepseek-chat");
    setMasterAiModel(s.masterAiModel || "");
    setMasterEnabled(s.masterAIEnabled !== false);
    setAutoFix(s.autoFix !== false);
    setProactiveAI(!!s.proactiveAI);
  }, [settings]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll effect
  useEffect(() => {
    masterEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [masterMsgs, masterLoading]);

  const { connected, checking, recheck } = useTermuxStatus(termuxUrl);

  const save = async (extra?: Record<string, unknown>) => {
    try {
      await saveSettings.mutateAsync({
        openRouterApiKey,
        geminiApiKey,
        deepSeekApiKey,
        termuxUrl,
        githubToken,
        githubRepo,
        aiProvider,
        defaultModel,
        geminiModel,
        deepSeekModel,
        masterAiModel,
        masterAIEnabled: masterEnabled,
        autoFix,
        proactiveAI,
        ...extra,
      } as any);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  const handleMasterSend = async () => {
    const text = masterInput.trim();
    if (!text || masterLoading) return;
    const key = openRouterApiKey;
    const model = masterAiModel;
    if (!key) {
      toast.error("Add OpenRouter key in API Keys first");
      return;
    }
    if (!model) {
      toast.error("Select a Master AI model first");
      return;
    }
    setMasterInput("");
    setMasterMsgs((p) => [...p, { role: "user", content: text }]);
    setMasterLoading(true);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://brainforge-7xn.pages.dev",
          "X-Title": "BrainForge Master AI",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: MASTER_SYSTEM_PROMPT },
            ...masterMsgs.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "No response";
      setMasterMsgs((p) => [...p, { role: "assistant", content }]);
      const fileM = content.match(/FILE:\s*([^\n]+)/);
      const codeM = content.match(/```(?:[\w.]*)?\n([\s\S]*?)```/);
      if (fileM && codeM)
        setPendingFile({ path: fileM[1].trim(), content: codeM[1], req: text });
    } catch (e: any) {
      toast.error(e.message || "Master AI failed");
    } finally {
      setMasterLoading(false);
    }
  };

  const pushToGitHub = async () => {
    if (!pendingFile || !githubToken || !githubRepo) {
      toast.error("GitHub token and repo required");
      return;
    }
    setPushing(true);
    try {
      const getRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/contents/${pendingFile.path}`,
        { headers: { Authorization: `Bearer ${githubToken}` } },
      );
      const sha = getRes.ok ? (await getRes.json()).sha : undefined;
      const putRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/contents/${pendingFile.path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `feat: ${pendingFile.req}`,
            content: btoa(unescape(encodeURIComponent(pendingFile.content))),
            ...(sha ? { sha } : {}),
          }),
        },
      );
      if (!putRes.ok) throw new Error(`GitHub push failed: ${putRes.status}`);
      toast.success("Pushed to GitHub!");
      setPendingFile(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPushing(false);
    }
  };

  function getAiFiles() {
    return [
      {
        key: "master-memory",
        label: "Master AI — Memory",
        content:
          localStorage.getItem("bf_ai_file_master-memory") ||
          `# Master AI Memory\nLast updated: ${new Date().toISOString()}\n\n## BrainForge State\n- Live: https://brainforge-7xn.pages.dev\n- GitHub: ${githubRepo || "(not set)"}\n`,
      },
      {
        key: "master-rules",
        label: "Master AI — Rules",
        content:
          localStorage.getItem("bf_ai_file_master-rules") ||
          "# Master AI Rules\n\n## ALLOWED\n- Read/write BrainForge files via GitHub\n- Deploy to Cloudflare\n- Update memory files\n\n## NOT ALLOWED\n- Help with user projects (role separation)\n- Changes without showing diff first\n- Delete files without confirmation\n",
      },
      ...projects.flatMap((p) => [
        {
          key: `project-${p.name}-memory`,
          label: `${p.name} — Memory`,
          content:
            localStorage.getItem(`bf_ai_file_project-${p.name}-memory`) ||
            `# ${p.name} Memory\n\nNo memory yet.\n`,
        },
        {
          key: `project-${p.name}-rules`,
          label: `${p.name} — Rules`,
          content:
            localStorage.getItem(`bf_ai_file_project-${p.name}-rules`) ||
            `# ${p.name} Rules\n\n## ALLOWED\n- Generate code for this project\n- Fix errors\n\n## NOT ALLOWED\n- Access other projects\n- Modify BrainForge itself\n`,
        },
      ]),
    ];
  }

  // ---- API KEYS PAGE ----
  if (page === "api")
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: "oklch(0.07 0.03 280)" }}
      >
        <BackHeader
          title="API Keys"
          onBack={() => setPage("hub")}
          accent="text-violet-300"
        />
        <div className="flex-1 overflow-auto px-5 py-5 space-y-4 max-w-lg">
          <p className="text-xs text-muted-foreground">
            Add keys for the AI providers you want to use. All stored locally on
            your device.
          </p>

          <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 space-y-3">
            <p className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> OpenRouter{" "}
              <span className="text-[10px] text-muted-foreground font-normal">
                (100+ free models)
              </span>
            </p>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                API Key{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:underline"
                >
                  openrouter.ai <ExternalLink className="inline w-2.5 h-2.5" />
                </a>
              </Label>
              <Input
                type="password"
                value={openRouterApiKey}
                onChange={(e) => setOpenRouterApiKey(e.target.value)}
                placeholder="sk-or-..."
                className="bg-black/30 border-violet-500/30"
                style={{ fontSize: "16px" }}
                data-ocid="settings.openrouter_key.input"
              />
            </div>
            {openRouterApiKey && (
              <p className="text-[10px] flex items-center gap-1 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Key
                set
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-3">
            <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Google Gemini{" "}
              <span className="text-[10px] text-muted-foreground font-normal">
                (free tier: 1M tokens/day)
              </span>
            </p>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                API Key{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  AI Studio <ExternalLink className="inline w-2.5 h-2.5" />
                </a>
              </Label>
              <Input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIza..."
                className="bg-black/30 border-blue-500/30"
                style={{ fontSize: "16px" }}
              />
            </div>
            {geminiApiKey && (
              <p className="text-[10px] flex items-center gap-1 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Key
                set
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 space-y-3">
            <p className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" /> DeepSeek{" "}
              <span className="text-[10px] text-muted-foreground font-normal">
                (very cheap, ~$0.001/1M tokens)
              </span>
            </p>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                API Key{" "}
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  platform.deepseek.com{" "}
                  <ExternalLink className="inline w-2.5 h-2.5" />
                </a>
              </Label>
              <Input
                type="password"
                value={deepSeekApiKey}
                onChange={(e) => setDeepSeekApiKey(e.target.value)}
                placeholder="sk-..."
                className="bg-black/30 border-cyan-500/30"
                style={{ fontSize: "16px" }}
              />
            </div>
            {deepSeekApiKey && (
              <p className="text-[10px] flex items-center gap-1 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Key
                set
              </p>
            )}
          </div>

          <SaveBtn
            onClick={() => save()}
            pending={saveSettings.isPending}
            color="bg-violet-600 hover:bg-violet-700"
          />
        </div>
      </div>
    );

  // ---- AI SETTINGS PAGE ----
  if (page === "ai")
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: "oklch(0.07 0.03 240)" }}
      >
        <BackHeader
          title="AI Settings"
          onBack={() => setPage("hub")}
          accent="text-blue-300"
        />
        <div className="flex-1 overflow-auto px-5 py-5 space-y-5 max-w-lg">
          {/* Provider switch */}
          <div className="space-y-2">
            <Label className="text-xs text-blue-300 font-semibold">
              AI Provider
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    id: "openrouter",
                    label: "OpenRouter",
                    sub: "100+ models",
                    color: "border-violet-500/50 bg-violet-500/10",
                    active: "border-violet-400 bg-violet-500/20",
                    dot: "bg-violet-400",
                    available: !!openRouterApiKey,
                  },
                  {
                    id: "gemini",
                    label: "Gemini",
                    sub: "Google AI",
                    color: "border-blue-500/50 bg-blue-500/10",
                    active: "border-blue-400 bg-blue-500/20",
                    dot: "bg-blue-400",
                    available: !!geminiApiKey,
                  },
                  {
                    id: "deepseek",
                    label: "DeepSeek",
                    sub: "Direct API",
                    color: "border-cyan-500/50 bg-cyan-500/10",
                    active: "border-cyan-400 bg-cyan-500/20",
                    dot: "bg-cyan-400",
                    available: !!deepSeekApiKey,
                  },
                  {
                    id: "auto",
                    label: "Auto",
                    sub: "Best available",
                    color: "border-green-500/50 bg-green-500/10",
                    active: "border-green-400 bg-green-500/20",
                    dot: "bg-green-400",
                    available: !!(
                      openRouterApiKey ||
                      geminiApiKey ||
                      deepSeekApiKey
                    ),
                  },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAiProvider(p.id as AIProvider)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                    aiProvider === p.id ? p.active : p.color,
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      p.available ? p.dot : "bg-muted-foreground/30",
                    )}
                  />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {p.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{p.sub}</p>
                  </div>
                  {aiProvider === p.id && (
                    <span className="ml-auto text-[10px] text-primary">✓</span>
                  )}
                </button>
              ))}
            </div>
            {!openRouterApiKey && !geminiApiKey && !deepSeekApiKey && (
              <p className="text-[11px] text-yellow-400">
                ⚠ No API keys set. Go to API Keys to add one.
              </p>
            )}
          </div>

          {/* Model for selected provider */}
          {aiProvider === "openrouter" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Default OpenRouter Model
              </Label>
              <Select value={defaultModel} onValueChange={setDefaultModel}>
                <SelectTrigger
                  className="bg-black/30 border-violet-500/30"
                  data-ocid="settings.default_model.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {OPENROUTER_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {aiProvider === "gemini" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Gemini Model
              </Label>
              <Select value={geminiModel} onValueChange={setGeminiModel}>
                <SelectTrigger className="bg-black/30 border-blue-500/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {GEMINI_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {aiProvider === "deepseek" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                DeepSeek Model
              </Label>
              <Select value={deepSeekModel} onValueChange={setDeepSeekModel}>
                <SelectTrigger className="bg-black/30 border-cyan-500/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {DEEPSEEK_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {aiProvider === "auto" && (
            <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5 space-y-1">
              <p className="text-xs text-green-300 font-medium">
                Auto mode order:
              </p>
              <div className="space-y-1">
                {[
                  { label: "1. OpenRouter", available: !!openRouterApiKey },
                  { label: "2. Gemini", available: !!geminiApiKey },
                  { label: "3. DeepSeek", available: !!deepSeekApiKey },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        item.available
                          ? "bg-green-400"
                          : "bg-muted-foreground/30",
                      )}
                    />
                    <span
                      className={
                        item.available
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {item.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {item.available ? "ready" : "no key"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Auto Fix Errors</p>
                <p className="text-xs text-muted-foreground">
                  AI retries up to 3x
                </p>
              </div>
              <Switch checked={autoFix} onCheckedChange={setAutoFix} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Proactive AI</p>
                <p className="text-xs text-muted-foreground">
                  AI suggests improvements
                </p>
              </div>
              <Switch checked={proactiveAI} onCheckedChange={setProactiveAI} />
            </div>
          </div>

          <SaveBtn
            onClick={() => save()}
            pending={saveSettings.isPending}
            color="bg-blue-600 hover:bg-blue-700"
          />
        </div>
      </div>
    );

  // ---- TERMUX PAGE ----
  if (page === "termux") {
    const steps = [
      { n: 1, title: "Install Node.js", cmd: "pkg install nodejs -y" },
      {
        n: 2,
        title: "Install dependencies",
        cmd: "npm install -g express axios cors",
      },
      {
        n: 3,
        title: "Download brain",
        cmd:
          typeof window !== "undefined"
            ? `curl -L ${window.location.origin}/brain.js -o ~/brain.js`
            : "curl -L [url]/brain.js -o ~/brain.js",
      },
      {
        n: 4,
        title: "Start brain",
        cmd: "node ~/brain.js YOUR_OPENROUTER_KEY",
      },
      {
        n: 5,
        title: "Install ngrok",
        cmd: "npm install -g ngrok && ngrok http 3000",
      },
    ];
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: "oklch(0.07 0.03 155)" }}
      >
        <BackHeader
          title="Termux Brain"
          onBack={() => setPage("hub")}
          accent="text-green-300"
        />
        <div className="flex-1 overflow-auto px-5 py-5 space-y-4 max-w-lg">
          <div className="flex gap-2">
            <Input
              value={termuxUrl}
              onChange={(e) => setTermuxUrl(e.target.value)}
              placeholder="https://xxxx.ngrok-free.app"
              className="bg-black/30 border-green-500/30 flex-1"
              style={{ fontSize: "16px" }}
              data-ocid="settings.termux_url.input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={recheck}
              disabled={!termuxUrl || checking}
              className="border-green-500/30"
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
                connected ? "text-green-400" : "text-destructive",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  connected ? "bg-green-400" : "bg-destructive",
                )}
              />
              {checking
                ? "Checking..."
                : connected
                  ? "Connected"
                  : "Cannot reach server"}
            </p>
          )}
          <SaveBtn
            onClick={() => save()}
            pending={saveSettings.isPending}
            color="bg-green-700 hover:bg-green-800"
          />
          <div className="space-y-2 mt-2">
            <p className="text-xs font-semibold text-green-300">Setup Guide</p>
            {steps.map((s) => (
              <div key={s.n} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-bold text-green-400">
                    {s.n}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{s.title}</p>
                  <div className="flex gap-1 mt-1">
                    <code className="flex-1 text-[10px] font-mono bg-black/30 border border-green-500/20 rounded px-2 py-1 text-green-300 truncate">
                      {s.cmd}
                    </code>
                    <CopyBtn text={s.cmd} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- GITHUB PAGE ----
  if (page === "github")
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: "oklch(0.07 0.03 50)" }}
      >
        <BackHeader
          title="GitHub & Deploy"
          onBack={() => setPage("hub")}
          accent="text-orange-300"
        />
        <div className="flex-1 overflow-auto px-5 py-5 space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              GitHub Token{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline"
              >
                get token <ExternalLink className="inline w-2.5 h-2.5" />
              </a>
            </Label>
            <Input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
              className="bg-black/30 border-orange-500/30"
              style={{ fontSize: "16px" }}
              data-ocid="settings.github_token.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <GitBranch className="w-3 h-3" /> Repository
            </Label>
            <Input
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="username/repo-name"
              className="bg-black/30 border-orange-500/30"
              style={{ fontSize: "16px" }}
              data-ocid="settings.github_repo.input"
            />
          </div>
          {githubRepo && (
            <a
              href={`https://github.com/${githubRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-orange-400 hover:underline flex items-center gap-1"
            >
              <Github className="w-3.5 h-3.5" /> View on GitHub{" "}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          <div className="p-3 rounded-lg border border-orange-500/20 bg-black/20 space-y-1">
            <p className="text-xs font-medium text-orange-300">Deploy Status</p>
            <p className="text-xs text-muted-foreground">
              Live:{" "}
              <a
                href="https://brainforge-7xn.pages.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline"
              >
                brainforge-7xn.pages.dev
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
              Worker:{" "}
              <span className="font-mono text-[10px] text-orange-300">
                brainforge-api.richard-brown-miami.workers.dev
              </span>
            </p>
          </div>
          <SaveBtn
            onClick={() => save()}
            pending={saveSettings.isPending}
            color="bg-orange-700 hover:bg-orange-800"
          />
        </div>
      </div>
    );

  // ---- MASTER AI PAGE ----
  if (page === "master-ai")
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: "oklch(0.07 0.03 340)" }}
      >
        <BackHeader
          title="Master AI"
          onBack={() => setPage("hub")}
          accent="text-pink-300"
        />
        <div className="flex-1 overflow-hidden flex flex-col gap-3 px-4 py-4">
          <div className="flex items-center justify-between shrink-0">
            <Select
              value={masterAiModel || ""}
              onValueChange={(v) => {
                setMasterAiModel(v);
                claimMasterModel.mutate(v);
              }}
            >
              <SelectTrigger
                className="bg-black/30 border-pink-500/30 w-52"
                data-ocid="settings.master_model.select"
              >
                <SelectValue placeholder="Select model…" />
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Enabled</span>
              <Switch
                checked={masterEnabled}
                onCheckedChange={(v) => {
                  setMasterEnabled(v);
                  save({ masterAIEnabled: v });
                }}
              />
            </div>
          </div>
          <div className="flex-1 border border-pink-500/20 rounded-lg overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {masterMsgs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Tell Master AI what to add or change in BrainForge
                  </p>
                )}
                {masterMsgs.map((msg, i) => (
                  <div
                    key={`mm-${msg.role}-${i}`}
                    className={cn(
                      "rounded-md p-2.5 text-xs",
                      msg.role === "user"
                        ? "chat-bubble-user ml-8"
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
                  <div className="chat-bubble-ai rounded-md p-2.5">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={masterEndRef} />
              </div>
            </ScrollArea>
            {pendingFile && (
              <div className="border-t border-pink-500/20 px-3 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5 text-pink-400" /> Ready:{" "}
                    <code className="text-pink-300 text-[10px] bg-pink-500/10 px-1 rounded">
                      {pendingFile.path}
                    </code>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setPendingFile(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={pushToGitHub}
                    disabled={pushing || !githubToken || !githubRepo}
                    className="bg-pink-600 hover:bg-pink-700 text-white flex-1 gap-1"
                    data-ocid="settings.master_ai.confirm_button"
                  >
                    {pushing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Github className="w-3.5 h-3.5" />
                    )}{" "}
                    Push to GitHub
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingFile(null)}
                    className="border-pink-500/30"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <div className="border-t border-pink-500/20 px-3 py-2 flex gap-2">
              <Input
                value={masterInput}
                onChange={(e) => setMasterInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleMasterSend()
                }
                placeholder="Tell Master AI what to change…"
                disabled={masterLoading || !masterEnabled}
                className="text-xs bg-black/30 border-pink-500/30 flex-1 h-8"
                style={{ fontSize: "16px" }}
                data-ocid="settings.master_ai.input"
              />
              <Button
                size="icon"
                onClick={handleMasterSend}
                disabled={
                  !masterInput.trim() || masterLoading || !masterEnabled
                }
                className="h-8 w-8 bg-pink-600 hover:bg-pink-700 text-white"
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
      </div>
    );

  // ---- AI FILES PAGE ----
  if (page === "ai-files") {
    const files = getAiFiles();
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: "oklch(0.07 0.03 195)" }}
      >
        <BackHeader
          title="AI Files"
          onBack={() => {
            setPage("hub");
            setSelectedFile(null);
            setEditContent("");
          }}
          accent="text-cyan-300"
        />
        {selectedFile ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 shrink-0">
              <span className="text-xs font-medium text-cyan-300 truncate flex-1 mr-2">
                {selectedFile.label}
              </span>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Save changes?")) {
                      localStorage.setItem(
                        `bf_ai_file_${selectedFile.key}`,
                        editContent,
                      );
                      toast.success("Saved");
                      setSelectedFile({
                        ...selectedFile,
                        content: editContent,
                      });
                    }
                  }}
                  className="bg-cyan-700 hover:bg-cyan-800 text-white h-7 text-xs"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedFile(null);
                    setEditContent("");
                  }}
                  className="h-7 text-xs"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <textarea
              className="flex-1 p-4 text-xs font-mono bg-black/40 text-foreground resize-none outline-none"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{ fontSize: "13px", lineHeight: 1.6 }}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto px-4 py-4">
            <p className="text-xs text-muted-foreground mb-3">
              Memory and rules files for all AI instances. Tap to view or edit.
            </p>
            <div className="space-y-2">
              {files.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className="w-full text-left p-3 rounded-lg border border-cyan-500/20 bg-black/20 hover:bg-black/40 hover:border-cyan-500/40 transition-all"
                  onClick={() => {
                    setSelectedFile(f);
                    setEditContent(f.content);
                  }}
                >
                  <p className="text-sm font-medium text-cyan-300">{f.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {f.content.split("\n")[0]}
                  </p>
                </button>
              ))}
              {files.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Create a project to see its AI files here.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- HUB PAGE ----
  const s = settings as any;
  const hasOR = !!s?.openRouterApiKey;
  const hasGem = !!s?.geminiApiKey;
  const hasDS = !!s?.deepSeekApiKey;
  const hasTx = !!s?.termuxUrl;
  const hasGH = !!s?.githubToken;
  const currentProvider: AIProvider = s?.aiProvider || "openrouter";

  return (
    <div
      className="flex flex-col h-full overflow-auto"
      style={{ background: "oklch(0.07 0.015 265)" }}
      data-ocid="settings.page"
    >
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
        {/* Status row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {[
            { label: "OpenRouter", ok: hasOR, dot: "bg-violet-400" },
            { label: "Gemini", ok: hasGem, dot: "bg-blue-400" },
            { label: "DeepSeek", ok: hasDS, dot: "bg-cyan-400" },
            { label: "GitHub", ok: hasGH, dot: "bg-orange-400" },
            { label: "Termux", ok: hasTx, dot: "bg-green-400" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  item.ok ? item.dot : "bg-muted-foreground/30",
                )}
              />
              <span
                className={
                  item.ok ? "text-foreground" : "text-muted-foreground"
                }
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
        {/* Active provider */}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">
            Active provider:
          </span>
          <span
            className={cn(
              "text-[11px] font-medium",
              currentProvider === "openrouter"
                ? "text-violet-400"
                : currentProvider === "gemini"
                  ? "text-blue-400"
                  : currentProvider === "deepseek"
                    ? "text-cyan-400"
                    : "text-green-400",
            )}
          >
            {currentProvider === "auto"
              ? "Auto"
              : currentProvider === "gemini"
                ? "Google Gemini"
                : currentProvider === "deepseek"
                  ? "DeepSeek"
                  : "OpenRouter"}
          </span>
          <button
            type="button"
            onClick={() => setPage("ai")}
            className="text-[10px] text-primary hover:underline ml-1"
          >
            change
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-5">
        {HUB_BUTTONS.map((btn) => {
          const Icon = btn.icon;
          return (
            <motion.button
              key={btn.id}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setPage(btn.id)}
              className={cn(
                "text-left p-4 rounded-xl border bg-gradient-to-br transition-all",
                btn.gradient,
                btn.border,
              )}
              data-ocid={`settings.${btn.id}.button`}
            >
              <Icon className={cn("w-6 h-6 mb-2", btn.iconColor)} />
              <p className="text-sm font-semibold text-foreground">
                {btn.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {btn.description}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
