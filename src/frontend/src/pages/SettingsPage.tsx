import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertCircle, ArrowLeft, Bot, CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
  Database, Download, ExternalLink, Eye, FileText, GitBranch, Github, Key,
  Loader2, Save, Search, Send, Settings, Sliders, Terminal, Trash2, X, Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_MODEL_ID, FREE_MODELS, getModelName } from "../constants/models";
import { useSaveSettings, useSettings } from "../hooks/useBackend";
import { useAvailableModels, useClaimMasterModel } from "../hooks/useModelClaims";
import { useTermuxStatus } from "../hooks/useTermux";

const WORKER_URL = import.meta.env.VITE_CF_WORKER_URL || "https://brainforge-api.richard-brown-miami.workers.dev";
type SettingsSection = "hub" | "api" | "ai" | "termux" | "github" | "master" | "aifiles";

const MASTER_AI_SYSTEM_PROMPT = `You are Master AI for BrainForge.
Your ONLY role is to maintain and fix the BrainForge application itself.
You are connected to GitHub, Cloudflare, and optionally Termux.
You do NOT help with user app projects -- that is the project AIs' job.
When asked to make changes, show the diff first and wait for approval.
Respond with: FILE: path/to/file\n\`\`\`\n[content]\n\`\`\``;

interface AiFile { scope: string; content: string; updated_at?: string; message_count?: number; }
interface MasterMessage { role: "user" | "assistant"; content: string; }
interface PendingChange { filePath: string; newContent: string; userRequest: string; }

const STEPS = [
  { num: 1, title: "Install Node.js in Termux", cmd: "pkg install nodejs -y", note: "Open Termux on your Android phone" },
  { num: 2, title: "Install dependencies", cmd: "npm install -g express axios cors", note: "Wait ~2 minutes" },
  { num: 3, title: "Download brain server", cmd: "", note: "Downloads the BrainForge server" },
  { num: 4, title: "Start the brain", cmd: "node ~/brain.js YOUR_OPENROUTER_KEY", note: "Replace with your OpenRouter key" },
  { num: 5, title: "Install ngrok", cmd: "npm install -g ngrok && ngrok http 3000", note: "Gives your phone a public URL" },
  { num: 6, title: "Paste your ngrok URL", cmd: "https://xxxx.ngrok-free.app", note: "Copy the Forwarding URL from ngrok" },
];

const SECTIONS = [
  { id: "api" as SettingsSection, icon: Key, title: "API Keys", description: "OpenRouter, Supabase, Cloudflare", color: "from-violet-600/20 to-violet-800/10", border: "border-violet-500/30", iconColor: "text-violet-400" },
  { id: "ai" as SettingsSection, icon: Sliders, title: "AI Behaviour", description: "Model, temperature, features", color: "from-blue-600/20 to-blue-800/10", border: "border-blue-500/30", iconColor: "text-blue-400" },
  { id: "termux" as SettingsSection, icon: Terminal, title: "Termux Brain", description: "Run AI backend on Android", color: "from-green-600/20 to-green-800/10", border: "border-green-500/30", iconColor: "text-green-400" },
  { id: "github" as SettingsSection, icon: Github, title: "GitHub & Deploy", description: "Token, repo, Cloudflare deploy", color: "from-orange-600/20 to-orange-800/10", border: "border-orange-500/30", iconColor: "text-orange-400" },
  { id: "aifiles" as SettingsSection, icon: FileText, title: "AI Files", description: "Memory, rules, all AI context files", color: "from-cyan-600/20 to-cyan-800/10", border: "border-cyan-500/30", iconColor: "text-cyan-400" },
  { id: "master" as SettingsSection, icon: Bot, title: "Master AI", description: "App controller -- BrainForge only", color: "from-pink-600/20 to-pink-800/10", border: "border-pink-500/30", iconColor: "text-pink-400" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 border border-white/20 transition-colors">
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function parseMasterResponse(response: string) {
  const fileMatch = response.match(/FILE:\s*([^\n]+)/);
  const codeMatch = response.match(/```(?:[\w.]*)?\n([\s\S]*?)```/);
  if (!fileMatch || !codeMatch) return null;
  return { filePath: fileMatch[1].trim(), content: codeMatch[1] };
}

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
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [aiTemperature, setAiTemperature] = useState("0.7");
  const [aiMaxTokens, setAiMaxTokens] = useState("4096");
  const [liveSearch, setLiveSearch] = useState(true);
  const [autoFix, setAutoFix] = useState(true);
  const [proactiveAi, setProactiveAi] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // AI Files state
  const [memoryFiles, setMemoryFiles] = useState<AiFile[]>([]);
  const [rulesFiles, setRulesFiles] = useState<AiFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [editingFile, setEditingFile] = useState<{ type: "memory" | "rules"; scope: string; content: string } | null>(null);
  const [savingFile, setSavingFile] = useState(false);
  const [activeFileTab, setActiveFileTab] = useState<"memory" | "rules">("memory");

  // Master AI state
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

  const loadAiFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const [memRes, rulesRes] = await Promise.all([
        fetch(`${WORKER_URL}/api/memory`),
        fetch(`${WORKER_URL}/api/rules`),
      ]);
      if (memRes.ok) setMemoryFiles(await memRes.json());
      if (rulesRes.ok) setRulesFiles(await rulesRes.json());
    } catch { /* silent */ } finally { setFilesLoading(false); }
  }, []);

  useEffect(() => { if (section === "aifiles") loadAiFiles(); }, [section, loadAiFiles]);

  const handleSave = async () => {
    try {
      await saveSettings.mutateAsync({ termuxUrl, openRouterApiKey, githubToken, githubRepo, defaultModel, masterAiModel });
      toast.success("Settings saved"); recheck();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
  };

  const handleMasterModelChange = async (modelId: string) => {
    setMasterAiModel(modelId);
    try { await claimMasterModel.mutateAsync(modelId); } catch (e: any) { toast.error(e.message); }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    setSavingFile(true);
    try {
      const endpoint = editingFile.type === "memory" ? "/api/memory" : "/api/rules";
      await fetch(`${WORKER_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: editingFile.scope, content: editingFile.content }),
      });
      toast.success("File saved");
      setEditingFile(null);
      loadAiFiles();
    } catch (e: any) { toast.error("Failed to save file"); } finally { setSavingFile(false); }
  };

  const handleClearMemory = async (scope: string) => {
    if (!confirm(`Clear memory for ${scope}? This cannot be undone.`)) return;
    await fetch(`${WORKER_URL}/api/memory/${encodeURIComponent(scope)}`, { method: "DELETE" });
    toast.success("Memory cleared");
    loadAiFiles();
  };

  const handleExportZip = async () => {
    // Build a simple text export since we can't use JSZip without install
    const allFiles = [
      ...memoryFiles.map((f) => `=== MEMORY: ${f.scope} ===\n${f.content}\n`),
      ...rulesFiles.map((f) => `=== RULES: ${f.scope} ===\n${f.content}\n`),
    ].join("\n\n");
    const blob = new Blob([allFiles], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "brainforge-ai-files.txt"; a.click();
    URL.revokeObjectURL(url);
    toast.success("AI files exported");
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
        headers: { Authorization: `Bearer ${openRouterApiKey}`, "Content-Type": "application/json",
          "HTTP-Referer": "https://brainforge-7xn.pages.dev", "X-Title": "BrainForge Master AI" },
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
      if (getRes.ok) sha = (await getRes.json()).sha;
      const putRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${filePath}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${githubToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: `feat: ${userRequest}`, content: btoa(unescape(encodeURIComponent(newContent))), ...(sha ? { sha } : {}) }),
      });
      if (!putRes.ok) { const e = await putRes.json().catch(() => ({})); throw new Error(e?.message || "GitHub push failed"); }
      toast.success("Pushed to GitHub! Cloudflare will deploy shortly.");
      setPendingChange(null);
    } catch (e: any) { toast.error(e.message); } finally { setPushingToGitHub(false); }
  };

  const pageBg = "bg-[#0d0f1a]";
  const cardBg = "bg-[#141728] border border-white/10";
  const inputCls = "bg-[#1a1e35] border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50";
  const labelCls = "text-xs text-white/50";
  const saveBtnCls = "bg-violet-600 hover:bg-violet-500 text-white gap-2 w-full";
  const downloadCmd = typeof window !== "undefined" ? `curl -L ${window.location.origin}/brain.js -o ~/brain.js` : "curl -L [your-app-url]/brain.js -o ~/brain.js";
  const resolvedSteps = STEPS.map((s) => s.num === 3 ? { ...s, cmd: downloadCmd } : s);
  const currentSection = SECTIONS.find((s) => s.id === section);

  const filteredMemory = memoryFiles.filter((f) => f.scope.toLowerCase().includes(fileSearch.toLowerCase()));
  const filteredRules = rulesFiles.filter((f) => f.scope.toLowerCase().includes(fileSearch.toLowerCase()));

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
              <h1 className="text-base font-semibold text-white">{section === "hub" ? "Settings" : currentSection?.title}</h1>
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">{section === "hub" ? "Choose a category to configure" : currentSection?.description}</p>
          </div>
          {/* Master AI toggle in hub */}
          {section === "hub" && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-white/40">Master AI</span>
              <Switch checked={masterEnabled} onCheckedChange={setMasterEnabled} className="data-[state=checked]:bg-pink-500" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">

        {/* ── HUB ── */}
        {section === "hub" && (
          <div className="p-6 space-y-3">
            {SECTIONS.filter((s) => s.id !== "master" || masterEnabled).map((s) => (
              <motion.button key={s.id} type="button" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={() => setSection(s.id)}
                className={cn("w-full flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r text-left transition-all hover:brightness-110", s.color, s.border)}>
                <div className="w-11 h-11 rounded-xl bg-black/30 flex items-center justify-center shrink-0">
                  <s.icon className={cn("w-5 h-5", s.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white block">{s.title}</span>
                  <p className="text-xs text-white/40 mt-0.5 truncate">{s.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
              </motion.button>
            ))}

            {/* Quick status */}
            <div className={cn("mt-2 p-4 rounded-xl", cardBg)}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Quick Status</p>
              <div className="space-y-2">
                {[
                  { label: "OpenRouter API", value: openRouterApiKey ? "Connected" : "Not set", ok: !!openRouterApiKey },
                  { label: "GitHub", value: githubToken && githubRepo ? githubRepo : "Not configured", ok: !!(githubToken && githubRepo) },
                  { label: "Termux Brain", value: connected ? "Connected" : termuxUrl ? "Offline" : "Not set", ok: connected },
                  { label: "Master AI", value: masterEnabled ? (masterAiModel ? getModelName(masterAiModel).split(" ")[0] : "No model") : "Disabled", ok: masterEnabled && !!masterAiModel },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{item.label}</span>
                    <span className={cn("text-[11px] font-medium", item.ok ? "text-green-400" : "text-white/25")}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── API KEYS ── */}
        {section === "api" && (
          <div className="p-6 space-y-4 max-w-lg">
            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">AI Provider</p>
              <div className="space-y-1.5">
                <Label className={labelCls}>OpenRouter API Key <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">openrouter.ai <ExternalLink className="inline w-2.5 h-2.5" /></a></Label>
                <Input type="password" value={openRouterApiKey} onChange={(e) => setOpenRouterApiKey(e.target.value)} placeholder="sk-or-..." className={inputCls} style={{ fontSize: "16px" }} data-ocid="settings.openrouter_key.input" />
                <p className="text-[11px] text-white/25">Free models available -- no payment required for basic use</p>
              </div>
            </div>
            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Supabase (optional backup)</p>
              <div className="space-y-1.5"><Label className={labelCls}>Supabase URL</Label>
                <Input value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxxx.supabase.co" className={inputCls} style={{ fontSize: "16px" }} /></div>
              <div className="space-y-1.5"><Label className={labelCls}>Supabase Anon Key</Label>
                <Input type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} placeholder="eyJ..." className={inputCls} style={{ fontSize: "16px" }} /></div>
            </div>
            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Cloudflare</p>
              <div className="space-y-1.5"><Label className={labelCls}>Cloudflare API Token</Label>
                <Input type="password" value={cloudflareToken} onChange={(e) => setCloudflareToken(e.target.value)} placeholder="Cloudflare API token" className={inputCls} style={{ fontSize: "16px" }} /></div>
            </div>
            <Button onClick={handleSave} disabled={saveSettings.isPending} className={saveBtnCls}>
              {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save API Keys
            </Button>
          </div>
        )}

        {/* ── AI SETTINGS ── */}
        {section === "ai" && (
          <div className="p-6 space-y-4 max-w-lg">
            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Default Model</p>
              <Select value={defaultModel} onValueChange={setDefaultModel}>
                <SelectTrigger className="bg-[#1a1e35] border-white/10 text-white [&>span]:text-white">
                  <SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a1e35] border-white/10 text-white">
                  {FREE_MODELS.map((m) => <SelectItem key={m.id} value={m.id} className="text-white focus:bg-white/10">{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-white/25">Used for new projects. All listed models are free.</p>
            </div>
            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Generation</p>
              <div className="space-y-2">
                <div className="flex justify-between"><Label className={labelCls}>Temperature</Label><span className="text-xs text-blue-400 font-mono">{aiTemperature}</span></div>
                <input type="range" min="0" max="1" step="0.1" value={aiTemperature} onChange={(e) => setAiTemperature(e.target.value)} className="w-full accent-blue-500" />
                <div className="flex justify-between text-[10px] text-white/25"><span>Precise</span><span>Creative</span></div>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Max Tokens</Label>
                <Select value={aiMaxTokens} onValueChange={setAiMaxTokens}>
                  <SelectTrigger className="bg-[#1a1e35] border-white/10 text-white [&>span]:text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1e35] border-white/10 text-white">
                    {["1024","2048","4096","8192","16384"].map((v) => <SelectItem key={v} value={v} className="text-white focus:bg-white/10">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={cn("p-4 rounded-xl space-y-3", cardBg)}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Features</p>
              {[{ val: liveSearch, set: setLiveSearch, label: "Live Internet Search", desc: "DuckDuckGo search before every AI response" },
                { val: autoFix, set: setAutoFix, label: "Auto Error Fix", desc: "AI retries up to 3 times to fix preview errors" },
                { val: proactiveAi, set: setProactiveAi, label: "Proactive AI", desc: "AI suggests improvements without being asked" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div><p className="text-xs font-medium text-white">{item.label}</p><p className="text-[11px] text-white/30">{item.desc}</p></div>
                  <Switch checked={item.val} onCheckedChange={item.set} className="data-[state=checked]:bg-blue-500" />
                </div>
              ))}
            </div>
            <Button onClick={handleSave} disabled={saveSettings.isPending} className={saveBtnCls}>
              {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save AI Settings
            </Button>
          </div>
        )}

        {/* ── TERMUX ── */}
        {section === "termux" && (
          <div className="p-6 space-y-4 max-w-lg">
            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Connection</p>
              <div className="space-y-1.5">
                <Label className={labelCls}>Termux Server URL</Label>
                <div className="flex gap-2">
                  <Input value={termuxUrl} onChange={(e) => setTermuxUrl(e.target.value)} placeholder="https://xxxx.ngrok-free.app" className={cn(inputCls, "flex-1")} style={{ fontSize: "16px" }} />
                  <Button type="button" variant="outline" size="sm" onClick={recheck} disabled={!termuxUrl || checking} className="shrink-0 bg-white/10 border-white/10 text-white hover:bg-white/20">
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
              {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Termux Settings
            </Button>
            <div className={cn("rounded-xl overflow-hidden", cardBg)}>
              <button type="button" onClick={() => setGuideOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2"><Terminal className="w-4 h-4 text-green-400" /><span className="text-sm font-medium text-white">Setup Guide</span></div>
                {guideOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </button>
              <AnimatePresence initial={false}>
                {guideOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="border-t border-white/10 px-4 py-4 space-y-3">
                      {resolvedSteps.map((step) => (
                        <div key={step.num} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-green-400">{step.num}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white">{step.title}</p>
                            <div className="mt-1 flex items-center gap-2">
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
          <div className="p-6 space-y-4 max-w-lg">
            <div className={cn("p-4 rounded-xl space-y-4", cardBg)}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Repository</p>
              <div className="space-y-1.5">
                <Label className={labelCls}>GitHub Token <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">get token <ExternalLink className="inline w-2.5 h-2.5" /></a></Label>
                <Input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_..." className={inputCls} style={{ fontSize: "16px" }} />
              </div>
              <div className="space-y-1.5">
                <Label className={cn(labelCls, "flex items-center gap-1")}><GitBranch className="w-3 h-3" /> Repository</Label>
                <Input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} placeholder="username/repo-name" className={inputCls} style={{ fontSize: "16px" }} />
              </div>
              {githubRepo && (
                <a href={`https://github.com/${githubRepo}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <Github className="w-4 h-4 text-orange-400" /><span className="text-xs text-white flex-1 truncate">{githubRepo}</span><ExternalLink className="w-3.5 h-3.5 text-white/30" />
                </a>
              )}
            </div>
            <div className={cn("p-4 rounded-xl space-y-3", cardBg)}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Deploy Status</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Cloudflare Pages</span>
                <a href="https://brainforge-7xn.pages.dev" target="_blank" rel="noopener noreferrer" className="text-[11px] text-orange-400 hover:underline flex items-center gap-1">brainforge-7xn.pages.dev <ExternalLink className="w-2.5 h-2.5" /></a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Worker API</span>
                <span className="text-[11px] text-green-400">Online</span>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saveSettings.isPending} className={cn(saveBtnCls, "bg-orange-600 hover:bg-orange-500")}>
              {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save GitHub Settings
            </Button>
          </div>
        )}

        {/* ── AI FILES ── */}
        {section === "aifiles" && (
          <div className="p-6 space-y-4">
            {/* Edit modal */}
            {editingFile && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <div className={cn("w-full max-w-2xl rounded-xl overflow-hidden", cardBg)}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div>
                      <p className="text-sm font-semibold text-white">{editingFile.type === "memory" ? "Memory" : "Rules"}: {editingFile.scope}</p>
                      <p className="text-[11px] text-white/30 mt-0.5">{editingFile.type === "rules" ? "Edit with care -- this controls AI behaviour" : "AI memory file"}</p>
                    </div>
                    <button type="button" onClick={() => setEditingFile(null)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <Textarea value={editingFile.content} onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
                    className="w-full h-64 bg-[#0d0f1a] border-0 text-white/80 font-mono text-xs p-4 resize-none focus:ring-0" />
                  <div className="flex gap-2 px-4 py-3 border-t border-white/10">
                    <Button onClick={handleSaveFile} disabled={savingFile} className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2 flex-1">
                      {savingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save File
                    </Button>
                    <Button variant="outline" onClick={() => setEditingFile(null)} className="border-white/10 text-white hover:bg-white/10">Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input value={fileSearch} onChange={(e) => setFileSearch(e.target.value)} placeholder="Search files by project name..."
                  className={cn(inputCls, "pl-9")} style={{ fontSize: "16px" }} />
              </div>
              <Button variant="outline" onClick={handleExportZip} className="border-white/10 text-white hover:bg-white/10 gap-2 shrink-0">
                <Download className="w-4 h-4" /> Export
              </Button>
              <Button variant="outline" onClick={loadAiFiles} disabled={filesLoading} className="border-white/10 text-white hover:bg-white/10 shrink-0">
                {filesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2">
              {(["memory", "rules"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveFileTab(tab)}
                  className={cn("px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize",
                    activeFileTab === tab ? "bg-cyan-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10")}>
                  {tab} ({tab === "memory" ? filteredMemory.length : filteredRules.length})
                </button>
              ))}
            </div>

            {filesLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
            ) : (
              <div className="space-y-2">
                {(activeFileTab === "memory" ? filteredMemory : filteredRules).length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="w-8 h-8 mx-auto mb-2 text-white/20" />
                    <p className="text-sm text-white/30">No {activeFileTab} files yet</p>
                    <p className="text-xs text-white/20 mt-1">Files are created automatically as you use AI in projects</p>
                  </div>
                ) : (
                  (activeFileTab === "memory" ? filteredMemory : filteredRules).map((file) => (
                    <div key={file.scope} className={cn("p-4 rounded-xl", cardBg)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className={cn("w-3.5 h-3.5 shrink-0", activeFileTab === "memory" ? "text-cyan-400" : "text-yellow-400")} />
                            <span className="text-xs font-semibold text-white truncate">{file.scope}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {file.updated_at && <span className="text-[10px] text-white/25">{new Date(file.updated_at).toLocaleString()}</span>}
                            {activeFileTab === "memory" && file.message_count != null && (
                              <span className="text-[10px] text-cyan-400/60">{file.message_count} messages</span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/30 mt-2 line-clamp-2 font-mono">{file.content.slice(0, 120)}...</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={() => setEditingFile({ type: activeFileTab, scope: file.scope, content: file.content })}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors" title="Edit">
                            <Eye className="w-3.5 h-3.5 text-white/50" />
                          </button>
                          {activeFileTab === "memory" && (
                            <button type="button" onClick={() => handleClearMemory(file.scope)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors" title="Clear memory">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MASTER AI ── */}
        {section === "master" && (
          <div className="flex flex-col" style={{ height: "calc(100vh - 130px)" }}>
            <div className="px-6 pt-5 pb-3 shrink-0 space-y-3">
              <div className={cn("p-4 rounded-xl", cardBg)}>
                <div className="flex items-center justify-between mb-3">
                  <Label className={labelCls + " flex items-center gap-1"}><Bot className="w-3 h-3" /> Master AI Model</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-white/30">Enabled</span>
                    <Switch checked={masterEnabled} onCheckedChange={setMasterEnabled} className="data-[state=checked]:bg-pink-500" />
                  </div>
                </div>
                <Select value={masterAiModel || ""} onValueChange={handleMasterModelChange}>
                  <SelectTrigger className="bg-[#1a1e35] border-white/10 text-white [&>span]:text-white">
                    <SelectValue placeholder="Select Master AI model…" /></SelectTrigger>
                  <SelectContent className="bg-[#1a1e35] border-white/10 text-white">
                    {/* Free models specifically for Master AI */}
                    {[
                      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (free)" },
                      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (free)" },
                      { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (free)" },
                      { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (free)" },
                      ...masterAvailableModels.filter((m) => !m.id.includes(":free")),
                    ].map((m) => <SelectItem key={m.id} value={m.id} className="text-white focus:bg-white/10">{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-white/25 mt-2">Role: BrainForge maintenance only. Connected to GitHub + Cloudflare + Termux.</p>
              </div>

              {/* Connection tools status */}
              <div className={cn("p-3 rounded-xl", cardBg)}>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Connections</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "GitHub", ok: !!(githubToken && githubRepo), detail: githubRepo || "Not set" },
                    { label: "Cloudflare", ok: !!cloudflareToken, detail: cloudflareToken ? "Token set" : "Not set" },
                    { label: "Termux", ok: connected, detail: connected ? "Online" : "Offline" },
                  ].map((conn) => (
                    <div key={conn.label} className={cn("p-2.5 rounded-lg border text-center", conn.ok ? "bg-green-500/10 border-green-500/20" : "bg-white/5 border-white/10")}>
                      <p className="text-[10px] font-semibold text-white/60">{conn.label}</p>
                      <p className={cn("text-[10px] mt-0.5 truncate", conn.ok ? "text-green-400" : "text-white/25")}>{conn.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={cn("flex-1 flex flex-col mx-6 mb-6 rounded-xl overflow-hidden", cardBg)}>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {masterMessages.length === 0 && (
                    <div className="text-center py-8">
                      <Bot className="w-8 h-8 mx-auto mb-2 text-pink-400/40" />
                      <p className="text-xs text-white/30">Tell Master AI what to fix or change in BrainForge</p>
                      <p className="text-[11px] text-white/20 mt-1">It can push code to GitHub and redeploy via Cloudflare</p>
                    </div>
                  )}
                  {masterMessages.map((msg, i) => (
                    <div key={`msg-${i}`} className={cn("rounded-lg p-3 text-xs",
                      msg.role === "user" ? "bg-violet-600/20 border border-violet-500/20 ml-6" : "bg-white/5 border border-white/10")}>
                      <span className="font-mono text-[10px] uppercase block mb-1 text-white/30">{msg.role === "user" ? "you" : "master ai"}</span>
                      <p className="whitespace-pre-wrap leading-relaxed text-white/80">{msg.content}</p>
                    </div>
                  ))}
                  {masterLoading && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/30 uppercase">master ai</span>
                        <div className="flex gap-1">{[0,1,2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                      </div>
                    </div>
                  )}
                  <div ref={masterBottomRef} />
                </div>
              </ScrollArea>
              <AnimatePresence>
                {pendingChange && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-white/10">
                    <div className="px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs"><Github className="w-3.5 h-3.5 text-pink-400" /><span className="text-white/60">Ready:</span><code className="text-pink-300 bg-pink-500/10 px-1 rounded text-[11px]">{pendingChange.filePath}</code></div>
                        <button type="button" onClick={() => setPendingChange(null)} className="text-white/30 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      <pre className="bg-black/40 rounded border border-white/10 p-2 text-[11px] max-h-20 overflow-auto font-mono text-green-300">{pendingChange.newContent.slice(0, 300)}{pendingChange.newContent.length > 300 ? "\n…" : ""}</pre>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handlePushToGitHub} disabled={pushingToGitHub || !githubToken || !githubRepo} className="bg-pink-600 hover:bg-pink-500 text-white gap-1.5 flex-1">
                          {pushingToGitHub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />} Push to GitHub
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPendingChange(null)} className="border-white/10 text-white hover:bg-white/10">Cancel</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="border-t border-white/10 px-3 py-2 flex gap-2 shrink-0">
                <Input value={masterInput} onChange={(e) => setMasterInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleMasterSend()}
                  placeholder="Tell Master AI what to fix in BrainForge…" disabled={masterLoading || !masterEnabled}
                  className="bg-[#1a1e35] border-white/10 text-white placeholder:text-white/30 flex-1 h-9 text-xs"
                  style={{ fontSize: "16px" }} data-ocid="settings.master_ai.input" />
                <Button size="icon" onClick={handleMasterSend} disabled={!masterInput.trim() || masterLoading || !masterEnabled}
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
