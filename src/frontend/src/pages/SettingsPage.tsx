import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Bot,
  Brain,
  ChevronLeft,
  Database,
  FileText,
  Github,
  Key,
  Lock,
  Save,
  Settings,
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
  | "masterai"
  | "aifiles"
  | "database"
  | "pinlock";

const HUB_BUTTONS = [
  {
    id: "api" as Page,
    label: "API Keys",
    icon: Key,
    color:
      "from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-300",
    desc: "OpenRouter, Gemini, Groq, GitHub, Supabase",
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
    color:
      "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300",
    desc: "Termux server URL for local execution",
  },
  {
    id: "github" as Page,
    label: "GitHub & Deploy",
    icon: Github,
    color:
      "from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-300",
    desc: "Token, repo, Cloudflare deploy",
  },
  {
    id: "masterai" as Page,
    label: "Master AI",
    icon: Bot,
    color: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-300",
    desc: "BrainForge maintenance AI, memory, rules",
  },
  {
    id: "aifiles" as Page,
    label: "AI Files",
    icon: FileText,
    color: "from-teal-500/20 to-cyan-500/20 border-teal-500/30 text-teal-300",
    desc: "View and edit AI memory & rules files",
  },
  {
    id: "database" as Page,
    label: "Database",
    icon: Database,
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-300",
    desc: "Supabase for built apps, D1 backup",
  },
  {
    id: "pinlock" as Page,
    label: "PIN Lock",
    icon: Lock,
    color:
      "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-300",
    desc: "App PIN protection & session timeout",
  },
];

function SubPageHeader({
  title,
  onBack,
}: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
      <button
        type="button"
        onClick={onBack}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      {children}
    </div>
  );
}

function ApiPage({ onBack }: { onBack: () => void }) {
  const { data: settings } = useSettings();
  const save = useSaveSettings();
  const s = settings as any;

  const [openRouterKey, setOpenRouterKey] = useState(s?.openRouterApiKey || "");
  const [defaultModel, setDefaultModel] = useState(
    s?.defaultModel || "qwen/qwen3-coder:free",
  );
  const [geminiKey, setGeminiKey] = useState(s?.geminiApiKey || "");
  const [geminiModel, setGeminiModel] = useState(
    s?.geminiModel || "gemini-2.0-flash",
  );
  const [groqKey, setGroqKey] = useState(s?.groqApiKey || "");
  const [groqModel, setGroqModel] = useState(
    s?.groqModel || "llama-3.3-70b-versatile",
  );
  const [githubModelsKey, setGithubModelsKey] = useState(
    s?.githubModelsKey || "",
  );
  const [githubModelsModel, setGithubModelsModel] = useState(
    s?.githubModelsModel || "gpt-4o",
  );

  // Supabase for built apps -- stored separately
  const [supUrl, setSupUrl] = useState(
    () => localStorage.getItem("bf_supabase_url") || "",
  );
  const [supKey, setSupKey] = useState(
    () => localStorage.getItem("bf_supabase_key") || "",
  );
  const [supSaved, setSupSaved] = useState(false);

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

  const handleSupabaseSave = () => {
    localStorage.setItem("bf_supabase_url", supUrl);
    localStorage.setItem("bf_supabase_key", supKey);
    setSupSaved(true);
    setTimeout(() => setSupSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="API Keys" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* OpenRouter */}
        <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 space-y-3">
          <p className="text-xs font-semibold text-violet-300">OpenRouter</p>
          <FieldGroup label="API Key">
            <Input
              value={openRouterKey}
              onChange={(e) => setOpenRouterKey(e.target.value)}
              placeholder="sk-or-..."
              type="password"
              className="h-8 text-xs"
            />
          </FieldGroup>
          <FieldGroup label="Model">
            <Input
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              placeholder="qwen/qwen3-coder:free"
              className="h-8 text-xs"
            />
          </FieldGroup>
        </div>
        {/* Gemini */}
        <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-3">
          <p className="text-xs font-semibold text-blue-300">Google Gemini</p>
          <FieldGroup label="API Key">
            <Input
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              type="password"
              className="h-8 text-xs"
            />
          </FieldGroup>
          <FieldGroup label="Model">
            <Input
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              placeholder="gemini-2.0-flash"
              className="h-8 text-xs"
            />
          </FieldGroup>
        </div>
        {/* Groq */}
        <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 space-y-3">
          <p className="text-xs font-semibold text-orange-300">Groq</p>
          <FieldGroup label="API Key">
            <Input
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              type="password"
              className="h-8 text-xs"
            />
          </FieldGroup>
          <FieldGroup label="Model">
            <Input
              value={groqModel}
              onChange={(e) => setGroqModel(e.target.value)}
              placeholder="llama-3.3-70b-versatile"
              className="h-8 text-xs"
            />
          </FieldGroup>
        </div>
        {/* GitHub Models */}
        <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5 space-y-3">
          <p className="text-xs font-semibold text-green-300">GitHub Models</p>
          <FieldGroup label="Token">
            <Input
              value={githubModelsKey}
              onChange={(e) => setGithubModelsKey(e.target.value)}
              placeholder="ghp_..."
              type="password"
              className="h-8 text-xs"
            />
          </FieldGroup>
          <FieldGroup label="Model">
            <Input
              value={githubModelsModel}
              onChange={(e) => setGithubModelsModel(e.target.value)}
              placeholder="gpt-4o"
              className="h-8 text-xs"
            />
          </FieldGroup>
        </div>
        <Button
          onClick={handleSave}
          disabled={save.isPending}
          className="w-full h-8 text-xs"
          data-ocid="settings.api.save_button"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {save.isPending
            ? "Saving..."
            : save.isSuccess
              ? "Saved ✓"
              : "Save API Keys"}
        </Button>

        {/* Supabase for built apps */}
        <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-3">
          <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> Supabase
            <span className="text-[9px] text-muted-foreground">
              (for your built apps)
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            BrainForge ka apna data D1+GitHub mein hai. Yeh keys sirf tumhare
            banaye apps ke liye hain.
          </p>
          <FieldGroup label="Supabase URL">
            <Input
              value={supUrl}
              onChange={(e) => setSupUrl(e.target.value)}
              placeholder="https://xxx.supabase.co"
              className="h-8 text-xs"
            />
          </FieldGroup>
          <FieldGroup label="Anon Key">
            <Input
              value={supKey}
              onChange={(e) => setSupKey(e.target.value)}
              placeholder="eyJhbGci..."
              type="password"
              className="h-8 text-xs"
            />
          </FieldGroup>
          <Button
            onClick={handleSupabaseSave}
            className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
            data-ocid="settings.supabase.save_button"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {supSaved ? "Saved ✓" : "Save Supabase Keys"}
          </Button>
        </div>
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
    save.mutate({
      aiProvider: provider as any,
      temperature: Number.parseFloat(temp) || 0.7,
      maxTokens: Number.parseInt(maxTok) || 4096,
      autoFix,
      liveSearch,
      proactiveAI: proactive,
    } as any);
  };

  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="AI Settings" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <FieldGroup label="Provider">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full h-8 bg-card border border-border rounded-md px-2 text-xs text-foreground"
          >
            <option value="auto">Auto (best available)</option>
            <option value="openrouter">OpenRouter</option>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
            <option value="github">GitHub Models</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Temperature">
          <Input
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="0.7"
            className="h-8 text-xs"
          />
        </FieldGroup>
        <FieldGroup label="Max Tokens">
          <Input
            value={maxTok}
            onChange={(e) => setMaxTok(e.target.value)}
            placeholder="4096"
            className="h-8 text-xs"
          />
        </FieldGroup>
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-xs font-medium text-foreground">
              Auto-fix errors
            </p>
            <p className="text-[10px] text-muted-foreground">
              AI retries up to 3 times on error
            </p>
          </div>
          <Switch checked={autoFix} onCheckedChange={setAutoFix} />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-xs font-medium text-foreground">
              Live internet search
            </p>
            <p className="text-[10px] text-muted-foreground">
              DuckDuckGo before each response
            </p>
          </div>
          <Switch checked={liveSearch} onCheckedChange={setLiveSearch} />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs font-medium text-foreground">Proactive AI</p>
            <p className="text-[10px] text-muted-foreground">
              AI suggests improvements automatically
            </p>
          </div>
          <Switch checked={proactive} onCheckedChange={setProactive} />
        </div>
        <Button
          onClick={handleSave}
          disabled={save.isPending}
          className="w-full h-8 text-xs"
          data-ocid="settings.ai.save_button"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {save.isPending
            ? "Saving..."
            : save.isSuccess
              ? "Saved ✓"
              : "Save AI Settings"}
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
          <p className="text-[10px] text-green-300/70 mb-1">
            Run BrainForge Worker locally via Termux on Android.
          </p>
          <p className="text-[10px] text-muted-foreground">
            Start with:{" "}
            <code className="text-green-400 bg-green-950/40 px-1 rounded">
              node server.js
            </code>{" "}
            in Termux
          </p>
        </div>
        <FieldGroup label="Termux Server URL">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="h-8 text-xs"
          />
        </FieldGroup>
        <Button
          onClick={() => save.mutate({ termuxUrl: url } as any)}
          disabled={save.isPending}
          className="w-full h-8 text-xs"
          data-ocid="settings.termux.save_button"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {save.isPending ? "Saving..." : "Save"}
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
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_..."
              type="password"
              className="h-8 text-xs"
            />
          </FieldGroup>
          <FieldGroup label="Repository (owner/repo)">
            <Input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="username/repo"
              className="h-8 text-xs"
            />
          </FieldGroup>
        </div>
        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-3">
          <p className="text-xs font-semibold text-amber-300">
            Cloudflare Deploy
          </p>
          <FieldGroup label="API Token">
            <Input
              value={cfToken}
              onChange={(e) => setCfToken(e.target.value)}
              placeholder="CF API token"
              type="password"
              className="h-8 text-xs"
            />
          </FieldGroup>
          <FieldGroup label="Account ID">
            <Input
              value={cfAccount}
              onChange={(e) => setCfAccount(e.target.value)}
              placeholder="913f3a25..."
              className="h-8 text-xs"
            />
          </FieldGroup>
        </div>
        <Button
          onClick={() =>
            save.mutate({
              githubToken: token,
              githubRepo: repo,
              cloudflareToken: cfToken,
              cloudflareAccountId: cfAccount,
            } as any)
          }
          disabled={save.isPending}
          className="w-full h-8 text-xs"
          data-ocid="settings.github.save_button"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function MasterAiPage({ onBack }: { onBack: () => void }) {
  const { data: settings } = useSettings();
  const save = useSaveSettings();
  const s = settings as any;
  const [enabled, setEnabled] = useState<boolean>(s?.masterAIEnabled !== false);
  const [memory, setMemory] = useState(
    () => localStorage.getItem("bf_master_memory") || "",
  );
  const [rules, setRules] = useState(
    () => localStorage.getItem("bf_master_rules") || "",
  );

  const handleSave = () => {
    save.mutate({ masterAIEnabled: enabled } as any);
    localStorage.setItem("bf_master_memory", memory);
    localStorage.setItem("bf_master_rules", rules);
  };

  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="Master AI" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="p-3 rounded-lg border border-pink-500/20 bg-pink-500/5">
          <p className="text-[10px] text-pink-300/70">
            Master AI is dedicated to maintaining BrainForge itself. It has its
            own memory, rules, and model separate from project AI.
          </p>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs font-medium text-foreground">
              Master AI Enabled
            </p>
            <p className="text-[10px] text-muted-foreground">
              Toggle BrainForge maintenance AI
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <FieldGroup label="Memory">
          <textarea
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            placeholder="Master AI memory notes..."
            rows={5}
            className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-primary/50"
          />
        </FieldGroup>
        <FieldGroup label="Rules">
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Master AI rules..."
            rows={5}
            className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-primary/50"
          />
        </FieldGroup>
        <Button
          onClick={handleSave}
          disabled={save.isPending}
          className="w-full h-8 text-xs"
          data-ocid="settings.masterai.save_button"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {save.isPending ? "Saving..." : "Save Master AI"}
        </Button>
      </div>
    </div>
  );
}

function AiFilesPage({ onBack }: { onBack: () => void }) {
  const [projects] = useState<string[]>(() => {
    try {
      const ps = JSON.parse(localStorage.getItem("bf_projects") || "[]");
      return ps.map((p: any) => p.name);
    } catch {
      return [];
    }
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
          <p className="text-[10px] text-teal-300/70">
            View and edit AI memory and rules for each project. Changes take
            effect on next message.
          </p>
        </div>
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No projects yet. Create one to view AI files.
          </p>
        ) : (
          <>
            <FieldGroup label="Select Project">
              <select
                value={selectedProject || ""}
                onChange={(e) => loadProject(e.target.value)}
                className="w-full h-8 bg-card border border-border rounded-md px-2 text-xs text-foreground"
              >
                <option value="">-- choose project --</option>
                {projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </FieldGroup>
            {selectedProject && (
              <>
                <FieldGroup label={`Memory (${selectedProject})`}>
                  <textarea
                    value={projMem}
                    onChange={(e) => setProjMem(e.target.value)}
                    placeholder="AI memory for this project..."
                    rows={5}
                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-primary/50"
                  />
                </FieldGroup>
                <FieldGroup label={`Rules (${selectedProject})`}>
                  <textarea
                    value={projRules}
                    onChange={(e) => setProjRules(e.target.value)}
                    placeholder="AI rules for this project..."
                    rows={5}
                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-primary/50"
                  />
                </FieldGroup>
                <Button
                  onClick={handleSave}
                  className="w-full h-8 text-xs"
                  data-ocid="settings.aifiles.save_button"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saved ? "Saved ✓" : "Save AI Files"}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DatabasePage({ onBack }: { onBack: () => void }) {
  const [supUrl, setSupUrl] = useState(
    () => localStorage.getItem("bf_supabase_url") || "",
  );
  const [supKey, setSupKey] = useState(
    () => localStorage.getItem("bf_supabase_key") || "",
  );
  const [supSaved, setSupSaved] = useState(false);

  // D1 stats
  const workerUrl = "https://brainforge-api.richard-brown-miami.workers.dev";
  const [d1Stats, setD1Stats] = useState<{
    tables?: number;
    rows?: number;
    size?: string;
  } | null>(null);
  const [d1Loading, setD1Loading] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");

  const fetchD1Stats = async () => {
    setD1Loading(true);
    try {
      const res = await fetch(`${workerUrl}/api/stats`, {
        headers: { "x-brainforge-secret": "2200" },
      });
      if (res.ok) {
        const data = await res.json();
        setD1Stats(data);
      }
    } catch {}
    setD1Loading(false);
  };

  const handleBackup = async () => {
    setBackupMsg("Backing up...");
    try {
      const res = await fetch(`${workerUrl}/api/backup`, {
        method: "POST",
        headers: { "x-brainforge-secret": "2200" },
      });
      setBackupMsg(res.ok ? "✓ Backup complete" : "Backup failed");
    } catch {
      setBackupMsg("Backup error");
    }
    setTimeout(() => setBackupMsg(""), 3000);
  };

  const handleSupabaseSave = () => {
    localStorage.setItem("bf_supabase_url", supUrl);
    localStorage.setItem("bf_supabase_key", supKey);
    setSupSaved(true);
    setTimeout(() => setSupSaved(false), 2000);
  };

  // Local storage usage
  let localUsed = 0;
  try {
    for (const key of Object.keys(localStorage)) {
      localUsed += (localStorage.getItem(key) || "").length * 2;
    }
  } catch {}
  const localMB = (localUsed / 1024 / 1024).toFixed(2);
  const localPct = Math.min(100, (localUsed / (1024 * 1024 * 50)) * 100);

  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="Database" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Supabase for Generated Projects -- AT TOP */}
        <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-3">
          <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> Supabase
            <span className="text-[9px] text-muted-foreground">
              (for your built apps)
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            BrainForge ka apna data D1+GitHub mein hai. Yeh keys sirf tumhare
            banaye apps ke liye hain.
          </p>
          <FieldGroup label="Supabase URL">
            <Input
              value={supUrl}
              onChange={(e) => setSupUrl(e.target.value)}
              placeholder="https://xxx.supabase.co"
              className="h-8 text-xs"
            />
          </FieldGroup>
          <FieldGroup label="Anon Key">
            <Input
              value={supKey}
              onChange={(e) => setSupKey(e.target.value)}
              placeholder="eyJhbGci..."
              type="password"
              className="h-8 text-xs"
            />
          </FieldGroup>
          <Button
            onClick={handleSupabaseSave}
            className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
            data-ocid="settings.db.supabase.save_button"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {supSaved ? "Saved ✓" : "Save Supabase Keys"}
          </Button>
          {(supUrl || supKey) && (
            <p className="text-[10px] text-emerald-400">
              ✓ Supabase configured — projects will use this DB
            </p>
          )}
        </div>

        {/* Local Storage Meter */}
        <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2">
          <p className="text-xs font-semibold text-blue-300">Local Storage</p>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{localMB} MB used</span>
            <span>~50 MB limit</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted/30">
            <div
              className={`h-2 rounded-full transition-all ${localPct > 80 ? "bg-red-500" : localPct > 50 ? "bg-yellow-500" : "bg-blue-500"}`}
              style={{ width: `${localPct}%` }}
            />
          </div>
        </div>

        {/* D1 Stats */}
        <div className="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-indigo-300">
              Cloudflare D1
            </p>
            <button
              type="button"
              onClick={fetchD1Stats}
              className="text-[10px] text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded px-2 py-0.5"
            >
              {d1Loading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {d1Stats ? (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Tables", val: d1Stats.tables ?? "?" },
                { label: "Rows", val: d1Stats.rows ?? "?" },
                { label: "Size", val: d1Stats.size ?? "?" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="text-center p-2 rounded bg-white/[0.03] border border-border"
                >
                  <p className="text-sm font-bold text-foreground">
                    {String(item.val)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              Click Refresh to load D1 stats
            </p>
          )}
          <Button
            onClick={handleBackup}
            variant="outline"
            className="w-full h-8 text-xs"
            data-ocid="settings.db.backup_button"
          >
            {backupMsg || "Backup D1 to GitHub"}
          </Button>
        </div>

        {/* Clear local data */}
        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 space-y-2">
          <p className="text-xs font-semibold text-red-300">Danger Zone</p>
          <p className="text-[10px] text-muted-foreground">
            Clear all local data (settings, projects, chat history). This cannot
            be undone.
          </p>
          <Button
            variant="destructive"
            className="w-full h-8 text-xs"
            onClick={() => {
              if (confirm("Clear ALL local data? This cannot be undone.")) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            data-ocid="settings.db.clear.delete_button"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear All Data
          </Button>
        </div>
      </div>
    </div>
  );
}

function PinLockPage({ onBack }: { onBack: () => void }) {
  const [pin, setPin] = useState(() => localStorage.getItem("bf_pin") || "");
  const [confirmPin, setConfirmPin] = useState("");
  const [enabled, setEnabled] = useState(
    () => !!localStorage.getItem("bf_pin"),
  );
  const [timeout, setTimeoutVal] = useState(
    () => localStorage.getItem("bf_pin_timeout") || "30",
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    setError("");
    if (enabled) {
      if (pin.length < 4) {
        setError("PIN must be at least 4 digits");
        return;
      }
      if (pin !== confirmPin) {
        setError("PINs do not match");
        return;
      }
      localStorage.setItem("bf_pin", pin);
      localStorage.setItem("bf_pin_timeout", timeout);
    } else {
      localStorage.removeItem("bf_pin");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="PIN Lock" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-[10px] text-yellow-300/70">
            PIN lock protects your BrainForge from unauthorized access. You'll
            need to enter your PIN each time you open the app.
          </p>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs font-medium text-foreground">
              Enable PIN Lock
            </p>
            <p className="text-[10px] text-muted-foreground">
              Require PIN on app open
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        {enabled && (
          <>
            <FieldGroup label="New PIN (min 4 digits)">
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter PIN"
                type="password"
                maxLength={8}
                className="h-8 text-xs"
              />
            </FieldGroup>
            <FieldGroup label="Confirm PIN">
              <Input
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, ""))
                }
                placeholder="Confirm PIN"
                type="password"
                maxLength={8}
                className="h-8 text-xs"
              />
            </FieldGroup>
            <FieldGroup label="Session Timeout (minutes)">
              <Input
                value={timeout}
                onChange={(e) => setTimeoutVal(e.target.value)}
                placeholder="30"
                className="h-8 text-xs"
              />
            </FieldGroup>
          </>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          onClick={handleSave}
          className="w-full h-8 text-xs bg-yellow-600 hover:bg-yellow-700"
          data-ocid="settings.pin.save_button"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {saved ? "Saved ✓" : "Save PIN Settings"}
        </Button>
        {!enabled && localStorage.getItem("bf_pin") && (
          <Button
            variant="destructive"
            className="w-full h-8 text-xs"
            onClick={() => {
              localStorage.removeItem("bf_pin");
              setPin("");
              setConfirmPin("");
              setSaved(true);
            }}
            data-ocid="settings.pin.delete_button"
          >
            Remove PIN Lock
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
  if (page === "masterai") return <MasterAiPage onBack={() => setPage(null)} />;
  if (page === "aifiles") return <AiFilesPage onBack={() => setPage(null)} />;
  if (page === "database") return <DatabasePage onBack={() => setPage(null)} />;
  if (page === "pinlock") return <PinLockPage onBack={() => setPage(null)} />;

  return (
    <div className="flex flex-col h-full" data-ocid="settings.page">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
        <Settings className="w-4 h-4 text-primary" />
        <h1 className="text-sm font-semibold text-foreground">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {HUB_BUTTONS.map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setPage(btn.id)}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border bg-gradient-to-br transition-all hover:scale-[1.02] active:scale-[0.98] ${btn.color}`}
                data-ocid={`settings.${btn.id}.button`}
              >
                <Icon className="w-5 h-5" />
                <div>
                  <p className="text-xs font-semibold">{btn.label}</p>
                  <p className="text-[10px] opacity-70 leading-tight mt-0.5">
                    {btn.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-center mt-6 space-y-1.5">
          <p className="text-[10px] text-muted-foreground/30">
            Made with love by{" "}
            <span className="text-violet-400/60">Richard Brown</span>
            {" "}&amp;{" "}
            <span className="text-cyan-400/60">Claude (Ara)</span>
          </p>
          <Link
            to="/policy"
            className="text-[10px] text-muted-foreground/25 hover:text-muted-foreground/60 underline transition-colors"
          >
            Legal Policy &amp; Terms
          </Link>
        </div>
      </div>
    </div>
  );
}

