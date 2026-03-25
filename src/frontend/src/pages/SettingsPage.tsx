/**
 * SettingsPage.tsx
 * Hub-style settings. Single AI setting applies globally to all projects + Master AI.
 * Includes Groq, GitHub Models providers, PIN lock, and dynamic Master AI memory loading.
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
  Lock,
  RefreshCw,
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
  GITHUB_MODELS,
  GROQ_MODELS,
  OPENROUTER_MODELS,
} from "../constants/models";
import { useProjects, useSaveSettings, useSettings } from "../hooks/useBackend";
import { useTermuxStatus } from "../hooks/useTermux";
import { estimateStorage } from "../utils/storage";

type Page =
  | "hub"
  | "api"
  | "ai"
  | "termux"
  | "github"
  | "master-ai"
  | "ai-files"
  | "database"
  | "pin";

const HUB_BUTTONS = [
  {
    id: "api" as Page,
    label: "API Keys",
    description: "OpenRouter, Gemini, Groq, GitHub",
    icon: Key,
    gradient: "from-violet-600/20 to-violet-600/5",
    border: "border-violet-500/30 hover:border-violet-400/60",
    iconColor: "text-violet-400",
  },
  {
    id: "ai" as Page,
    label: "AI Settings",
    description: "Provider, model, auto-fix",
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
    description: "Projects, memories, storage",
    icon: Database,
    gradient: "from-indigo-600/20 to-indigo-600/5",
    border: "border-indigo-500/30 hover:border-indigo-400/60",
    iconColor: "text-indigo-400",
  },
  {
    id: "pin" as Page,
    label: "PIN Lock",
    description: "App access protection",
    icon: Lock,
    gradient: "from-red-600/20 to-red-600/5",
    border: "border-red-500/30 hover:border-red-400/60",
    iconColor: "text-red-400",
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
  "- Settings: HUB_BUTTONS array with 8 buttons -- NO tabs\n\n" +
  "LOCKED AI SETTINGS:\n" +
  "- No DeepSeek (removed permanently)\n" +
  "- Providers: openrouter | gemini | groq | github | auto ONLY\n\n" +
  "MEMORY: Read memories/master-ai-memory.md and rules/master-ai-rules.md from GitHub for full context.";

function BackHeader({ title, onBack, accent = "text-foreground" }: { title: string; onBack: () => void; accent?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
      <button type="button" onClick={onBack}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h1 className={`text-base font-semibold ${accent}`}>{title}</h1>
    </div>
  );
}

function SaveBtn({ onClick, pending, color = "bg-primary hover:bg-primary/90" }: { onClick: () => void; pending: boolean; color?: string }) {
  return (
    <Button onClick={onClick} disabled={pending} className={`${color} text-white gap-2 w-full`}>
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      Save
    </Button>
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
  const [groqApiKey, setGroqApiKey] = useState("");
  const [githubModelsKey, setGithubModelsKey] = useState("");
  const [termuxUrl, setTermuxUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [aiProvider, setAiProvider] = useState<AIProvider>("auto");
  const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL_ID);
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");
  const [githubModelsModel, setGithubModelsModel] = useState("gpt-4o");
  const [autoFix, setAutoFix] = useState(true);
  const [masterEnabled, setMasterEnabled] = useState(true);

  // PIN lock state
  const [pinEnabled, setPinEnabled] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState(30);

  // Master AI chat
  const [masterMsgs, setMasterMsgs] = useState<{ role: string; content: string }[]>([]);
  const [masterInput, setMasterInput] = useState("");
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterMemory, setMasterMemory] = useState("");
  const [masterMemoryLoading, setMasterMemoryLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ path: string; content: string; req: string } | null>(null);
  const [pushing, setPushing] = useState(false);
  const [auditLog, setAuditLog] = useState<{ ts: string; action: string; file: string; status: string }[]>(
    () => JSON.parse(localStorage.getItem('bf_master_audit') || '[]')
  );
  const [backingUp, setBackingUp] = useState(false);
  // Voice output state
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem("bf_voice_enabled") === "true");
  const [voiceLang, setVoiceLang] = useState<"hindi" | "english">(() =>
    (localStorage.getItem("bf_voice_lang") as "hindi" | "english") || "english"
  );
  const masterEndRef = useRef<HTMLDivElement>(null);

  // AI Files
  const [selectedFile, setSelectedFile] = useState<{ key: string; label: string; content: string } | null>(null);
  const [editContent, setEditContent] = useState("");

  // Database
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    if (!settings) return;
    const s = settings as any;
    setOpenRouterApiKey(s.openRouterApiKey || "");
    setGeminiApiKey(s.geminiApiKey || "");
    setGroqApiKey(s.groqApiKey || "");
    setGithubModelsKey(s.githubModelsKey || "");
    setTermuxUrl(s.termuxUrl || "");
    setGithubToken(s.githubToken || "");
    setGithubRepo(s.githubRepo || "");
    setAiProvider((s.aiProvider === "deepseek" ? "auto" : s.aiProvider) || "auto");
    setDefaultModel(s.defaultModel || DEFAULT_MODEL_ID);
    setGeminiModel(s.geminiModel || "gemini-2.0-flash");
    setGroqModel(s.groqModel || "llama-3.3-70b-versatile");
    setGithubModelsModel(s.githubModelsModel || "gpt-4o");
    setAutoFix(s.autoFix !== false);
    setMasterEnabled(s.masterAIEnabled !== false);
    setPinEnabled(s.pinEnabled || false);
    setSessionTimeout(s.sessionTimeout || 30);
  }, [settings]);

  // Auto-load Master AI memory + send greeting when page opens
  // biome-ignore lint/correctness/useExhaustiveDependencies: run on page change only
  useEffect(() => {
    if (page === "master-ai") {
      // Auto-load memory from GitHub if not loaded
      if (!masterMemory && !masterMemoryLoading) {
        loadMasterMemory();
      }
      // Auto greeting if no messages yet
      if (masterEnabled && masterMsgs.length === 0) {
        const greeting =
          `BrainForge systems online. I am your Master AI.\n\nStatus:\n- Live: https://brainforge-7xn.pages.dev\n- Date: ${new Date().toISOString().slice(0, 10)}\n- Provider: ${aiProvider || "auto"}\n\nMemory loading from GitHub... Ready to modify BrainForge on your command.`;
        setMasterMsgs([{ role: "assistant", content: greeting }]);
        setTimeout(() => speak(greeting), 600);
      }
    }
  }, [page]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    masterEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [masterMsgs, masterLoading]);

  const { connected, checking, recheck } = useTermuxStatus(termuxUrl);

  const save = async (extra?: Record<string, unknown>) => {
    try {
      await saveSettings.mutateAsync({
        openRouterApiKey, geminiApiKey, groqApiKey, githubModelsKey,
        termuxUrl, githubToken, githubRepo, aiProvider,
        defaultModel, geminiModel, groqModel, githubModelsModel,
        autoFix, masterAIEnabled: masterEnabled,
        pinEnabled, sessionTimeout,
        ...extra,
      } as any);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  // Load Master AI memory from GitHub
  const loadMasterMemory = async () => {
    const token = githubToken || (JSON.parse(localStorage.getItem("bf_settings") || "{}")).githubToken || "";
    const repo = githubRepo || (JSON.parse(localStorage.getItem("bf_settings") || "{}")).githubRepo || "";
    if (!token || !repo) { toast.error("Set GitHub token and repo first."); return; }
    setMasterMemoryLoading(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/memories/master-ai-memory.md`,
        { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const content = atob(data.content.replace(/\n/g, ""));
        setMasterMemory(content);
        localStorage.setItem("bf_ai_file_master-memory", content);
        toast.success("Master AI memory loaded from GitHub");
      } else {
        toast.error("Memory file not found on GitHub");
      }
    } catch (e: any) {
      toast.error("Failed to load memory: " + e.message);
    } finally {
      setMasterMemoryLoading(false);
    }
  };


  // Voice output - robotic deep voice (Megatron/Darth Vader style)
  const speak = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[#*`>]/g, "").slice(0, 600);
    const utterance = new SpeechSynthesisUtterance(clean);
    const loadVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voiceLang === "hindi") {
        const v = voices.find((v) => v.lang.startsWith("hi"));
        if (v) utterance.voice = v;
      } else {
        const v = voices.find((v) =>
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("george") ||
          v.name.toLowerCase().includes("daniel")
        );
        if (v) utterance.voice = v;
      }
      utterance.pitch = 0.3;
      utterance.rate = 0.78;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    };
    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoice();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", loadVoice, { once: true });
    }
  };

  const addAuditEntry = (action: string, file: string, status: string) => {
    const entry = { ts: new Date().toISOString(), action, file, status };
    setAuditLog((prev) => {
      const updated = [entry, ...prev].slice(0, 50);
      localStorage.setItem('bf_master_audit', JSON.stringify(updated));
      return updated;
    });
  };

  // Auto-push memory update to GitHub after Master AI response
  const autoUpdateMemory = async (newContent: string) => {
    const token = githubToken || (JSON.parse(localStorage.getItem('bf_settings') || '{}')).githubToken || '';
    const repo = githubRepo || (JSON.parse(localStorage.getItem('bf_settings') || '{}')).githubRepo || '';
    if (!token || !repo) return;
    const path = 'memories/master-ai-memory.md';
    try {
      const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers: { Authorization: `Bearer ${token}` } });
      const sha = getRes.ok ? (await getRes.json()).sha : undefined;
      await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'chore: auto-update Master AI memory', content: btoa(unescape(encodeURIComponent(newContent))), ...(sha ? { sha } : {}) }),
      });
      localStorage.setItem('bf_ai_file_master-memory', newContent);
      addAuditEntry('auto-memory-update', path, 'success');
    } catch {
      addAuditEntry('auto-memory-update', path, 'failed');
    }
  };

  const handleMasterSend = async () => {
    const text = masterInput.trim();
    if (!text || masterLoading || !masterEnabled) return;
    setMasterInput("");
    setMasterMsgs((p) => [...p, { role: "user", content: text }]);
    setMasterLoading(true);
    try {
      const systemWithMemory = masterMemory
        ? `${MASTER_SYSTEM}\n\n## Current Memory:\n${masterMemory}`
        : MASTER_SYSTEM;

      let reply = "";
      if (aiProvider === "gemini" && geminiApiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemWithMemory }] },
            contents: [
              ...masterMsgs.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
              { role: "user", parts: [{ text }] },
            ],
          }),
        });
        if (!res.ok) throw new Error(`Gemini error ${res.status}`);
        const d = await res.json();
        reply = d.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
      } else if (groqApiKey) {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: groqModel,
            messages: [{ role: "system", content: systemWithMemory }, ...masterMsgs, { role: "user", content: text }],
          }),
        });
        if (!res.ok) throw new Error(`Groq error ${res.status}`);
        const d = await res.json();
        reply = d.choices?.[0]?.message?.content || "No response";
      } else if (openRouterApiKey) {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://brainforge-7xn.pages.dev",
            "X-Title": "BrainForge Master AI",
          },
          body: JSON.stringify({
            model: defaultModel,
            messages: [{ role: "system", content: systemWithMemory }, ...masterMsgs, { role: "user", content: text }],
            stream: false,
          }),
        });
        if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
        const d = await res.json();
        reply = d.choices?.[0]?.message?.content || "No response";
      } else {
        throw new Error("No API key configured. Add one in Settings > API Keys.");
      }

      setMasterMsgs((p) => [...p, { role: "assistant", content: reply }]);
      speak(reply);
      const fileM = reply.match(/FILE:\s*([^\n]+)/);
      const codeM = reply.match(/```(?:[\w.]*)\n([\s\S]*?)```/);
      if (fileM && codeM) setPendingFile({ path: fileM[1].trim(), content: codeM[1], req: text });
      // Auto-update memory: append this interaction summary
      const updatedMemory = (masterMemory || localStorage.getItem('bf_ai_file_master-memory') || '')
        + `\n\n## Session ${new Date().toISOString().slice(0, 10)}\n- User: ${text.slice(0, 100)}\n- AI: ${reply.slice(0, 200)}...`;
      autoUpdateMemory(updatedMemory);
    } catch (e: any) {
      toast.error(e.message || "Master AI failed");
    } finally {
      setMasterLoading(false);
    }
  };

  const pushToGitHub = async () => {
    if (!pendingFile) { toast.error("No file to push"); return; }
    const saved = JSON.parse(localStorage.getItem("bf_settings") || "{}");
    const token = githubToken || saved.githubToken || "";
    const repo = githubRepo || saved.githubRepo || "";
    if (!token) { toast.error("GitHub token not set. Go to GitHub & Deploy settings first."); return; }
    if (!repo) { toast.error("GitHub repo not set. Go to GitHub & Deploy settings first."); return; }
    // Confirmation before push
    const confirmed = window.confirm(`Push to GitHub?

File: ${pendingFile.path}
Repo: ${repo}

This will trigger a Cloudflare deploy.`);
    if (!confirmed) return;
    setPushing(true);
    try {
      const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${pendingFile.path}`,
        { headers: { Authorization: `Bearer ${token}` } });
      const sha = getRes.ok ? (await getRes.json()).sha : undefined;
      const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${pendingFile.path}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `feat: ${pendingFile.req}`,
          content: btoa(unescape(encodeURIComponent(pendingFile.content))),
          ...(sha ? { sha } : {}),
        }),
      });
      if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({}));
        throw new Error(errData?.message || `GitHub push failed: ${putRes.status}`);
      }
      toast.success("Pushed to GitHub! Cloudflare will deploy shortly.");
      addAuditEntry('push', pendingFile.path, 'success');
      setPendingFile(null);
    } catch (e: any) {
      toast.error(e.message);
      if (pendingFile) addAuditEntry('push', pendingFile.path, 'failed: ' + e.message);
    } finally {
      setPushing(false);
    }
  };

  function getAiFiles() {
    return [
      {
        key: "master-memory",
        label: "Master AI \u2014 Memory",
        content: localStorage.getItem("bf_ai_file_master-memory") ||
          `# Master AI Memory\nLast updated: ${new Date().toISOString()}\n\n## BrainForge State\n- Live: https://brainforge-7xn.pages.dev\n- GitHub: ${githubRepo || "(not set)"}\n`,
      },
      {
        key: "master-rules",
        label: "Master AI \u2014 Rules",
        content: localStorage.getItem("bf_ai_file_master-rules") ||
          "# Master AI Rules\n\n## ALLOWED\n- Read/write BrainForge source via GitHub\n- Deploy to Cloudflare\n- Update memory files\n\n## NOT ALLOWED\n- Modify individual user projects\n- Make changes without showing diff first\n- Delete files without confirmation\n",
      },
      ...projects.flatMap((p) => [
        {
          key: `project-${p.name}-memory`,
          label: `${p.name} \u2014 Memory`,
          content: localStorage.getItem(`bf_ai_file_project-${p.name}-memory`) ||
            `# ${p.name} Memory\n\nNo memory yet. Chat with this project to build context.\n`,
        },
        {
          key: `project-${p.name}-rules`,
          label: `${p.name} \u2014 Rules`,
          content: localStorage.getItem(`bf_ai_file_project-${p.name}-rules`) ||
            `# ${p.name} Rules\n\n## ALLOWED\n- Generate and improve code for this project\n- Fix preview errors\n\n## NOT ALLOWED\n- Access or modify other projects\n- Modify BrainForge itself\n`,
        },
      ]),
    ];
  }

  // ---- API KEYS PAGE ----
  if (page === "api")
    return (
      <div className="flex flex-col h-full" style={{ background: "oklch(0.07 0.03 280)" }}>
        <BackHeader title="API Keys" onBack={() => setPage("hub")} accent="text-violet-300" />
        <div className="flex-1 overflow-auto px-5 py-5 space-y-4 max-w-lg">
          <p className="text-xs text-muted-foreground">All keys stored locally on your device only.</p>

          {/* OpenRouter */}
          <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-violet-300 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> OpenRouter</p>
              <span className="text-[10px] text-muted-foreground">100+ free models</span>
            </div>
            <Input type="password" value={openRouterApiKey} onChange={(e) => setOpenRouterApiKey(e.target.value)}
              placeholder="sk-or-..." className="bg-black/30 border-violet-500/30" style={{ fontSize: "16px" }} />
            {openRouterApiKey
              ? <p className="text-[10px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Key set</p>
              : <p className="text-[10px] text-muted-foreground">Get free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">openrouter.ai <ExternalLink className="inline w-2.5 h-2.5" /></a></p>}
          </div>

          {/* Gemini */}
          <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Google Gemini</p>
              <span className="text-[10px] text-muted-foreground">1M tokens/day free</span>
            </div>
            <Input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIza..." className="bg-black/30 border-blue-500/30" style={{ fontSize: "16px" }} />
            {geminiApiKey
              ? <p className="text-[10px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Key set</p>
              : <p className="text-[10px] text-muted-foreground">Get free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">AI Studio <ExternalLink className="inline w-2.5 h-2.5" /></a></p>}
          </div>

          {/* Groq */}
          <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-orange-300 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Groq</p>
              <span className="text-[10px] text-muted-foreground">Ultra-fast free tier</span>
            </div>
            <Input type="password" value={groqApiKey} onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="gsk_..." className="bg-black/30 border-orange-500/30" style={{ fontSize: "16px" }} />
            {groqApiKey
              ? <p className="text-[10px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Key set</p>
              : <p className="text-[10px] text-muted-foreground">Get free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline">console.groq.com <ExternalLink className="inline w-2.5 h-2.5" /></a></p>}
          </div>

          {/* GitHub Models */}
          <div className="p-3 rounded-lg border border-gray-500/20 bg-gray-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5"><Github className="w-3.5 h-3.5" /> GitHub Models</p>
              <span className="text-[10px] text-muted-foreground">GPT-4o, DeepSeek free</span>
            </div>
            <Input type="password" value={githubModelsKey} onChange={(e) => setGithubModelsKey(e.target.value)}
              placeholder="ghp_..." className="bg-black/30 border-gray-500/30" style={{ fontSize: "16px" }} />
            {githubModelsKey
              ? <p className="text-[10px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Key set</p>
              : <p className="text-[10px] text-muted-foreground">Use your GitHub Personal Access Token with Models access</p>}
          </div>

          <SaveBtn onClick={() => save()} pending={saveSettings.isPending} color="bg-violet-600 hover:bg-violet-700" />
        </div>
      </div>
    );

  // ---- AI SETTINGS PAGE ----
  if (page === "ai")
    return (
      <div className="flex flex-col h-full" style={{ background: "oklch(0.07 0.03 240)" }}>
        <BackHeader title="AI Settings" onBack={() => setPage("hub")} accent="text-blue-300" />
        <div className="flex-1 overflow-auto px-5 py-5 space-y-5 max-w-lg">
          <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
            <p className="text-xs text-blue-300 font-medium mb-1">Global setting -- applies to all projects and Master AI.</p>
          </div>

          {/* Provider choice */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-semibold">AI Provider</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "auto", label: "Auto", sub: "Tries all providers", dot: "bg-green-400", activeBorder: "border-green-400", activeBg: "bg-green-500/15", available: !!(openRouterApiKey || geminiApiKey || groqApiKey || githubModelsKey) },
                { id: "openrouter", label: "OpenRouter", sub: "100+ free models", dot: "bg-violet-400", activeBorder: "border-violet-400", activeBg: "bg-violet-500/15", available: !!openRouterApiKey },
                { id: "gemini", label: "Gemini", sub: "Google AI direct", dot: "bg-blue-400", activeBorder: "border-blue-400", activeBg: "bg-blue-500/15", available: !!geminiApiKey },
                { id: "groq", label: "Groq", sub: "Ultra-fast inference", dot: "bg-orange-400", activeBorder: "border-orange-400", activeBg: "bg-orange-500/15", available: !!groqApiKey },
                { id: "github", label: "GitHub Models", sub: "GPT-4o, DeepSeek", dot: "bg-gray-400", activeBorder: "border-gray-400", activeBg: "bg-gray-500/15", available: !!githubModelsKey },
              ] as const).map((p) => {
                const isActive = aiProvider === p.id;
                return (
                  <button key={p.id} type="button" onClick={() => setAiProvider(p.id as AIProvider)}
                    className={cn("flex items-start gap-2.5 p-3 rounded-lg border transition-all text-left",
                      isActive ? `${p.activeBorder} ${p.activeBg}` : "border-white/10 bg-white/5 hover:bg-white/10")}>
                    <span className={cn("w-2 h-2 rounded-full mt-0.5 shrink-0", p.available ? p.dot : "bg-muted-foreground/30")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{p.label}</p>
                      <p className="text-[10px] text-muted-foreground">{p.sub}</p>
                    </div>
                    {isActive && <span className="text-primary text-xs">\u2713</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model for selected provider */}
          {aiProvider === "openrouter" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">OpenRouter Model</Label>
              <Select value={defaultModel} onValueChange={setDefaultModel}>
                <SelectTrigger className="bg-black/30 border-violet-500/30"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {OPENROUTER_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {aiProvider === "gemini" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Gemini Model</Label>
              <Select value={geminiModel} onValueChange={setGeminiModel}>
                <SelectTrigger className="bg-black/30 border-blue-500/30"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {GEMINI_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {aiProvider === "groq" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Groq Model</Label>
              <Select value={groqModel} onValueChange={setGroqModel}>
                <SelectTrigger className="bg-black/30 border-orange-500/30"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {GROQ_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {aiProvider === "github" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">GitHub Model</Label>
              <Select value={githubModelsModel} onValueChange={setGithubModelsModel}>
                <SelectTrigger className="bg-black/30 border-gray-500/30"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {GITHUB_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between py-2 border-t border-white/10">
            <div>
              <p className="text-sm text-foreground">Auto Fix Errors</p>
              <p className="text-xs text-muted-foreground">AI retries failed code up to 3x</p>
            </div>
            <Switch checked={autoFix} onCheckedChange={setAutoFix} />
          </div>

          <SaveBtn onClick={() => save()} pending={saveSettings.isPending} color="bg-blue-600 hover:bg-blue-700" />
        </div>
      </div>
    );

  // ---- TERMUX PAGE ----
  if (page === "termux")
    return (
      <div className="flex flex-col h-full" style={{ background: "oklch(0.07 0.03 160)" }}>
        <BackHeader title="Termux Brain" onBack={() => setPage("hub")} accent="text-green-300" />
        <div className="flex-1 overflow-auto px-5 py-5 space-y-4 max-w-lg">
          <p className="text-xs text-muted-foreground">Connect your Android phone running a local AI server via Termux.</p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Termux Server URL</Label>
            <Input value={termuxUrl} onChange={(e) => setTermuxUrl(e.target.value)}
              placeholder="http://192.168.1.x:8000" className="bg-black/30 border-green-500/30" style={{ fontSize: "16px" }} />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5">
            <span className={cn("w-2.5 h-2.5 rounded-full", connected ? "bg-green-400" : checking ? "bg-yellow-400 animate-pulse" : "bg-muted-foreground/30")} />
            <span className="text-xs">{connected ? "Connected" : checking ? "Checking..." : termuxUrl ? "Not reachable" : "No URL set"}</span>
            {termuxUrl && <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-auto" onClick={recheck}>Check</Button>}
          </div>
          <SaveBtn onClick={() => save()} pending={saveSettings.isPending} color="bg-green-600 hover:bg-green-700" />
        </div>
      </div>
    );

  // ---- GITHUB PAGE ----
  if (page === "github")
    return (
      <div className="flex flex-col h-full" style={{ background: "oklch(0.07 0.03 30)" }}>
        <BackHeader title="GitHub & Deploy" onBack={() => setPage("hub")} accent="text-orange-300" />
        <div className="flex-1 overflow-auto px-5 py-5 space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">GitHub Token</Label>
            <Input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..." className="bg-black/30 border-orange-500/30" style={{ fontSize: "16px" }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">GitHub Repo (owner/repo)</Label>
            <Input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="username/my-repo" className="bg-black/30 border-orange-500/30" style={{ fontSize: "16px" }} />
          </div>
          {githubToken && githubRepo && (
            <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
              <p className="text-xs text-green-400">\u2713 GitHub configured. Deploy buttons will push to <strong>{githubRepo}</strong></p>
            </div>
          )}
          <SaveBtn onClick={() => save()} pending={saveSettings.isPending} color="bg-orange-600 hover:bg-orange-700" />
        </div>
      </div>
    );

  // ---- MASTER AI PAGE ----
  if (page === "master-ai")
    return (
      <div className="flex flex-col h-full" style={{ background: "oklch(0.07 0.03 330)" }}>
        <BackHeader title="Master AI" onBack={() => setPage("hub")} accent="text-pink-300" />
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Top controls */}
          <div className="px-5 py-3 border-b border-white/10 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Enable Master AI</p>
                <p className="text-xs text-muted-foreground">Controls BrainForge itself via GitHub</p>
              </div>
              <Switch checked={masterEnabled} onCheckedChange={(v) => { setMasterEnabled(v); save({ masterAIEnabled: v }); }} />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 flex-1"
                onClick={loadMasterMemory} disabled={masterMemoryLoading}>
                {masterMemoryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Load Memory from GitHub
              </Button>
              {masterMemory && <span className="text-[10px] text-green-400">Memory loaded \u2713</span>}
            </div>
            {/* Voice Output Toggle */}
            <div className="flex items-center justify-between py-2 border-t border-white/10">
              <div>
                <p className="text-sm text-foreground">Voice Output</p>
                <p className="text-xs text-muted-foreground">Robotic AI voice (deep/slow)</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={voiceLang}
                  onChange={(e) => {
                    const v = e.target.value as "hindi" | "english";
                    setVoiceLang(v);
                    localStorage.setItem("bf_voice_lang", v);
                  }}
                  className="text-[10px] bg-black/30 border border-white/10 rounded px-1.5 py-0.5 text-muted-foreground"
                >
                  <option value="english">EN</option>
                  <option value="hindi">HI</option>
                </select>
                <Switch
                  checked={voiceEnabled}
                  onCheckedChange={(v) => {
                    setVoiceEnabled(v);
                    localStorage.setItem("bf_voice_enabled", String(v));
                    if (v) setTimeout(() => speak("Voice output enabled. Master AI is ready."), 100);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Chat messages */}
          <ScrollArea className="flex-1 px-4 py-3">
            {masterMsgs.length === 0 && (
              <div className="text-center py-10">
                <Bot className="w-8 h-8 mx-auto mb-2 text-pink-400/50" />
                <p className="text-xs text-muted-foreground">Master AI modifies BrainForge source code</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">Ask it to improve or fix the app</p>
              </div>
            )}
            <div className="space-y-3">
              {masterMsgs.map((m, i) => (
                <div key={i} className={cn("rounded-lg px-3 py-2 text-xs",
                  m.role === "user" ? "bg-pink-500/10 border border-pink-500/20 ml-6" : "bg-white/5 border border-white/10")}>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">{m.role === "user" ? "you" : "master ai"}</span>
                  <pre className="whitespace-pre-wrap font-sans leading-relaxed">{m.content}</pre>
                </div>
              ))}
              {masterLoading && (
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">master ai</span>
                  <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
                </div>
              )}
            </div>
            <div ref={masterEndRef} />
          </ScrollArea>

          {/* Pending file to push */}
          {pendingFile && (
            <div className="mx-4 mb-2 p-3 rounded-lg border border-pink-500/30 bg-pink-500/10">
              <p className="text-xs text-pink-300 font-medium mb-1">Ready to push:</p>
              <p className="text-[10px] font-mono text-muted-foreground truncate">{pendingFile.path}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" className="h-6 text-xs flex-1 bg-pink-600 hover:bg-pink-700" onClick={pushToGitHub} disabled={pushing}>
                  {pushing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Push to GitHub
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setPendingFile(null)}>Discard</Button>
              </div>
            </div>
          )}

          {/* Audit Log */}
          {auditLog.length > 0 && (
            <div className="mx-4 mb-2">
              <details className="group">
                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                  <span>Push Audit Log ({auditLog.length})</span>
                </summary>
                <div className="mt-1 space-y-1 max-h-32 overflow-auto">
                  {auditLog.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                      <span className={e.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                        {e.status === 'success' ? '✓' : '✗'}
                      </span>
                      <span className="text-muted-foreground">{e.ts.slice(0, 16)}</span>
                      <span className="text-foreground truncate flex-1">{e.file}</span>
                    </div>
                  ))}
                </div>
                <button type="button" className="text-[9px] text-muted-foreground/50 hover:text-destructive mt-1"
                  onClick={() => { setAuditLog([]); localStorage.removeItem('bf_master_audit'); }}>
                  Clear log
                </button>
              </details>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/10 shrink-0">
            <div className="flex gap-2">
              <Input value={masterInput} onChange={(e) => setMasterInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleMasterSend()}
                placeholder={masterEnabled ? "Ask Master AI to improve BrainForge..." : "Master AI is disabled"}
                disabled={!masterEnabled || masterLoading}
                className="bg-black/30 border-pink-500/30 text-xs h-8" style={{ fontSize: "16px" }} />
              <Button size="icon" className="h-8 w-8 bg-pink-600 hover:bg-pink-700 shrink-0"
                onClick={handleMasterSend} disabled={!masterInput.trim() || masterLoading || !masterEnabled}>
                {masterLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
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
      <div className="flex flex-col h-full" style={{ background: "oklch(0.07 0.03 200)" }}>
        <BackHeader title="AI Files" onBack={() => setPage("hub")} accent="text-cyan-300" />
        {selectedFile ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 shrink-0">
              <button type="button" onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-medium truncate flex-1">{selectedFile.label}</span>
              <Button size="sm" className="h-6 text-xs bg-cyan-600 hover:bg-cyan-700"
                onClick={() => { localStorage.setItem(`bf_ai_file_${selectedFile.key}`, editContent); toast.success("Saved"); }}>
                Save
              </Button>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 bg-transparent px-5 py-4 font-mono text-xs text-foreground resize-none focus:outline-none leading-relaxed"
              style={{ fontSize: "13px" }}
            />
          </div>
        ) : (
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-2">
              {files.map((f) => (
                <button key={f.key} type="button"
                  onClick={() => { setSelectedFile(f); setEditContent(f.content); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:border-cyan-400/40 hover:bg-cyan-500/5 transition-all text-left">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{f.content.split("\n")[0]}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  const backupD1ToGitHub = async () => {
    const workerUrl = 'https://brainforge-api.richard-brown-miami.workers.dev/api/backup';
    const saved = JSON.parse(localStorage.getItem('bf_settings') || '{}');
    const token = saved.githubToken || '';
    const repo = saved.githubRepo || '';
    if (!token || !repo) { toast.error('Set GitHub token and repo first.'); return; }
    setBackingUp(true);
    try {
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-BrainForge-Secret': '2200' },
        body: JSON.stringify({ githubToken: token, githubRepo: repo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup failed');
      toast.success(`D1 backed up to GitHub: ${data.path} (${data.rows} rows)`);
      addAuditEntry('d1-backup', data.path, 'success');
    } catch (e: any) {
      toast.error('Backup failed: ' + e.message);
    } finally {
      setBackingUp(false);
    }
  };

  // ---- DATABASE PAGE ----
  if (page === "database") {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith("bf_"));
    const chatKeys = allKeys.filter(k => k.startsWith("bf_chat_"));
    const snapshotKeys = allKeys.filter(k => k.startsWith("bf_snapshots_"));
    const aiFileKeys = allKeys.filter(k => k.startsWith("bf_ai_file_"));

    return (
      <div className="flex flex-col h-full" style={{ background: "oklch(0.07 0.03 260)" }}>
        <BackHeader title="Database" onBack={() => setPage("hub")} accent="text-indigo-300" />
        <div className="flex-1 overflow-auto px-5 py-5 space-y-5">
          {/* Storage meter */}
          <div className="p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-indigo-300">Storage Usage</p>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]"
                onClick={async () => { const s = await estimateStorage(); setStorageInfo(s); }}>
                Refresh
              </Button>
            </div>
            {storageInfo ? (
              <>
                <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                  <div className="h-2 rounded-full bg-indigo-400" style={{ width: `${Math.min(100, (storageInfo.used / storageInfo.quota) * 100)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {(storageInfo.used / 1024 / 1024).toFixed(2)} MB / {(storageInfo.quota / 1024 / 1024).toFixed(0)} MB
                </p>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground">Click Refresh to check storage</p>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Projects", value: projects.length, color: "text-blue-400" },
              { label: "Chat Sessions", value: chatKeys.length, color: "text-green-400" },
              { label: "Snapshots", value: snapshotKeys.length, color: "text-yellow-400" },
              { label: "AI Memory Files", value: aiFileKeys.length, color: "text-pink-400" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg border border-white/10 bg-white/5 text-center">
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Projects list */}
          {projects.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Projects</p>
              <div className="space-y-1.5">
                {projects.map((p) => {
                  const chatSize = (localStorage.getItem(`bf_chat_${p.name}`) || "").length;
                  return (
                    <div key={p.name} className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-white/5">
                      <span className="text-xs text-foreground truncate flex-1">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{(chatSize / 1024).toFixed(1)} KB chat</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* D1 Backup */}
          <div className="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 space-y-2">
            <p className="text-xs font-semibold text-indigo-300">Cloudflare D1 Backup</p>
            <p className="text-[10px] text-muted-foreground">Push a snapshot of D1 database to GitHub. Cron runs daily at 2am UTC automatically once Worker is redeployed.</p>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-2 border-indigo-500/30"
              onClick={backupD1ToGitHub} disabled={backingUp}>
              {backingUp ? <><Loader2 className="w-3 h-3 animate-spin" /> Backing up...</> : 'Backup D1 to GitHub Now'}
            </Button>
          </div>

          {/* Export / Clear */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-2 border-indigo-500/30"
              onClick={() => {
                const data: Record<string, string> = {};
                for (const k of allKeys) data[k] = localStorage.getItem(k) || "";
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "brainforge-backup.json"; a.click();
                URL.revokeObjectURL(url);
                toast.success("Backup downloaded");
              }}>
              Export All Data (JSON)
            </Button>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-2 border-red-500/30 text-red-400 hover:text-red-300"
              onClick={() => {
                if (!window.confirm("Clear all BrainForge data? This cannot be undone.")) return;
                for (const k of allKeys) localStorage.removeItem(k);
                toast.success("All data cleared");
                window.location.reload();
              }}>
              Clear All Data
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- PIN LOCK PAGE ----
  if (page === "pin")
    return (
      <div className="flex flex-col h-full" style={{ background: "oklch(0.07 0.03 0)" }}>
        <BackHeader title="PIN Lock" onBack={() => setPage("hub")} accent="text-red-300" />
        <div className="flex-1 overflow-auto px-5 py-5 space-y-5 max-w-lg">
          <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-red-500/5">
            <div>
              <p className="text-sm text-foreground">Enable PIN Lock</p>
              <p className="text-xs text-muted-foreground">Require PIN to open BrainForge</p>
            </div>
            <Switch checked={pinEnabled} onCheckedChange={setPinEnabled} />
          </div>

          {pinEnabled && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Current PIN (leave blank if setting new)</Label>
                <Input type="password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="Enter current PIN" className="bg-black/30 border-red-500/30" style={{ fontSize: "16px" }} maxLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">New PIN (4-6 digits)</Label>
                <Input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 1234" className="bg-black/30 border-red-500/30" style={{ fontSize: "16px" }} maxLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Confirm New PIN</Label>
                <Input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Repeat PIN" className="bg-black/30 border-red-500/30" style={{ fontSize: "16px" }} maxLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Session Timeout (minutes)</Label>
                <Input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  min={5} max={480} className="bg-black/30 border-red-500/30" style={{ fontSize: "16px" }} />
                <p className="text-[10px] text-muted-foreground">App locks after this many minutes of inactivity</p>
              </div>
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={saveSettings.isPending || newPin.length < 4 || newPin !== confirmPin}
                onClick={async () => {
                  const saved = JSON.parse(localStorage.getItem("bf_settings") || "{}");
                  const existingPin = saved.pinCode || "";
                  if (existingPin && currentPin !== existingPin) {
                    toast.error("Current PIN is incorrect");
                    return;
                  }
                  if (newPin !== confirmPin) { toast.error("PINs do not match"); return; }
                  await save({ pinEnabled, pinCode: newPin, sessionTimeout });
                  setCurrentPin(""); setNewPin(""); setConfirmPin("");
                  toast.success("PIN updated successfully");
                }}>
                {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Set PIN
              </Button>
            </>
          )}

          {!pinEnabled && (
            <Button className="w-full" onClick={() => save({ pinEnabled: false, pinCode: "" })} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save (PIN Disabled)
            </Button>
          )}
        </div>
      </div>
    );

  // ---- HUB PAGE ----
  return (
    <div className="flex flex-col h-full" style={{ background: "oklch(0.07 0.02 280)" }} data-ocid="settings.hub">
      <div className="px-5 py-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Settings className="w-4 h-4 text-primary" />
          <h1 className="text-base font-semibold text-foreground">Settings</h1>
        </div>
        <p className="text-xs text-muted-foreground">Configure BrainForge</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 grid grid-cols-2 gap-3">
          {HUB_BUTTONS.map((btn, i) => (
            <motion.button key={btn.id} type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setPage(btn.id)}
              className={cn("p-4 rounded-xl border bg-gradient-to-br text-left transition-all active:scale-95", btn.gradient, btn.border)}
              data-ocid={`settings.hub.${btn.id}`}>
              <btn.icon className={cn("w-5 h-5 mb-3", btn.iconColor)} />
              <p className="text-sm font-semibold text-foreground">{btn.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{btn.description}</p>
            </motion.button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
