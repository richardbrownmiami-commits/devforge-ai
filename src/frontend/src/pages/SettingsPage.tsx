import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Link } from "@tanstack/react-router";
import {
  Brain,
  ChevronLeft,
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

const OPENROUTER_MODELS = [
  // ── Auto Router ───────────────────────────────────────────────
  { label: "🤖 Auto (Best Available)", value: "openrouter/auto" },
  // ── Recommended ──────────────────────────────────────────────
  { label: "⭐ Qwen3 Coder 480B", value: "qwen/qwen3-coder:free" },
  { label: "⭐ DeepSeek V3", value: "deepseek/deepseek-v3:free" },
  { label: "⭐ Llama 3.3 70B", value: "meta-llama/llama-3.3-70b-instruct:free" },
  { label: "⭐ Gemini 2.0 Flash (OR)", value: "google/gemini-2.0-flash-exp:free" },
  // ── DeepSeek ─────────────────────────────────────────────────
  { label: "DeepSeek R1", value: "deepseek/deepseek-r1:free" },
  { label: "DeepSeek R1 Distill Llama 70B", value: "deepseek/deepseek-r1-distill-llama-70b:free" },
  { label: "DeepSeek R1 Distill Qwen 32B", value: "deepseek/deepseek-r1-distill-qwen-32b:free" },
  { label: "DeepSeek R1 Zero", value: "deepseek/deepseek-r1-zero:free" },
  { label: "DeepSeek Chat V3 0324", value: "deepseek/deepseek-chat-v3-0324:free" },
  // ── Qwen ─────────────────────────────────────────────────────
  { label: "Qwen3 235B A22B", value: "qwen/qwen3-235b-a22b:free" },
  { label: "Qwen3 30B A3B", value: "qwen/qwen3-30b-a3b:free" },
  { label: "Qwen3 14B", value: "qwen/qwen3-14b:free" },
  { label: "Qwen3 8B", value: "qwen/qwen3-8b:free" },
  { label: "Qwen 2.5 72B Instruct", value: "qwen/qwen-2.5-72b-instruct:free" },
  { label: "Qwen 2.5 Coder 32B Instruct", value: "qwen/qwen-2.5-coder-32b-instruct:free" },
  { label: "Qwen 2.5 7B Instruct", value: "qwen/qwen-2.5-7b-instruct:free" },
  { label: "QwQ 32B", value: "qwen/qwq-32b:free" },
  // ── Meta Llama ────────────────────────────────────────────────
  { label: "Llama 4 Scout 17B", value: "meta-llama/llama-4-scout-17b-16e-instruct:free" },
  { label: "Llama 4 Maverick 17B", value: "meta-llama/llama-4-maverick-17b-128e-instruct:free" },
  { label: "Llama 3.1 405B Instruct", value: "meta-llama/llama-3.1-405b-instruct:free" },
  { label: "Llama 3.1 70B Instruct", value: "meta-llama/llama-3.1-70b-instruct:free" },
  { label: "Llama 3.1 8B Instruct", value: "meta-llama/llama-3.1-8b-instruct:free" },
  { label: "Llama 3.2 90B Vision", value: "meta-llama/llama-3.2-90b-vision-instruct:free" },
  { label: "Llama 3.2 11B Vision", value: "meta-llama/llama-3.2-11b-vision-instruct:free" },
  { label: "Llama 3.2 3B Instruct", value: "meta-llama/llama-3.2-3b-instruct:free" },
  { label: "Llama 3.2 1B Instruct", value: "meta-llama/llama-3.2-1b-instruct:free" },
  // ── Google ────────────────────────────────────────────────────
  { label: "Gemini 2.5 Pro Exp", value: "google/gemini-2.5-pro-exp-03-25:free" },
  { label: "Gemini 2.0 Flash Thinking", value: "google/gemini-2.0-flash-thinking-exp:free" },
  { label: "Gemini 2.0 Flash Lite", value: "google/gemini-2.0-flash-lite-001:free" },
  { label: "Gemma 3 27B", value: "google/gemma-3-27b-it:free" },
  { label: "Gemma 3 12B", value: "google/gemma-3-12b-it:free" },
  { label: "Gemma 3 4B", value: "google/gemma-3-4b-it:free" },
  { label: "Gemma 3 1B", value: "google/gemma-3-1b-it:free" },
  { label: "Gemma 2 9B", value: "google/gemma-2-9b-it:free" },
  // ── Mistral ───────────────────────────────────────────────────
  { label: "Mistral Small 3.2 24B", value: "mistralai/mistral-small-3.2-24b-instruct:free" },
  { label: "Mistral Small 3.1 24B", value: "mistralai/mistral-small-3.1-24b-instruct:free" },
  { label: "Mistral 7B Instruct", value: "mistralai/mistral-7b-instruct:free" },
  { label: "Mixtral 8x7B Instruct", value: "mistralai/mixtral-8x7b-instruct:free" },
  // ── Microsoft ─────────────────────────────────────────────────
  { label: "Phi 4", value: "microsoft/phi-4:free" },
  { label: "Phi 4 Multimodal Instruct", value: "microsoft/phi-4-multimodal-instruct:free" },
  { label: "Phi 4 Reasoning Plus", value: "microsoft/phi-4-reasoning-plus:free" },
  { label: "Phi 3.5 Mini Instruct", value: "microsoft/phi-3.5-mini-128k-instruct:free" },
  { label: "WizardLM 2 8x22B", value: "microsoft/wizardlm-2-8x22b:free" },
  // ── NVIDIA ────────────────────────────────────────────────────
  { label: "Llama 3.1 Nemotron 70B Instruct", value: "nvidia/llama-3.1-nemotron-70b-instruct:free" },
  { label: "Llama 3.3 Nemotron Super 49B", value: "nvidia/llama-3.3-nemotron-super-49b-v1:free" },
  // ── Nous Research ─────────────────────────────────────────────
  { label: "Hermes 3 405B", value: "nousresearch/hermes-3-llama-3.1-405b:free" },
  { label: "Hermes 3 70B", value: "nousresearch/hermes-3-llama-3.1-70b:free" },
  // ── Cohere ────────────────────────────────────────────────────
  { label: "Command R7B (Dec 2024)", value: "cohere/command-r7b-12-2024:free" },
  // ── Alibaba ───────────────────────────────────────────────────
  { label: "Marco O1", value: "alibaba/marco-o1:free" },
  // ── 01.AI ─────────────────────────────────────────────────────
  { label: "Yi Lightning", value: "01-ai/yi-lightning:free" },
  // ── Reka ──────────────────────────────────────────────────────
  { label: "Reka Flash 21B", value: "rekaai/reka-flash-21b:free" },
  // ── Hugging Face ──────────────────────────────────────────────
  { label: "Zephyr 7B Beta", value: "huggingfaceh4/zephyr-7b-beta:free" },
  // ── Moonshot (stable) ─────────────────────────────────────────
  { label: "Kimi VL A3B Thinking", value: "moonshotai/kimi-vl-a3b-thinking:free" },
  // ── TNG ───────────────────────────────────────────────────────
  { label: "DeepSeek R1T Chimera", value: "tngtech/deepseek-r1t-chimera:free" },
  // ── Featherless ───────────────────────────────────────────────
  { label: "Llama 3.1 405B Base", value: "featherless/llama-3.1-405b-base:free" },
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
  const [defaultModel, setDefaultModel] = useState(s?.defaultModel || "openrouter/auto");
  const [geminiKey, setGeminiKey] = useState(s?.geminiApiKey || "");
  const [groqKey, setGroqKey] = useState(s?.groqApiKey || "");
  const [groqModel, setGroqModel] = useState(s?.groqModel || "llama-3.3-70b-versatile");
  const [githubModelsKey, setGithubModelsKey] = useState(s?.githubModelsKey || "");
  const [githubModelsModel, setGithubModelsModel] = useState(s?.githubModelsModel || "gpt-4o");

  const handleSave = () => {
    save.mutate({
      openRouterApiKey: openRouterKey,
      defaultModel,
      geminiApiKey: geminiKey,
      geminiModel: "gemini-1.5-flash",
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

        {/* OpenRouter */}
        <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 space-y-3">
          <p className="text-xs font-semibold text-violet-300">OpenRouter</p>
          <FieldGroup label="API Key">
            <Input value={openRouterKey} onChange={(e) => setOpenRouterKey(e.target.value)} placeholder="sk-or-..." type="password" className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Model">
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="w-full h-8 bg-card border border-border rounded-md px-2 text-xs text-foreground"
            >
              {OPENROUTER_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">Sare OpenRouter free models — ⭐ wale recommended hain</p>
          </FieldGroup>
        </div>

        {/* Gemini */}
        <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-3">
          <p className="text-xs font-semibold text-blue-300">Google Gemini</p>
          <FieldGroup label="API Key">
            <Input value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIzaSy..." type="password" className="h-8 text-xs" />
          </FieldGroup>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-blue-500/20 bg-blue-500/5">
            <span className="text-xs text-blue-300 font-medium">Model:</span>
            <span className="text-xs text-foreground font-mono">gemini-1.5-flash</span>
            <span className="ml-auto text-[10px] text-blue-400/70">Free tier supported ✓</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Gemini free mein sirf 1.5-flash supported hai</p>
        </div>

        {/* Groq */}
        <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 space-y-3">
          <p className="text-xs font-semibold text-orange-300">Groq</p>
          <FieldGroup label="API Key">
            <Input value={groqKey} onChange={(e) => setGroqKey(e.target.value)} placeholder="gsk_..." type="password" className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Model">
            <Input value={groqModel} onChange={(e) => setGroqModel(e.target.value)} placeholder="llama-3.3-70b-versatile" className="h-8 text-xs" />
          </FieldGroup>
        </div>

        {/* GitHub Models */}
        <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5 space-y-3">
          <p className="text-xs font-semibold text-green-300">GitHub Models</p>
          <FieldGroup label="Token">
            <Input value={githubModelsKey} onChange={(e) => setGithubModelsKey(e.target.value)} placeholder="ghp_..." type="password" className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Model">
            <Input value={githubModelsModel} onChange={(e) => setGithubModelsModel(e.target.value)} placeholder="gpt-4o" className="h-8 text-xs" />
          </FieldGroup>
        </div>

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
        <div className="mt-3 p-3 rounded-lg" style={{ background: "oklch(0.08 0.02 280)" }}>
          <p className="text-[10px] text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} BrainForge — Made by <span className="text-foreground font-medium">Pinka</span>
          </p>
        </div>
      </div>
    </div>
  );
}
