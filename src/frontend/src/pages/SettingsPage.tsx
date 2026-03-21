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
  AlertCircle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  GitBranch,
  Github,
  Key,
  Loader2,
  Save,
  Send,
  Settings,
  Sliders,
  Terminal,
  Trash2,
  X,
  Zap,
  Database,
  Globe,
  Shield,
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

type SettingsSection = "hub" | "api" | "ai" | "termux" | "github" | "master";

const STEPS = [
  { num: 1, title: "Install Node.js in Termux", cmd: "pkg install nodejs -y", note: "Open Termux on your Android phone" },
  { num: 2, title: "Install dependencies", cmd: "npm install -g express axios cors", note: "Wait ~2 minutes" },
  { num: 3, title: "Download brain server", cmd: "", note: "Downloads the BrainForge server to your phone" },
  { num: 4, title: "Start the brain", cmd: "node ~/brain.js YOUR_OPENROUTER_KEY", note: "Replace with your OpenRouter key" },
  { num: 5, title: "Install ngrok & expose port", cmd: "npm install -g ngrok && ngrok http 3000", note: "Gives your phone a public https URL" },
  { num: 6, title: "Paste your ngrok URL", cmd: "https://xxxx.ngrok-free.app", note: "Copy the Forwarding URL from ngrok" },
];

const MASTER_AI_SYSTEM_PROMPT =
  "You are a code editor for BrainForge. The user will ask you to add, modify or remove features. " +
  "Respond with ONLY the complete updated file content. " +
  "Format: FILE: path/to/file.tsx\n```\n[complete file content]\n```";

interface MasterMessage { role: "user" | "assistant"; content: string; }
interface PendingChange { filePath: string; newContent: string; userRequest: string; }

function parseMasterResponse(response: string): { filePath: string; content: string } | null {
  const fileMatch = response.match(/FILE:\s*([^\n]+)/);
  const codeMatch = response.match(/```(?:[\w.]*)?\n([\s\S]*?)```/);
  if (!fileMatch || !codeMatch) return null;
  return { filePath: fileMatch[1].trim(), content: codeMatch[1] };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button type="button" onClick={copy}
      className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/80 transition-colors border border-white/20">
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// Settings section cards for the hub
const SECTIONS = [
  {
    id: "api" as SettingsSection,
    icon: Key,
    title: "API Keys",
    description: "OpenRouter, Supabase, Cloudflare",
    color: "from-violet-600/20 to-violet-800/10",
    border: "border-violet-500/30",
    iconColor: "text-violet-400",
    badge: null,
  },
  {
    id: "ai" as SettingsSection,
    icon: Sliders,
    title: "AI Behaviour",
    description: "Model, temperature, auto-fix, live search",
    color: "from-blue-600/20 to-blue-800/10",
    border: "border-blue-500/30",
    iconColor: "text-blue-400",
    badge: null,
  },
  {
    id: "termux" as SettingsSection,
    icon: Terminal,
    title: "Termux Brain",
    description: "Run AI backend on your Android phone",
    color: "from-green-600/20 to-green-800/10",
    border: "border-green-500/30",
    iconColor: "text-green-400",
    badge: null,
  },
  {
    id: "github" as SettingsSection,
    icon: Github,
    title: "GitHub & Deploy",
    description: "Token, repo, auto-deploy via Cloudflare",
    color: "from-orange-600/20 to-orange-800/10",
    border: "border-orange-500/30",
    iconColor: "text-orange-400",
    badge: null,
  },
  {
    id: "master" as SettingsSection,
    icon: Bot,
    title: "Master AI",
    description: "App controller -- modify BrainForge itself",
    color: "from-pink-600/20 to-pink-800/10",
    border: "border-pink-500/30",
    iconColor: "text-pink-400",
    badge: "AI",
  },
];

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const saveSettings = useSaveSettings();
  const claimMasterModel = useClaimMasterModel();
  const masterAvailableModels = useAvailableModels("master");

  const [section, setSection] = useState<SettingsSection>("hub");

  const [termuxUrl, setTermuxUrl] = useState("");
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [cloudflareToken, setCloudflareToken] = useState("");
  const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL_ID);
  const [masterAiModel, setMasterAiModel] = useState("");
  const [aiTemperature, setAiTemperature] = useState("0.7");
  const [aiMaxTokens, setAiMaxTokens] = useState("4096");
  const [liveSearch, setLiveSearch] = useState(true);
  const [autoFix, setAutoFix] = useState(true);
  const [proactiveAi, setProactiveAi] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const [masterMessages, setMasterMessages] = useState<MasterMessage[]>([]);
  const [masterInput, setMasterInput] = useState("");
  const [masterLoading, setMasterLoading] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll
  useEffect(() => { masterBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [masterMessages, masterLoading]);

  const { connected, checking, recheck } = useTermuxStatus(termuxUrl);

  const handleSave = async () => {
    try {
      await saveSettings.mutateAsync({ termuxUrl, openRouterApiKey, githubToken, githubRepo, defaultModel, masterAiModel });
      toast.success("Settings saved");
      recheck();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
  };

  const handleMasterModelChange = async (modelId: string) => {
    setMasterAiModel(modelId);
    try { await claimMasterModel.mutateAsync(modelId); } catch (e: any) { toast.error(e.message); }
  };

  const handleMasterSend = async () => {
    const text = masterInput.trim();
    if (!text || masterLoading) return;
    if (!openRouterApiKey) { toast.error("Add OpenRouter API key in API settings"); return; }
    if (!masterAiModel) { toast.error("Select a Master AI model"); return; }
    setMasterInput("");
    setMasterMessages((prev) => [...prev, { role: "user", content: text }]);
    setMasterLoading(true);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openRouterApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: masterAiModel,
          messages: [{ role: "system", content: MASTER_AI_SYSTEM_PROMPT }, ...masterMessages, { role: "user", content: text }],
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "No response";
      setMasterMessages((prev) => [...prev, { role: "assistant", content }]);
      const parsed = parseMasterResponse(content);
      if (parsed) setPendingChange({ filePath: parsed.filePath, newContent: parsed.content, userRequest: text });
    } catch (e: any) { toast.error(e.message); } finally { setMasterLoading(false); }
  };

  const handlePushToGitHub = async () => {
    if (!pendingChange || !githubToken || !githubRepo) { toast.error("GitHub token and repo required"); return; }
    setPushingToGitHub(true);
    try {
      const { filePath, newContent, userRequest } = pendingChange;
      const getRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${filePath}`, { headers: { Authorization: `Bearer ${githubToken}` } });
      let sha: string | undefined;
      if (getRes.ok) { sha = (await getRes.json()).sha; }
      const putRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${filePath}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${githubToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: `feat: ${userRequest}`, content: btoa(unescape(encodeURIComponent(newContent))), ...(sha ? { sha } : {}) }),
      });
      if (!putRes.ok) { const e = await putRes.json().catch(() => ({})); throw new Error(e?.message || `GitHub push failed`); }
      toast.success("Pushed to GitHub! Cloudflare will deploy shortly.");
      setPendingChange(null);
    } catch (e: any) { toast.error(e.message); } finally { setPushingToGitHub(false); }
  };

  const downloadCmd = typeof window !== "undefined"
    ? `curl -L ${window.location.origin}/brain.js -o ~/brain.js`
    : "curl -L [your-app-url]/brain.js -o ~/brain.js";

  const resolvedSteps = STEPS.map((s) => s.num === 3 ? { ...s, cmd: downloadCmd } : s);

  const currentSection = SECTIONS.find((s) => s.id === section);

  // ── SHARED STYLES ──
  // Settings page uses a deep slate/indigo background distinct from the app
  const pageBg = "bg-[#0d0f1a]";
  const cardBg = "bg-[#141728] border border-white/10";
  const inputCls = "bg-[#1a1e35] border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50";
  const labelCls = "text-xs text-white/50";
  const saveBtnCls = "bg-violet-600 hover:bg-violet-500 text-white gap-2 w-full";

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", pageBg)} data-ocid="settings.page">

      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {section !== "hub" && (
            <button type="button" onClick={() => setSection("hub")}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4 text-white/70" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              {currentSection ? <currentSection.icon className={cn("w-4 h-4", currentSection.iconColor)} /> : <Settings className="w-4 h-4 text-violet-400" />}
              <h1 className="text-base font-semibold text-white">
                {section === "hub" ? "Settings" : currentSection?.title}
              </h1>
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">
              {section === "hub" ? "Choose a category to configure" : currentSection?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">

        {/* ── HUB ── */}
        {section === "hub" && (
          <div className="p-6 space-y-3">
            {SECTIONS.map((s) => (
              <motion.button
                key={s.id}
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSection(s.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r text-left transition-all hover:brightness-110",
                  s.color, s.border
                )}
              >
                <div className={cn("w-11 h-11 rounded-xl bg-black/30 flex items-center justify-center shrink-0")}>
                  <s.icon className={cn("w-5 h-5", s.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{s.title}</span>
                    {s.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-pink-500/30 text-pink-300 border border-pink-500/30">{s.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 truncate">{s.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
              </motion.button>
            ))}

            {/* Quick status */}
            <div className={cn("mt-4 p-4 rounded-xl", cardBg)}>
              <p className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">Quick Status</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">OpenRouter API</span>
                  <span className={cn("text-[11px] font-medium", openRouterApiKey ? "text-green-400" : "text-white/30")}>
                    {openRouterApiKey ? "Connected" : "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">GitHub</span>
                  <span className={cn("text-[11px] font-medium", githubToken && githubRepo ? "text-green-400" : "text-white/30")}>
                    {githubToken && githubRepo ? githubRepo : "Not configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Termux Brain</span>
                  <span className={cn("text-[11px] font-medium flex items-center gap-1",
                    connected ? "text-green-400" : termuxUrl ? "text-red-400" : "text-white/30")}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", connected ? "bg-green-400" : termuxUrl ? "bg-red-400" : "bg-white/20")} />
                    {connected ? "Connected" : termuxUrl ? "Disconnected" : "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Master AI</span>
                  <span className={cn("text-[11px] font-medium", masterAiModel ? "text-pink-400" : "text-white/30")}>
                    {masterAiModel ? getModelName(masterAiModel).split(" ")[0] : "Not set"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── API KEYS ── */}
        {section === "api" && (
          <div className="p-6 space-y-5 max-w-lg">
            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">AI Provider</p>
              <div className="space-y-1.5">
                <Label className={labelCls}>
                  OpenRouter API Key{" "}
                  <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
                    openrouter.ai <ExternalLink className="inline w-2.5 h-2.5" />
                  </a>
                </Label>
                <Input type="password" value={openRouterApiKey} onChange={(e) => setOpenRouterApiKey(e.target.value)}
                  placeholder="sk-or-..." className={inputCls} style={{ fontSize: "16px" }} data-ocid="settings.openrouter_key.input" />
                <p className="text-[11px] text-white/30">Free models available -- no payment required for basic use</p>
              </div>
            </div>

            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Supabase (optional backup)</p>
              <div className="space-y-1.5">
                <Label className={labelCls}>Supabase URL</Label>
                <Input value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co" className={inputCls} style={{ fontSize: "16px" }} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Supabase Anon Key</Label>
                <Input type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJ..." className={inputCls} style={{ fontSize: "16px" }} />
              </div>
            </div>

            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Cloudflare</p>
              <div className="space-y-1.5">
                <Label className={labelCls}>Cloudflare API Token</Label>
                <Input type="password" value={cloudflareToken} onChange={(e) => setCloudflareToken(e.target.value)}
                  placeholder="Your Cloudflare API token" className={inputCls} style={{ fontSize: "16px" }} />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saveSettings.isPending} className={saveBtnCls}>
              {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save API Keys
            </Button>
          </div>
        )}

        {/* ── AI BEHAVIOUR ── */}
        {section === "ai" && (
          <div className="p-6 space-y-5 max-w-lg">
            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Model</p>
              <div className="space-y-1.5">
                <Label className={labelCls}>Default AI Model</Label>
                <p className="text-[11px] text-white/30">Used for new projects. All listed models are free.</p>
                <Select value={defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger className={cn("bg-[#1a1e35] border-white/10 text-white", "[&>span]:text-white")} data-ocid="settings.default_model.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1e35] border-white/10 text-white">
                    {FREE_MODELS.map((m) => <SelectItem key={m.id} value={m.id} className="text-white focus:bg-white/10">{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Generation</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={labelCls}>Temperature</Label>
                  <span className="text-xs text-blue-400 font-mono">{aiTemperature}</span>
                </div>
                <input type="range" min="0" max="1" step="0.1" value={aiTemperature}
                  onChange={(e) => setAiTemperature(e.target.value)}
                  className="w-full accent-blue-500" />
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>Precise</span><span>Creative</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Max Tokens</Label>
                <Select value={aiMaxTokens} onValueChange={setAiMaxTokens}>
                  <SelectTrigger className="bg-[#1a1e35] border-white/10 text-white [&>span]:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1e35] border-white/10 text-white">
                    <SelectItem value="1024" className="text-white focus:bg-white/10">1024 -- Short responses</SelectItem>
                    <SelectItem value="2048" className="text-white focus:bg-white/10">2048</SelectItem>
                    <SelectItem value="4096" className="text-white focus:bg-white/10">4096 -- Default</SelectItem>
                    <SelectItem value="8192" className="text-white focus:bg-white/10">8192 -- Long</SelectItem>
                    <SelectItem value="16384" className="text-white focus:bg-white/10">16384 -- Maximum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={cn("p-4 rounded-xl space-y-3", cardBg)}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Features</p>
              {([
                { key: "liveSearch", val: liveSearch, set: setLiveSearch, label: "Live Internet Search", desc: "DuckDuckGo search before every AI response" },
                { key: "autoFix", val: autoFix, set: setAutoFix, label: "Auto Error Fix", desc: "AI retries up to 3 times to fix preview errors" },
                { key: "proactive", val: proactiveAi, set: setProactiveAi, label: "Proactive AI", desc: "AI suggests improvements without being asked" },
              ] as const).map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <p className="text-xs font-medium text-white">{item.label}</p>
                    <p className="text-[11px] text-white/40">{item.desc}</p>
                  </div>
                  <Switch checked={item.val} onCheckedChange={item.set}
                    className="data-[state=checked]:bg-blue-500" />
                </div>
              ))}
            </div>

            <Button onClick={handleSave} disabled={saveSettings.isPending} className={saveBtnCls}>
              {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save AI Settings
            </Button>
          </div>
        )}

        {/* ── TERMUX ── */}
        {section === "termux" && (
          <div className="p-6 space-y-5 max-w-lg">
            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Connection</p>
              <div className="space-y-1.5">
                <Label className={labelCls}>Termux Server URL</Label>
                <div className="flex gap-2">
                  <Input value={termuxUrl} onChange={(e) => setTermuxUrl(e.target.value)}
                    placeholder="https://xxxx.ngrok-free.app"
                    className={cn(inputCls, "flex-1")} style={{ fontSize: "16px" }} data-ocid="settings.termux_url.input" />
                  <Button type="button" variant="outline" size="sm" onClick={recheck}
                    disabled={!termuxUrl || checking}
                    className="shrink-0 bg-white/10 border-white/10 text-white hover:bg-white/20">
                    {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Test"}
                  </Button>
                </div>
                {termuxUrl && (
                  <p className={cn("text-xs flex items-center gap-1.5", connected ? "text-green-400" : "text-red-400")}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", connected ? "bg-green-400 animate-pulse" : "bg-red-400")} />
                    {checking ? "Checking..." : connected ? "Connected to brain" : "Cannot reach brain server"}
                  </p>
                )}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saveSettings.isPending} className={cn(saveBtnCls, "bg-green-600 hover:bg-green-500")}>
              {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Termux Settings
            </Button>

            {/* Setup guide */}
            <div className={cn("rounded-xl overflow-hidden", cardBg)}>
              <button type="button" onClick={() => setGuideOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-white">Step-by-Step Setup Guide</span>
                </div>
                {guideOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </button>
              <AnimatePresence initial={false}>
                {guideOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="border-t border-white/10 px-4 py-4 space-y-4">
                      {resolvedSteps.map((step) => (
                        <div key={step.num} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-green-400">{step.num}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white">{step.title}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <code className="flex-1 font-mono text-[11px] bg-black/40 border border-white/10 rounded px-2 py-1 text-green-300 truncate">{step.cmd}</code>
                              <CopyButton text={step.cmd} />
                            </div>
                            <p className="text-[11px] text-white/30 mt-1">{step.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── GITHUB ── */}
        {section === "github" && (
          <div className="p-6 space-y-5 max-w-lg">
            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Repository</p>
              <div className="space-y-1.5">
                <Label className={labelCls}>
                  GitHub Token{" "}
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                    get token <ExternalLink className="inline w-2.5 h-2.5" />
                  </a>
                </Label>
                <Input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..." className={inputCls} style={{ fontSize: "16px" }} data-ocid="settings.github_token.input" />
                <p className="text-[11px] text-white/30">Requires <code className="bg-white/10 px-1 rounded">repo</code> permission scope</p>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls + " flex items-center gap-1"}>
                  <GitBranch className="w-3 h-3" /> Repository Name
                </Label>
                <Input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="username/repo-name" className={inputCls} style={{ fontSize: "16px" }} data-ocid="settings.github_repo.input" />
              </div>
              {githubRepo && (
                <a href={`https://github.com/${githubRepo}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <Github className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-white flex-1 truncate">{githubRepo}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white/30" />
                </a>
              )}
            </div>

            <div className={cn("p-4 rounded-xl space-y-3", cardBg)}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Deploy Status</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Cloudflare Pages</span>
                <a href="https://brainforge-7xn.pages.dev" target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-orange-400 hover:underline flex items-center gap-1">
                  brainforge-7xn.pages.dev <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Worker API</span>
                <span className="text-[11px] text-green-400">Online</span>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saveSettings.isPending} className={cn(saveBtnCls, "bg-orange-600 hover:bg-orange-500")}>
              {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save GitHub Settings
            </Button>
          </div>
        )}

        {/* ── MASTER AI ── */}
        {section === "master" && (
          <div className="flex flex-col" style={{ height: "calc(100vh - 130px)" }}>
            <div className="px-6 pt-5 pb-3 shrink-0">
              <div className={cn("p-4 rounded-xl", cardBg)}>
                <Label className={labelCls + " flex items-center gap-1 mb-2"}>
                  <Bot className="w-3 h-3" /> Master AI Model
                  <span className="text-[10px] text-white/20 ml-1">(locked to Master AI only)</span>
                </Label>
                <Select value={masterAiModel || ""} onValueChange={handleMasterModelChange}>
                  <SelectTrigger className="bg-[#1a1e35] border-white/10 text-white [&>span]:text-white" data-ocid="settings.master_model.select">
                    <SelectValue placeholder="Select Master AI model…" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1e35] border-white/10 text-white">
                    {masterAvailableModels.map((m) => <SelectItem key={m.id} value={m.id} className="text-white focus:bg-white/10">{m.name}</SelectItem>)}
                    {masterAiModel && !masterAvailableModels.find((m) => m.id === masterAiModel) && (
                      <SelectItem value={masterAiModel} className="text-white focus:bg-white/10">{getModelName(masterAiModel)}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={cn("flex-1 flex flex-col mx-6 mb-6 rounded-xl overflow-hidden", cardBg)}>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {masterMessages.length === 0 && (
                    <div className="text-center py-8">
                      <Bot className="w-8 h-8 mx-auto mb-2 text-pink-400/40" />
                      <p className="text-xs text-white/30">Tell Master AI what to add or change in BrainForge</p>
                    </div>
                  )}
                  {masterMessages.map((msg, i) => (
                    <div key={`msg-${i}`} className={cn("rounded-lg p-3 text-xs",
                      msg.role === "user" ? "bg-violet-600/20 border border-violet-500/20 ml-6" : "bg-white/5 border border-white/10")}>
                      <span className="font-mono text-[10px] uppercase block mb-1 text-white/40">{msg.role === "user" ? "you" : "master ai"}</span>
                      <p className="whitespace-pre-wrap leading-relaxed text-white/80">{msg.content}</p>
                    </div>
                  ))}
                  {masterLoading && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/40 uppercase">master ai</span>
                        <div className="flex gap-1">
                          {[0,1,2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={masterBottomRef} />
                </div>
              </ScrollArea>

              <AnimatePresence>
                {pendingChange && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/10">
                    <div className="px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Github className="w-3.5 h-3.5 text-pink-400" />
                          <span className="text-white/70">Ready to push:</span>
                          <code className="text-pink-300 bg-pink-500/10 px-1 rounded text-[11px]">{pendingChange.filePath}</code>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white" onClick={() => setPendingChange(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <pre className="bg-black/40 rounded border border-white/10 p-2 text-[11px] max-h-20 overflow-auto font-mono text-green-300">
                        {pendingChange.newContent.slice(0, 300)}{pendingChange.newContent.length > 300 ? "\n…" : ""}
                      </pre>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handlePushToGitHub} disabled={pushingToGitHub || !githubToken || !githubRepo}
                          className="bg-pink-600 hover:bg-pink-500 text-white gap-1.5 flex-1">
                          {pushingToGitHub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
                          Push to GitHub
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPendingChange(null)}
                          className="border-white/10 text-white hover:bg-white/10">Cancel</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="border-t border-white/10 px-3 py-2 flex gap-2 shrink-0">
                <Input value={masterInput} onChange={(e) => setMasterInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleMasterSend()}
                  placeholder="Tell Master AI what to change…"
                  disabled={masterLoading}
                  className="bg-[#1a1e35] border-white/10 text-white placeholder:text-white/30 flex-1 h-9 text-xs"
                  style={{ fontSize: "16px" }} data-ocid="settings.master_ai.input" />
                <Button size="icon" onClick={handleMasterSend} disabled={!masterInput.trim() || masterLoading}
                  className="h-9 w-9 bg-pink-600 hover:bg-pink-500 text-white shrink-0">
                  {masterLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
