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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
    title: "Paste your ngrok URL in the Termux tab",
    cmd: "https://xxxx-xx-xx-xxx-xx.ngrok-free.app",
    note: 'Copy the Forwarding URL from ngrok and paste it in the Termux Server URL field',
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

function SectionHeader({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
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
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [cloudflareToken, setCloudflareToken] = useState("");
  const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL_ID);
  const [masterAiModel, setMasterAiModel] = useState("");
  const [aiTemperature, setAiTemperature] = useState("0.7");
  const [aiMaxTokens, setAiMaxTokens] = useState("4096");
  const [liveSearch, setLiveSearch] = useState(true);
  const [autoFix, setAutoFix] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);

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
    if (!openRouterApiKey) { toast.error("Add your OpenRouter API key first"); return; }
    if (!masterAiModel) { toast.error("Select a model for Master AI first"); return; }

    setMasterInput("");
    const userMsg: MasterMessage = { role: "user", content: text };
    setMasterMessages((prev) => [...prev, userMsg]);
    setMasterLoading(true);

    try {
      const history = masterMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openRouterApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: masterAiModel,
          messages: [{ role: "system", content: MASTER_AI_SYSTEM_PROMPT }, ...history, { role: "user", content: text }],
          stream: false,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `HTTP ${res.status}`); }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "No response";
      setMasterMessages((prev) => [...prev, { role: "assistant", content }]);
      const parsed = parseMasterResponse(content);
      if (parsed) setPendingChange({ filePath: parsed.filePath, newContent: parsed.content, userRequest: text });
    } catch (e: any) {
      toast.error(e.message || "Master AI request failed");
    } finally {
      setMasterLoading(false);
    }
  };

  const handlePushToGitHub = async () => {
    if (!pendingChange || !githubToken || !githubRepo) { toast.error("GitHub token and repo required"); return; }
    setPushingToGitHub(true);
    try {
      const { filePath, newContent, userRequest } = pendingChange;
      const getRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${filePath}`, { headers: { Authorization: `Bearer ${githubToken}` } });
      let sha: string | undefined;
      if (getRes.ok) { const fileData = await getRes.json(); sha = fileData.sha; }
      const putRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${filePath}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${githubToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: `feat: ${userRequest}`, content: btoa(unescape(encodeURIComponent(newContent))), ...(sha ? { sha } : {}) }),
      });
      if (!putRes.ok) { const err = await putRes.json().catch(() => ({})); throw new Error(err?.message || `GitHub push failed: ${putRes.status}`); }
      toast.success("Pushed to GitHub!");
      setPendingChange(null);
    } catch (e: any) {
      toast.error(e.message || "GitHub push failed");
    } finally {
      setPushingToGitHub(false);
    }
  };

  const downloadCmd = typeof window !== "undefined"
    ? `curl -L ${window.location.origin}/brain.js -o ~/brain.js`
    : "curl -L [your-app-url]/brain.js -o ~/brain.js";

  const resolvedSteps = STEPS.map((s) => s.num === 3 ? { ...s, cmd: downloadCmd } : s);

  return (
    <div className="flex flex-col h-full overflow-hidden" data-ocid="settings.page">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 ml-7">Configure BrainForge connections, AI behaviour and integrations</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="api" className="flex flex-col flex-1 overflow-hidden">
        <div className="px-6 pt-3 shrink-0 border-b border-border">
          <TabsList className="bg-muted/40 h-9 gap-1">
            <TabsTrigger value="api" className="text-xs gap-1.5 data-[state=active]:bg-background">
              <Key className="w-3.5 h-3.5" /> API
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs gap-1.5 data-[state=active]:bg-background">
              <Sliders className="w-3.5 h-3.5" /> AI
            </TabsTrigger>
            <TabsTrigger value="termux" className="text-xs gap-1.5 data-[state=active]:bg-background">
              <Terminal className="w-3.5 h-3.5" /> Termux
            </TabsTrigger>
            <TabsTrigger value="github" className="text-xs gap-1.5 data-[state=active]:bg-background">
              <Github className="w-3.5 h-3.5" /> GitHub
            </TabsTrigger>
            <TabsTrigger value="master" className="text-xs gap-1.5 data-[state=active]:bg-background">
              <Bot className="w-3.5 h-3.5" /> Master AI
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">

          {/* ── API Tab ── */}
          <TabsContent value="api" className="m-0 p-6 space-y-6">
            <SectionHeader icon={Key} title="API Keys" description="Keys are saved to your backend. Never share them publicly." />

            <div className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  OpenRouter API Key{" "}
                  <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    openrouter.ai <ExternalLink className="inline w-2.5 h-2.5" />
                  </a>
                </Label>
                <Input type="password" value={openRouterApiKey} onChange={(e) => setOpenRouterApiKey(e.target.value)}
                  placeholder="sk-or-..." className="bg-card border-border" style={{ fontSize: "16px" }}
                  data-ocid="settings.openrouter_key.input" />
                <p className="text-[11px] text-muted-foreground">Free models available -- no payment required for basic use</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Supabase URL</Label>
                <Input value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co" className="bg-card border-border" style={{ fontSize: "16px" }} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Supabase Anon Key</Label>
                <Input type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJ..." className="bg-card border-border" style={{ fontSize: "16px" }} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cloudflare API Token</Label>
                <Input type="password" value={cloudflareToken} onChange={(e) => setCloudflareToken(e.target.value)}
                  placeholder="Your Cloudflare API token" className="bg-card border-border" style={{ fontSize: "16px" }} />
              </div>

              <Button onClick={handleSave} disabled={saveSettings.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-full" data-ocid="settings.save.submit_button">
                {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save API Keys
              </Button>
            </div>
          </TabsContent>

          {/* ── AI Tab ── */}
          <TabsContent value="ai" className="m-0 p-6 space-y-6">
            <SectionHeader icon={Sliders} title="AI Settings" description="Control how AI generates code and responds to your instructions." />

            <div className="space-y-5 max-w-lg">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Default AI Model</Label>
                <p className="text-[11px] text-muted-foreground/70">Used for new projects. All models listed are free.</p>
                <Select value={defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger className="bg-card border-border" data-ocid="settings.default_model.select">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {FREE_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Temperature <span className="text-primary">{aiTemperature}</span></Label>
                <p className="text-[11px] text-muted-foreground/70">Lower = focused/precise. Higher = creative/varied.</p>
                <input type="range" min="0" max="1" step="0.1" value={aiTemperature}
                  onChange={(e) => setAiTemperature(e.target.value)}
                  className="w-full accent-primary" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0 (Precise)</span><span>1 (Creative)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Max Tokens</Label>
                <p className="text-[11px] text-muted-foreground/70">Maximum output length per AI response.</p>
                <Select value={aiMaxTokens} onValueChange={setAiMaxTokens}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="1024">1024 (short)</SelectItem>
                    <SelectItem value="2048">2048</SelectItem>
                    <SelectItem value="4096">4096 (default)</SelectItem>
                    <SelectItem value="8192">8192 (long)</SelectItem>
                    <SelectItem value="16384">16384 (max)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Features</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                    <div>
                      <p className="text-xs font-medium">Live Internet Search</p>
                      <p className="text-[11px] text-muted-foreground">DuckDuckGo search before every AI response</p>
                    </div>
                    <Switch checked={liveSearch} onCheckedChange={setLiveSearch} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                    <div>
                      <p className="text-xs font-medium">Auto Error Fix</p>
                      <p className="text-[11px] text-muted-foreground">AI retries up to 3 times to fix preview errors</p>
                    </div>
                    <Switch checked={autoFix} onCheckedChange={setAutoFix} />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saveSettings.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-full">
                {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save AI Settings
              </Button>
            </div>
          </TabsContent>

          {/* ── Termux Tab ── */}
          <TabsContent value="termux" className="m-0 p-6 space-y-6">
            <SectionHeader icon={Terminal} title="Termux Brain Connection" description="Run the AI backend server on your Android phone using Termux + ngrok." />

            <div className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Termux Server URL</Label>
                <div className="flex gap-2">
                  <Input value={termuxUrl} onChange={(e) => setTermuxUrl(e.target.value)}
                    placeholder="https://xxxx.ngrok-free.app"
                    className="bg-card border-border flex-1" style={{ fontSize: "16px" }}
                    data-ocid="settings.termux_url.input" />
                  <Button type="button" variant="outline" size="sm" onClick={recheck}
                    disabled={!termuxUrl || checking} className="shrink-0 border-border">
                    {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Test"}
                  </Button>
                </div>
                {termuxUrl && (
                  <p className={cn("text-xs flex items-center gap-1.5", connected ? "text-primary" : "text-destructive")}>
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full", connected ? "bg-primary" : "bg-destructive")} />
                    {checking ? "Checking..." : connected ? "Connected to brain" : "Cannot reach brain server"}
                  </p>
                )}
              </div>

              <Button onClick={handleSave} disabled={saveSettings.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-full">
                {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Termux Settings
              </Button>

              {/* Setup Guide */}
              <div className="border border-border rounded-lg overflow-hidden" data-ocid="settings.guide.section">
                <button type="button" onClick={() => setGuideOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Step-by-Step Setup Guide</span>
                  </div>
                  {guideOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                <AnimatePresence initial={false}>
                  {guideOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                      <div className="border-t border-border px-4 py-4 space-y-4">
                        {resolvedSteps.map((step) => (
                          <div key={step.num} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-primary">{step.num}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground">{step.title}</p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <code className="flex-1 font-mono text-[11px] bg-muted/50 border border-border rounded px-2 py-1 text-primary truncate">{step.cmd}</code>
                                <CopyButton text={step.cmd} />
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1">{step.note}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-md p-3">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground">Once ngrok is running, copy the <strong className="text-foreground">Forwarding</strong> URL and paste it in the Termux Server URL field above.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </TabsContent>

          {/* ── GitHub Tab ── */}
          <TabsContent value="github" className="m-0 p-6 space-y-6">
            <SectionHeader icon={Github} title="GitHub & Deploy" description="Connect your GitHub repo to enable code push and auto-deploy via Cloudflare Pages." />

            <div className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  GitHub Token{" "}
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    get token <ExternalLink className="inline w-2.5 h-2.5" />
                  </a>
                </Label>
                <Input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..." className="bg-card border-border" style={{ fontSize: "16px" }}
                  data-ocid="settings.github_token.input" />
                <p className="text-[11px] text-muted-foreground">Requires <code className="bg-muted px-1 rounded">repo</code> permission scope</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <GitBranch className="w-3 h-3" /> GitHub Repository
                </Label>
                <Input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="username/repo-name" className="bg-card border-border" style={{ fontSize: "16px" }}
                  data-ocid="settings.github_repo.input" />
              </div>

              {githubRepo && (
                <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
                  <Github className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{githubRepo}</p>
                    <a href={`https://github.com/${githubRepo}`} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1">
                      View on GitHub <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              )}

              <Button onClick={handleSave} disabled={saveSettings.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-full">
                {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save GitHub Settings
              </Button>
            </div>
          </TabsContent>

          {/* ── Master AI Tab ── */}
          <TabsContent value="master" className="m-0 p-0 flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
            <div className="px-6 pt-6 pb-3 shrink-0">
              <SectionHeader icon={Bot} title="Master AI — App Controller" description="Master AI modifies BrainForge itself. Changes are pushed to your GitHub repo." />
              <div className="space-y-1.5 max-w-lg">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Master AI Model
                  <span className="text-[10px] text-muted-foreground/60">(locked to Master AI only)</span>
                </Label>
                <Select value={masterAiModel || ""} onValueChange={handleMasterModelChange}>
                  <SelectTrigger className="bg-card border-border" data-ocid="settings.master_model.select">
                    <SelectValue placeholder="Select Master AI model…" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {masterAvailableModels.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    {masterAiModel && !masterAvailableModels.find((m) => m.id === masterAiModel) && (
                      <SelectItem value={masterAiModel}>{getModelName(masterAiModel)}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chat fills remaining height */}
            <div className="flex-1 flex flex-col mx-6 mb-6 border border-border rounded-lg overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {masterMessages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Tell Master AI what to add or change in BrainForge</p>
                  )}
                  {masterMessages.map((msg, i) => (
                    <div key={`master-msg-${i}`}
                      className={cn("rounded-md p-2.5 text-xs", msg.role === "user" ? "chat-bubble-user ml-6" : "chat-bubble-ai")}>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase block mb-1">{msg.role === "user" ? "you" : "master ai"}</span>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  ))}
                  {masterLoading && (
                    <div className="chat-bubble-ai rounded-md p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">master ai</span>
                        <div className="flex gap-1">
                          {["a", "b", "c"].map((k, i) => (
                            <span key={k} className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={masterBottomRef} />
                </div>
              </ScrollArea>

              <AnimatePresence>
                {pendingChange && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-border">
                    <div className="px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Github className="w-3.5 h-3.5 text-primary" />
                          <span>Ready to push:</span>
                          <code className="text-primary bg-primary/10 px-1 rounded text-[11px]">{pendingChange.filePath}</code>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingChange(null)}><X className="w-3 h-3" /></Button>
                      </div>
                      <pre className="bg-muted/30 rounded border border-border p-2 text-[11px] max-h-24 overflow-auto font-mono">
                        {pendingChange.newContent.slice(0, 400)}{pendingChange.newContent.length > 400 ? "\n…" : ""}
                      </pre>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handlePushToGitHub} disabled={pushingToGitHub || !githubToken || !githubRepo}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 flex-1">
                          {pushingToGitHub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
                          Push to GitHub
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPendingChange(null)} disabled={pushingToGitHub} className="border-border">Cancel</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="border-t border-border px-3 py-2 flex gap-2 shrink-0">
                <Input value={masterInput} onChange={(e) => setMasterInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleMasterSend()}
                  placeholder="Tell Master AI what to change in BrainForge…"
                  disabled={masterLoading} className="text-xs bg-card border-border flex-1 h-9"
                  style={{ fontSize: "16px" }} data-ocid="settings.master_ai.input" />
                <Button size="icon" onClick={handleMasterSend} disabled={!masterInput.trim() || masterLoading}
                  className="h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
                  {masterLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
