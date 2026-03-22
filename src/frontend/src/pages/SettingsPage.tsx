/**
 * SettingsPage.tsx
 * Hub-style settings. Single AI setting applies globally to all projects + Master AI.
 * Per-project isolation is memory/rules files only, not model selection.
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
  Database,
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
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type AIProvider,
  DEFAULT_MODEL_ID,
  GEMINI_MODELS,
  OPENROUTER_MODELS,
} from "../constants/models";
import { useProjects, useSaveSettings, useSettings } from "../hooks/useBackend";
import { useTermuxStatus } from "../hooks/useTermux";

type Page =
  | "hub"
  | "api"
  | "ai"
  | "termux"
  | "github"
  | "master-ai"
  | "ai-files"
  | "database";

const HUB_BUTTONS = [
  {
    id: "api" as Page,
    label: "API Keys",
    description: "OpenRouter, Gemini",
    icon: Key,
    gradient: "from-violet-600/20 to-violet-600/5",
    border: "border-violet-500/30 hover:border-violet-400/60",
    iconColor: "text-violet-400",
  },
  {
    id: "ai" as Page,
    label: "AI Settings",
    description: "One setting for all projects",
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
    description: "Memory & rules per project",
    icon: FileText,
    gradient: "from-cyan-600/20 to-cyan-600/5",
    border: "border-cyan-500/30 hover:border-cyan-400/60",
    iconColor: "text-cyan-400",
  },
  {
    id: "database" as Page,
    label: "Database",
    description: "Projects, memories, D1 sync",
    icon: Database,
    gradient: "from-indigo-600/20 to-indigo-600/5",
    border: "border-indigo-500/30 hover:border-indigo-400/60",
    iconColor: "text-indigo-400",
  },
];

const MASTER_SYSTEM =
  "You are the Master AI for BrainForge. Your ONLY job is to modify BrainForge source files.\n\n" +
  "STRICT RULES:\n" +
  "1. NEVER explain code in chat. NEVER write code snippets in the chat message.\n" +
  "2. ALWAYS respond with EXACTLY this format:\n" +
  "   [One sentence describing the change]\n" +
  "   FILE: src/frontend/src/pages/SomeFile.tsx\n" +
  "   ```\n" +
  "   [complete updated file content here]\n" +
  "   ```\n" +
  "3. Only modify BrainForge files (src/frontend/src/...). Do NOT help with user app projects.\n" +
  "4. The file path must start with src/frontend/src/\n" +
  "5. Return the COMPLETE file -- never partial code.\n\n" +
  "LOCKED SCREENS (NEVER change these):\n" +
  "- Chat: previewOpen overlay, rows={1} textarea, full screen -- NO splits\n" +
  "- Preview: fixed inset-0 z-50 full-screen overlay -- NO side-by-side\n" +
  "- Settings: HUB_BUTTONS array with 7 buttons -- NO tabs\n\n" +
  "LOCKED AI SETTINGS:\n" +
  "- No DeepSeek (removed permanently)\n" +
  "- Gemini: gemini-2.0-flash and gemini-2.0-flash-lite ONLY\n" +
  "- AIProvider type: openrouter | gemini | auto ONLY\n\n" +
  "MEMORY: Read memories/master-ai-memory.md and rules/master-ai-rules.md from GitHub for full context.";

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

  // Form state
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [termuxUrl, setTermuxUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [aiProvider, setAiProvider] = useState<AIProvider>("auto");
  const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL_ID);
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [autoFix, setAutoFix] = useState(true);
  const [masterEnabled, setMasterEnabled] = useState(true);

  // Master AI chat
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
    setTermuxUrl(s.termuxUrl || "");
    setGithubToken(s.githubToken || "");
    setGithubRepo(s.githubRepo || "");
    setAiProvider((s.aiProvider === "deepseek" ? "auto" : s.aiProvider) || "auto");
    setDefaultModel(s.defaultModel || DEFAULT_MODEL_ID);
    setGeminiModel(s.geminiModel || "gemini-2.0-flash");
    setAutoFix(s.autoFix !== false);
    setMasterEnabled(s.masterAIEnabled !== false);
  }, [settings]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    masterEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [masterMsgs, masterLoading]);

  const { connected, checking, recheck } = useTermuxStatus(termuxUrl);

  const save = async (extra?: Record<string, unknown>) => {
    try {
      await saveSettings.mutateAsync({
        openRouterApiKey,
        geminiApiKey,
        termuxUrl,
        githubToken,
        githubRepo,
        aiProvider,
        defaultModel,
        geminiModel,
        autoFix,
        masterAIEnabled: masterEnabled,
        ...extra,
      } as any);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  // Get AI key+model for Master AI (uses same global setting)
  const masterAiKey =
    aiProvider === "gemini" ? geminiApiKey : openRouterApiKey;

  const handleMasterSend = async () => {
    const text = masterInput.trim();
    if (!text || masterLoading || !masterEnabled) return;
    if (!masterAiKey && aiProvider !== "auto") {
      toast.error("Add an API key in API Keys first");
      return;
    }
    setMasterInput("");
    setMasterMsgs((p) => [...p, { role: "user", content: text }]);
    setMasterLoading(true);
    try {
      let reply = "";
      // Use global AI provider
      const useKey = openRouterApiKey || geminiApiKey;
      if (!useKey)
        throw new Error(
          "No API key configured. Add one in Settings > API Keys.",
        );

      if (aiProvider === "gemini" && geminiApiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: MASTER_SYSTEM }] },
            contents: [
              ...masterMsgs.map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
              })),
              { role: "user", parts: [{ text }] },
            ],
          }),
        });
        if (!res.ok) throw new Error(`Gemini error ${res.status}`);
        const d = await res.json();
        reply = d.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
      } else {
        // OpenRouter (default / auto fallback)
        const key = openRouterApiKey;
        if (!key) throw new Error("No OpenRouter key. Add it in API Keys.");
        const res = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://brainforge-7xn.pages.dev",
              "X-Title": "BrainForge Master AI",
            },
            body: JSON.stringify({
              model: defaultModel,
              messages: [
                { role: "system", content: MASTER_SYSTEM },
                ...masterMsgs,
                { role: "user", content: text },
              ],
              stream: false,
            }),
          },
        );
        if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
        const d = await res.json();
        reply = d.choices?.[0]?.message?.content || "No response";
      }

      setMasterMsgs((p) => [...p, { role: "assistant", content: reply }]);
      const fileM = reply.match(/FILE:\s*([^\n]+)/);
      const codeM = reply.match(/```(?:[\w.]*)?\n([\s\S]*?)```/);
      if (fileM && codeM)
        setPendingFile({ path: fileM[1].trim(), content: codeM[1], req: text });
    } catch (e: any) {
      toast.error(e.message || "Master AI failed");
    } finally {
      setMasterLoading(false);
    }
  };

  const pushToGitHub = async () => {
    if (!pendingFile) { toast.error("No file to push"); return; }
    // Read token/repo from state OR directly from localStorage as fallback
    const savedSettings = JSON.parse(localStorage.getItem("bf_settings") || "{}");
    const token = githubToken || savedSettings.githubToken || "";
    const repo = githubRepo || savedSettings.githubRepo || "";
    if (!token) { toast.error("GitHub token not set. Go to GitHub & Deploy settings first."); return; }
    if (!repo) { toast.error("GitHub repo not set. Go to GitHub & Deploy settings first."); return; }
    setPushing(true);
    try {
      const getRes = await fetch(
        `https://api.github.com/repos/${repo}/contents/${pendingFile.path}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const sha = getRes.ok ? (await getRes.json()).sha : undefined;
      const putRes = await fetch(
        `https://api.github.com/repos/${repo}/contents/${pendingFile.path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `feat: ${pendingFile.req}`,
            content: btoa(unescape(encodeURIComponent(pendingFile.content))),
            ...(sha ? { sha } : {}),
          }),
        },
      );
      if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({}));
        throw new Error(errData?.message || `GitHub push failed: ${putRes.status}`);
      }
      toast.success("Pushed to GitHub! Cloudflare will deploy shortly.");
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
        label: "Master AI \u2014 Memory",
        content:
          localStorage.getItem("bf_ai_file_master-memory") ||
          `# Master AI Memory\nLast updated: ${new Date().toISOString()}\n\n## BrainForge State\n- Live: https://brainforge-7xn.pages.dev\n- GitHub: ${githubRepo || "(not set)"}\n`,
      },
      {
        key: "master-rules",
        label: "Master AI \u2014 Rules",
        content:
          localStorage.getItem("bf_ai_file_master-rules") ||
          "# Master AI Rules\n\n## ALLOWED\n- Read/write BrainForge source via GitHub\n- Deploy to Cloudflare\n- Update memory files\n\n## NOT ALLOWED\n- Modify individual user projects (that is project AI's job)\n- Make changes without showing diff first\n- Delete files without confirmation\n",
      },
      ...projects.flatMap((p) => [
        {
          key: `project-${p.name}-memory`,
          label: `${p.name} \u2014 Memory`,
          content:
            localStorage.getItem(`bf_ai_file_project-${p.name}-memory`) ||
            `# ${p.name} Memory\n\nNo memory yet. Chat with this project to build context.\n`,
        },
        {
          key: `project-${p.name}-rules`,
          label: `${p.name} \u2014 Rules`,
          content:
            localStorage.getItem(`bf_ai_file_project-${p.name}-rules`) ||
            `# ${p.name} Rules\n\n## ALLOWED\n- Generate and improve code for this project\n- Fix preview errors\n- Suggest improvements\n\n## NOT ALLOWED\n- Access or modify other projects\n- Modify BrainForge itself (that is Master AI's job)\n`,
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
            Add keys for the providers you want. All stored locally on your
            device only.
          </p>

          <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> OpenRouter
              </p>
              <span className="text-[10px] text-muted-foreground">
                100+ free models
              </span>
            </div>
            <Input
              type="password"
              value={openRouterApiKey}
              onChange={(e) => setOpenRouterApiKey(e.target.value)}
              placeholder="sk-or-..."
              className="bg-black/30 border-violet-500/30"
              style={{ fontSize: "16px" }}
              data-ocid="settings.openrouter_key.input"
            />
            <div className="flex items-center justify-between">
              {openRouterApiKey ? (
                <p className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Key
                  set
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Get free key at{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 underline"
                  >
                    openrouter.ai{" "}
                    <ExternalLink className="inline w-2.5 h-2.5" />
                  </a>
                </p>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Google Gemini
              </p>
              <span className="text-[10px] text-muted-foreground">
                1M tokens/day free
              </span>
            </div>
            <Input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIza..."
              className="bg-black/30 border-blue-500/30"
              style={{ fontSize: "16px" }}
            />
            <div className="flex items-center justify-between">
              {geminiApiKey ? (
                <p className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Key
                  set
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Get free key at{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    AI Studio <ExternalLink className="inline w-2.5 h-2.5" />
                  </a>
                </p>
              )}
            </div>
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
          <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
            <p className="text-xs text-blue-300 font-medium mb-1">
              This setting applies to all projects and Master AI.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Choose your preferred provider. Auto tries them in order and
              switches automatically on rate limits.
            </p>
          </div>

          {/* Provider choice */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-semibold">
              AI Provider
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    id: "auto",
                    label: "Auto",
                    sub: "Tries all, best available",
                    dot: "bg-green-400",
                    activeBorder: "border-green-400",
                    activeBg: "bg-green-500/15",
                    available: !!(
                      openRouterApiKey ||
                      geminiApiKey
                    ),
                  },
                  {
                    id: "openrouter",
                    label: "OpenRouter",
                    sub: "100+ free models",
                    dot: "bg-violet-400",
                    activeBorder: "border-violet-400",
                    activeBg: "bg-violet-500/15",
                    available: !!openRouterApiKey,
                  },
                  {
                    id: "gemini",
                    label: "Gemini",
                    sub: "Google AI direct",
                    dot: "bg-blue-400",
                    activeBorder: "border-blue-400",
                    activeBg: "bg-blue-500/15",
                    available: !!geminiApiKey,
                  },
                ] as const
              ).map((p) => {
                const isActive = aiProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAiProvider(p.id as AIProvider)}
                    className={cn(
                      "flex items-start gap-2.5 p-3 rounded-lg border transition-all text-left",
                      isActive
                        ? `${p.activeBorder} ${p.activeBg}`
                        : "border-white/10 bg-white/5 hover:bg-white/10",
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full mt-0.5 shrink-0",
                        p.available ? p.dot : "bg-muted-foreground/30",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {p.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.sub}
                      </p>
                    </div>
                    {isActive && (
                      <span className="text-primary text-xs">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            {!openRouterApiKey && !geminiApiKey && (
              <p className="text-[11px] text-yellow-400 flex items-center gap-1">
                ⚠️ No API keys set. Go to{" "}
                <button
                  type="button"
                  onClick={() => setPage("api")}
                  className="underline text-violet-400"
                >
                  API Keys
                </button>{" "}
                to add one.
              </p>
            )}
          </div>

          {/* Model for selected provider (shown only when not auto) */}
          {aiProvider === "openrouter" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                OpenRouter Model
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
          {aiProvider === "auto" && (
            <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5 space-y-2">
              <p className="text-xs text-green-300 font-medium">
                Auto tries in this order:
              </p>
              {[
                {
                  label: "OpenRouter",
                  available: !!openRouterApiKey,
                  dot: "bg-violet-400",
                },
                {
                  label: "Gemini",
                  available: !!geminiApiKey,
                  dot: "bg-blue-400",
                },

              ].map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="text-muted-foreground w-3">{i + 1}.</span>
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      item.available ? item.dot : "bg-muted-foreground/30",
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
                  <span className="text-[10px] ml-auto">
                    {item.available ? (
                      <span className="text-green-400">ready</span>
                    ) : (
                      <span className="text-muted-foreground">no key</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between py-2 border-t border-white/10">
            <div>
              <p className="text-sm text-foreground">Auto Fix Errors</p>
              <p className="text-xs text-muted-foreground">
                AI retries failed code up to 3x
              </p>
            </div>
            <Switch checked={autoFix} onCheckedChange={setAutoFix} />
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
            : "",
      },
      {
        n: 4,
        title: "Start brain",
        cmd: "node ~/brain.js YOUR_OPENROUTER_KEY",
      },
      {
        n: 5,
        title: "Get public URL",
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
          <div className="space-y-3 mt-2">
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
                    {s.cmd && <CopyBtn text={s.cmd} />}
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
            <div>
              <p className="text-xs font-medium text-pink-300">
                BrainForge app controller
              </p>
              <p className="text-[10px] text-muted-foreground">
                Uses your global AI setting ({aiProvider})
              </p>
            </div>
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
            <ScrollArea className="flex-1" style={{ overflow: "auto" }}>
              <div className="p-4 space-y-3">
                {masterMsgs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Tell Master AI what to change in BrainForge.
                    <br />
                    <span className="text-[10px] text-muted-foreground/60">
                      It uses your selected AI provider ({aiProvider})
                    </span>
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
                    type="button"
                    size="sm"
                    onClick={pushToGitHub}
                    disabled={pushing}
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
                    type="button"
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
                placeholder="Tell Master AI what to change in BrainForge…"
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
              Each project and Master AI has isolated memory and rules. Tap to
              read or edit.
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

  // ---- DATABASE PAGE ----
  if (page === "database") {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith("bf_"));
    // Use bf_projects as source of truth
    const projectList: { name: string }[] = JSON.parse(localStorage.getItem("bf_projects") || "[]");
    const memoryKeys = allKeys.filter(k => k.startsWith("bf_ai_file_"));
    const totalBytes = allKeys.reduce((acc, k) => acc + (localStorage.getItem(k) || "").length * 2, 0);
    const maxBytes = 5 * 1024 * 1024;
    const usedPct = Math.min(100, (totalBytes / maxBytes) * 100);
    const meterColor = usedPct > 90 ? "bg-red-500" : usedPct > 70 ? "bg-yellow-500" : "bg-green-500";

    const exportAll = () => {
      const data: Record<string, string> = {};
      for (const k of allKeys) data[k] = localStorage.getItem(k) || "";
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "brainforge-backup.json"; a.click();
      URL.revokeObjectURL(url);
    };

    const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          for (const [k, v] of Object.entries(data)) { if (k.startsWith("bf_")) localStorage.setItem(k, v as string); }
          toast.success("Data imported. Refresh to see changes.");
        } catch { toast.error("Invalid backup file"); }
      };
      reader.readAsText(file);
    };

    return (
      <div className="flex flex-col h-full" style={{ background: "oklch(0.07 0.03 260)" }}>
        <BackHeader title="Database" onBack={() => setPage("hub")} accent="text-indigo-300" />
        <div className="flex-1 overflow-auto px-4 py-4 space-y-4 max-w-lg">

          {/* Storage meter */}
          <div className="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-indigo-300 font-medium">Local Storage</p>
              <p className="text-[11px] text-muted-foreground">{(totalBytes / 1024).toFixed(1)} KB / ~5 MB</p>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${meterColor}`} style={{ width: `${usedPct}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground">{allKeys.length} keys · {usedPct.toFixed(1)}% used</p>
          </div>

          {/* Project folders from bf_projects */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Project Files ({projectList.length})
            </p>
            {projectList.length === 0 && (
              <p className="text-xs text-muted-foreground">No projects yet. Create one from the Projects page.</p>
            )}
            {projectList.map((p) => {
              const msgs = JSON.parse(localStorage.getItem(`bf_chat_${p.name}`) || "[]").length;
              const snaps = JSON.parse(localStorage.getItem(`bf_snapshots_${p.name}`) || "[]").length;
              const deployUrl = localStorage.getItem(`bf_deploy_url_${p.name}`) || "";
              return (
                <div key={p.name} className="p-2.5 rounded-lg border border-indigo-500/20 bg-black/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">{p.name}</p>
                    <Button size="sm" variant="ghost" className="h-5 text-[10px] text-destructive hover:text-destructive"
                      onClick={() => {
                        if (!window.confirm(`Clear all data for "${p.name}"?`)) return;
                        [`bf_chat_${p.name}`, `bf_snapshots_${p.name}`, `bf_deploy_url_${p.name}`]
                          .forEach(k => localStorage.removeItem(k));
                        toast.success("Cleared");
                      }}>Clear</Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {msgs} messages · {snaps} snapshots
                  </p>
                  {deployUrl && (
                    <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-green-400 hover:underline block truncate">
                      🌐 {deployUrl}
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI Memories */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              AI Memory Files ({memoryKeys.length})
            </p>
            {memoryKeys.length === 0 && <p className="text-xs text-muted-foreground">No memory files yet</p>}
            {memoryKeys.map(k => (
              <div key={k} className="p-2.5 rounded-lg border border-indigo-500/20 bg-black/20">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-mono text-indigo-300 truncate flex-1 mr-2">
                    {k.replace("bf_ai_file_", "")}
                  </p>
                  <Button size="sm" variant="ghost" className="h-5 text-[10px] text-destructive shrink-0"
                    onClick={() => { localStorage.removeItem(k); toast.success("Cleared"); }}>Clear</Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  {(localStorage.getItem(k) || "").slice(0, 80)}
                </p>
              </div>
            ))}
          </div>

          {/* Backup */}
          <div className="space-y-2 border-t border-indigo-500/20 pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Backup & Sync</p>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs h-8" onClick={exportAll}>
              <Database className="w-3.5 h-3.5" /> Export All Data as JSON
            </Button>
            <label className="block cursor-pointer">
              <div className="w-full flex items-center justify-center py-2 px-3 rounded-md border border-indigo-500/30 hover:border-indigo-400/60 bg-black/20 text-xs text-indigo-300 transition-colors">
                Import Backup JSON
              </div>
              <input type="file" accept=".json" className="hidden" onChange={importData} />
            </label>
            {githubToken && githubRepo
              ? <p className="text-[10px] text-green-400">✓ GitHub configured -- deploy links sync automatically</p>
              : <p className="text-[10px] text-muted-foreground">Set GitHub token + repo to enable deploy sync</p>}
          </div>
        </div>
      </div>
    );
  }

    // ---- HUB ----
  const s = settings as any;
  const currentProvider: AIProvider = s?.aiProvider || "auto";
  const providerLabel =
    currentProvider === "auto"
      ? "Auto"
      : currentProvider === "gemini"
        ? "Google Gemini"
        : "OpenRouter";
  const providerColor =
    currentProvider === "auto"
      ? "text-green-400"
      : currentProvider === "gemini"
        ? "text-blue-400"
        : "text-violet-400";

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

        {/* Active AI + status */}
        <div className="mt-3 p-3 rounded-lg border border-white/10 bg-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Active AI</span>
            <button
              type="button"
              onClick={() => setPage("ai")}
              className="text-[10px] text-primary hover:underline"
            >
              change
            </button>
          </div>
          <p className={`text-sm font-semibold ${providerColor}`}>
            {providerLabel}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {[
              {
                label: "OpenRouter",
                ok: !!s?.openRouterApiKey,
                dot: "bg-violet-400",
              },
              { label: "Gemini", ok: !!s?.geminiApiKey, dot: "bg-blue-400" },
                          ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1 text-[10px]"
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    item.ok ? item.dot : "bg-muted-foreground/20",
                  )}
                />
                <span
                  className={
                    item.ok ? "text-foreground" : "text-muted-foreground/50"
                  }
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
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
              <Icon className={cn("w-5 h-5 mb-2", btn.iconColor)} />
              <p className="text-sm font-semibold text-foreground">
                {btn.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {btn.description}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

