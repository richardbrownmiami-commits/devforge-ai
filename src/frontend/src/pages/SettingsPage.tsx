import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Link } from "@tanstack/react-router";
import {
  Bot,
  Brain,
  ChevronLeft,
  FileText,
  Github,
  Key,
  Lock,
  Save,
  Terminal,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useSaveSettings, useSettings } from "../hooks/useBackend";

type Page =
  | null
  | "api"
  | "ai"
  | "termux"
  | "github"
  | "aifiles"
  | "pinlock";

const HUB_BUTTONS = [
  {
    id: "api" as Page,
    label: "API Keys",
    icon: Key,
    color: "from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-300",
    desc: "OpenRouter, Gemini, Groq, GitHub",
  },
  {
    id: "ai" as Page,
    label: "AI Settings",
    icon: Brain,
    color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-300",
    desc: "Model, temperature, auto-fix, search",
  },
  {
    id: "termux" as Page,
    label: "Termux",
    icon: Terminal,
    color: "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300",
    desc: "Termux server URL for local execution",
  },
  {
    id: "github" as Page,
    label: "GitHub & Deploy",
    icon: Github,
    color: "from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-300",
    desc: "Token, repo, Cloudflare deploy",
  },

  {
    id: "pinlock" as Page,
    label: "PIN Lock",
    icon: Lock,
    color: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-300",
    desc: "App PIN protection & session timeout",
  },
];

function SubPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
      <button type="button" onClick={onBack}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

function ApiPage({ onBack }: { onBack: () => void }) {
  const { data: settings } = useSettings();
  const save = useSaveSettings();
  const s = settings as any;

  const [openRouterKey, setOpenRouterKey] = useState(s?.openRouterApiKey || "");
  const [defaultModel, setDefaultModel] = useState(s?.defaultModel || "qwen/qwen3-coder:free");
  const [geminiKey, setGeminiKey] = useState(s?.geminiApiKey || "");
  const [geminiModel, setGeminiModel] = useState(s?.geminiModel || "gemini-2.0-flash");
  const [groqKey, setGroqKey] = useState(s?.groqApiKey || "");
  const [groqModel, setGroqModel] = useState(s?.groqModel || "llama-3.3-70b-versatile");
  const [githubModelsKey, setGithubModelsKey] = useState(s?.githubModelsKey || "");
  const [githubModelsModel, setGithubModelsModel] = useState(s?.githubModelsModel || "gpt-4o");

  const handleSave = () => {
    save.mutate({
      openRouterApiKey: openRouterKey,
      defaultModel,
      geminiApiKey: geminiKey,
      geminiModel,
      groqApiKey: groqKey,
      groqModel,
      githubModelsKey,
      githubModelsModel,
    } as any);
  };

  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="API Keys" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 space-y-3">
          <p className="text-xs font-semibold text-violet-300">OpenRouter</p>
          <FieldGroup label="API Key">
            <Input value={openRouterKey} onChange={(e) => setOpenRouterKey(e.target.value)} placeholder="sk-or-..." type="password" className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Model">
            <Input value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} placeholder="qwen/qwen3-coder:free" className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-3">
          <p className="text-xs font-semibold text-blue-300">Google Gemini</p>
          <FieldGroup label="API Key">
            <Input value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIzaSy..." type="password" className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Model">
            <Input value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} placeholder="gemini-2.0-flash" className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 space-y-3">
          <p className="text-xs font-semibold text-orange-300">Groq</p>
          <FieldGroup label="API Key">
            <Input value={groqKey} onChange={(e) => setGroqKey(e.target.value)} placeholder="gsk_..." type="password" className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Model">
            <Input value={groqModel} onChange={(e) => setGroqModel(e.target.value)} placeholder="llama-3.3-70b-versatile" className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5 space-y-3">
          <p className="text-xs font-semibold text-green-300">GitHub Models</p>
          <FieldGroup label="Token">
            <Input value={githubModelsKey} onChange={(e) => setGithubModelsKey(e.target.value)} placeholder="ghp_..." type="password" className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Model">
            <Input value={githubModelsModel} onChange={(e) => setGithubModelsModel(e.target.value)} placeholder="gpt-4o" className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Database (D1 + Supabase) Admin Panel mein milega → Admin → Database
        </p>
        <Button onClick={handleSave} disabled={save.isPending} className="w-full h-8 text-xs" data-ocid="settings.api.save_button">
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {save.isPending ? "Saving..." : save.isSuccess ? "Saved ✓" : "Save API Keys"}
        </Button>
      </div>
    </div>
  );
}

function AiSettingsPage({ onBack }: { onBack: () => void }) {
  const { data: settings } = useSettings();
  const save = useSaveSettings();
  const s = settings as any;
  const [provider, setProvider] = useState(s?.aiProvider || "auto");
  const [temp, setTemp] = useState(String(s?.temperature ?? 0.7));
  const [maxTok, setMaxTok] = useState(String(s?.maxTokens ?? 4096));
  const [autoFix, setAutoFix] = useState<boolean>(s?.autoFix !== false);
  const [liveSearch, setLiveSearch] = useState<boolean>(!!s?.liveSearch);
  const [proactive, setProactive] = useState<boolean>(!!s?.proactiveAI);

  const handleSave = () => {
    save.mutate({ aiProvider: provider as any, temperature: Number.parseFloat(temp) || 0.7, maxTokens: Number.parseInt(maxTok) || 4096, autoFix, liveSearch, proactiveAI: proactive } as any);
  };

  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="AI Settings" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <FieldGroup label="Provider">
          <select value={provider} onChange={(e) => setProvider(e.target.value)}
            className="w-full h-8 bg-card border border-border rounded-md px-2 text-xs text-foreground">
            <option value="auto">Auto (best available)</option>
            <option value="openrouter">OpenRouter</option>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
            <option value="github">GitHub Models</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Temperature">
          <Input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="0.7" className="h-8 text-xs" />
        </FieldGroup>
        <FieldGroup label="Max Tokens">
          <Input value={maxTok} onChange={(e) => setMaxTok(e.target.value)} placeholder="4096" className="h-8 text-xs" />
        </FieldGroup>
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-xs font-medium text-foreground">Auto-fix errors</p>
            <p className="text-[10px] text-muted-foreground">AI retries up to 3 times on error</p>
          </div>
          <Switch checked={autoFix} onCheckedChange={setAutoFix} />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-xs font-medium text-foreground">Live internet search</p>
            <p className="text-[10px] text-muted-foreground">DuckDuckGo before each response</p>
          </div>
          <Switch checked={liveSearch} onCheckedChange={setLiveSearch} />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs font-medium text-foreground">Proactive AI</p>
            <p className="text-[10px] text-muted-foreground">AI suggests improvements automatically</p>
          </div>
          <Switch checked={proactive} onCheckedChange={setProactive} />
        </div>
        <Button onClick={handleSave} disabled={save.isPending} className="w-full h-8 text-xs" data-ocid="settings.ai.save_button">
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {save.isPending ? "Saving..." : save.isSuccess ? "Saved ✓" : "Save AI Settings"}
        </Button>
      </div>
    </div>
  );
}

function TermuxPage({ onBack }: { onBack: () => void }) {
  const { data: settings } = useSettings();
  const save = useSaveSettings();
  const s = settings as any;
  const [url, setUrl] = useState(s?.termuxUrl || "");

  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="Termux" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
          <p className="text-[10px] text-green-300/70 mb-1">Run BrainForge Worker locally via Termux on Android.</p>
          <p className="text-[10px] text-muted-foreground">Start with: <code className="text-green-400 bg-green-950/40 px-1 rounded">node server.js</code> in Termux</p>
        </div>
        <FieldGroup label="Termux Server URL">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:3000" className="h-8 text-xs" />
        </FieldGroup>
        <Button onClick={() => save.mutate({ termuxUrl: url } as any)} disabled={save.isPending} className="w-full h-8 text-xs" data-ocid="settings.termux.save_button">
          <Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function GithubPage({ onBack }: { onBack: () => void }) {
  const { data: settings } = useSettings();
  const save = useSaveSettings();
  const s = settings as any;
  const [token, setToken] = useState(s?.githubToken || "");
  const [repo, setRepo] = useState(s?.githubRepo || "");
  const [cfToken, setCfToken] = useState(s?.cloudflareToken || "");
  const [cfAccount, setCfAccount] = useState(s?.cloudflareAccountId || "");

  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="GitHub & Deploy" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 space-y-3">
          <p className="text-xs font-semibold text-orange-300">GitHub</p>
          <FieldGroup label="Personal Access Token">
            <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_..." type="password" className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Repository (owner/repo)">
            <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="username/repo" className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-3">
          <p className="text-xs font-semibold text-amber-300">Cloudflare Deploy</p>
          <FieldGroup label="API Token">
            <Input value={cfToken} onChange={(e) => setCfToken(e.target.value)} placeholder="CF API token" type="password" className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Account ID">
            <Input value={cfAccount} onChange={(e) => setCfAccount(e.target.value)} placeholder="913f3a25..." className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <Button onClick={() => save.mutate({ githubToken: token, githubRepo: repo, cloudflareToken: cfToken, cloudflareAccountId: cfAccount } as any)} disabled={save.isPending} className="w-full h-8 text-xs" data-ocid="settings.github.save_button">
          <Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function AiFilesPage({ onBack }: { onBack: () => void }) {
  const [projects] = useState<string[]>(() => {
    try { const ps = JSON.parse(localStorage.getItem("bf_projects") || "[]"); return ps.map((p: any) => p.name); } catch { return []; }
  });
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projMem, setProjMem] = useState("");
  const [projRules, setProjRules] = useState("");
  const [saved, setSaved] = useState(false);

  const loadProject = (name: string) => {
    setSelectedProject(name);
    setProjMem(localStorage.getItem(`bf_memory_${name}`) || "");
    setProjRules(localStorage.getItem(`bf_rules_${name}`) || "");
  };

  const handleSave = () => {
    if (!selectedProject) return;
    localStorage.setItem(`bf_memory_${selectedProject}`, projMem);
    localStorage.setItem(`bf_rules_${selectedProject}`, projRules);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="AI Files" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="p-3 rounded-lg border border-teal-500/20 bg-teal-500/5">
          <p className="text-[10px] text-teal-300/70">View and edit AI memory and rules for each project.</p>
        </div>
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No projects yet.</p>
        ) : (
          <>
            <FieldGroup label="Select Project">
              <select value={selectedProject || ""} onChange={(e) => loadProject(e.target.value)}
                className="w-full h-8 bg-card border border-border rounded-md px-2 text-xs text-foreground">
                <option value="">-- choose project --</option>
                {projects.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </FieldGroup>
            {selectedProject && (
              <>
                <FieldGroup label={`Memory (${selectedProject})`}>
                  <textarea value={projMem} onChange={(e) => setProjMem(e.target.value)} placeholder="AI memory..." rows={5}
                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-primary/50" />
                </FieldGroup>
                <FieldGroup label={`Rules (${selectedProject})`}>
                  <textarea value={projRules} onChange={(e) => setProjRules(e.target.value)} placeholder="AI rules..." rows={5}
                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-primary/50" />
                </FieldGroup>
                <Button onClick={handleSave} className="w-full h-8 text-xs" data-ocid="settings.aifiles.save_button">
                  <Save className="w-3.5 h-3.5 mr-1.5" />{saved ? "Saved ✓" : "Save AI Files"}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PinLockPage({ onBack }: { onBack: () => void }) {
  const { data: settings } = useSettings();
  const save = useSaveSettings();
  const s = settings as any;
  const [pinEnabled, setPinEnabled] = useState<boolean>(!!s?.pinEnabled);
  const [pinCode, setPinCode] = useState(s?.pinCode || "");
  const [sessionTimeout, setSessionTimeout] = useState(String(s?.sessionTimeout ?? 30));

  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="PIN Lock" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs font-medium text-foreground">Enable PIN Lock</p>
            <p className="text-[10px] text-muted-foreground">Require PIN on app open</p>
          </div>
          <Switch checked={pinEnabled} onCheckedChange={setPinEnabled} />
        </div>
        {pinEnabled && (
          <>
            <FieldGroup label="PIN Code (4-6 digits)">
              <Input value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))} placeholder="1234" maxLength={6} type="password" className="h-8 text-xs" />
            </FieldGroup>
            <FieldGroup label="Session Timeout (minutes)">
              <Input value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} placeholder="30" className="h-8 text-xs" />
            </FieldGroup>
          </>
        )}
        <Button onClick={() => save.mutate({ pinEnabled, pinCode, sessionTimeout: Number.parseInt(sessionTimeout) || 30 } as any)} disabled={save.isPending} className="w-full h-8 text-xs" data-ocid="settings.pinlock.save_button">
          <Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving..." : "Save PIN Settings"}
        </Button>
        {pinEnabled && (
          <Button onClick={() => save.mutate({ pinEnabled: false, pinCode: "" } as any)} variant="outline" className="w-full h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />Remove PIN Lock
          </Button>
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [page, setPage] = useState<Page>(null);

  if (page === "api") return <ApiPage onBack={() => setPage(null)} />;
  if (page === "ai") return <AiSettingsPage onBack={() => setPage(null)} />;
  if (page === "termux") return <TermuxPage onBack={() => setPage(null)} />;
  if (page === "github") return <GithubPage onBack={() => setPage(null)} />;
  if (page === "aifiles") return <AiFilesPage onBack={() => setPage(null)} />;
  if (page === "pinlock") return <PinLockPage onBack={() => setPage(null)} />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-4 py-4 border-b border-border flex items-center gap-3">
        <span className="text-lg">⚙️</span>
        <h1 className="text-sm font-semibold text-foreground">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HUB_BUTTONS.map((btn) => {
            const Icon = btn.icon;
            return (
              <button key={btn.id} type="button" onClick={() => setPage(btn.id)}
                className={`w-full p-4 rounded-xl border bg-gradient-to-br text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${btn.color}`}
                data-ocid={`settings.hub.${btn.id}.button`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{btn.label}</span>
                </div>
                <p className="text-[11px] opacity-70">{btn.desc}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-4 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
          <p className="text-[11px] text-blue-300/80">
            💾 <strong>Database</strong> (D1 + Supabase) Admin Panel mein milega:
            <Link to="/admin" className="ml-1 underline text-blue-300">brainforge.../admin → Database</Link>
          </p>
        </div>
        <div className="mt-3 p-3 rounded-lg" style={{ background: "oklch(0.08 0.02 280)" }}>
          <p className="text-[10px] text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} BrainForge — Made by <span className="text-foreground font-medium">Pinka</span>
          </p>
        </div>
      </div>
    </div>
  );
}
