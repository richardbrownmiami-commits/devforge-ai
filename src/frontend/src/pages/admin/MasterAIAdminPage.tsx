import {
  Bot,
  ChevronDown,
  FileText,
  Github,
  Loader2,
  Rocket,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const GH_REPO = "richardbrownmiami-commits/devforge-ai";
const MASTER_AI_SYSTEM = `You are Ara, the Master AI for BrainForge.
Your job is to help maintain and improve BrainForge.
Repo: ${GH_REPO}
Live: brainforge-7xn.pages.dev
You can read GitHub files and suggest code changes.
Always ask before making changes. Show diffs when possible.
You have deep knowledge of the BrainForge codebase: React, TypeScript, Tailwind, Cloudflare Workers/D1, GitHub Actions.`;

interface Msg {
  role: "user" | "assistant";
  content: string;
  id: string;
}

function getSettings() {
  return JSON.parse(localStorage.getItem("bf_settings") || "{}");
}
function getGHToken() {
  return (
    getSettings().githubToken || "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"
  );
}

const PROVIDERS = [
  {
    id: "openrouter",
    label: "OpenRouter",
    models: [
      "meta-llama/llama-3.3-70b-instruct:free",
      "deepseek/deepseek-chat:free",
      "google/gemini-2.0-flash-exp:free",
    ],
  },
  {
    id: "gemini",
    label: "Gemini",
    models: ["gemini-2.0-flash", "gemini-1.5-pro"],
  },
  {
    id: "groq",
    label: "Groq",
    models: ["llama-3.3-70b-versatile", "qwen-qwq-32b"],
  },
];

function GHFileModal({ onClose }: { onClose: () => void }) {
  const [path, setPath] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const readFile = async () => {
    if (!path) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GH_REPO}/contents/${path}`,
        { headers: { Authorization: `token ${getGHToken()}` } },
      );
      const data = await res.json();
      if (data.content) setContent(atob(data.content.replace(/\n/g, "")));
      else setContent("File not found or empty");
    } catch {
      setContent("Failed to fetch");
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 0.7)" }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-5 space-y-4"
        style={{
          background: "oklch(0.10 0.025 280)",
          border: "1px solid oklch(0.25 0.10 280)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Read GitHub File
          </h3>
          <button type="button" onClick={onClose}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="e.g. src/frontend/src/App.tsx"
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={readFile}
            disabled={loading}
            className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
            style={{ background: "oklch(0.55 0.25 280)" }}
            data-ocid="admin.master_ai.read_file_button"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Read"}
          </button>
        </div>
        {content && (
          <pre className="text-[10px] font-mono bg-black/40 rounded-lg p-3 overflow-auto max-h-64 text-green-300 border border-white/5">
            {content}
          </pre>
        )}
        {content && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(content);
              toast.success("Copied!");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Copy to clipboard
          </button>
        )}
      </div>
    </div>
  );
}

function PushModal({ onClose }: { onClose: () => void }) {
  const [path, setPath] = useState("");
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState("Update via Admin Master AI");
  const [loading, setLoading] = useState(false);

  const push = async () => {
    if (!path || !content) return;
    setLoading(true);
    try {
      const token = getGHToken();
      // Get SHA first
      const existing = await fetch(
        `https://api.github.com/repos/${GH_REPO}/contents/${path}`,
        { headers: { Authorization: `token ${token}` } },
      )
        .then((r) => r.json())
        .catch(() => ({}));
      const sha = existing.sha;
      const res = await fetch(
        `https://api.github.com/repos/${GH_REPO}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: msg,
            content: btoa(unescape(encodeURIComponent(content))),
            ...(sha ? { sha } : {}),
          }),
        },
      );
      if (res.ok) {
        toast.success("Pushed to GitHub!");
        onClose();
      } else {
        const e = await res.json();
        toast.error(e.message || "Push failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 0.7)" }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-5 space-y-4"
        style={{
          background: "oklch(0.10 0.025 280)",
          border: "1px solid oklch(0.25 0.10 280)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Push to GitHub
          </h3>
          <button type="button" onClick={onClose}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="File path (e.g. memories/master-ai-memory.md)"
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="File content..."
          rows={8}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none font-mono resize-none"
        />
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Commit message"
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground"
            data-ocid="admin.push_modal.cancel_button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={push}
            disabled={loading || !path || !content}
            className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
            style={{ background: "oklch(0.55 0.25 280)" }}
            data-ocid="admin.push_modal.confirm_button"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Push to GitHub"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MasterAIAdminPage() {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("bf_master_ai_history") || "[]",
      );
      return stored.map((m: any, i: number) => ({
        ...m,
        id: m.id || `stored-${i}`,
      }));
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("openrouter");
  const [model, setModel] = useState(PROVIDERS[0].models[0]);
  const [showRead, setShowRead] = useState(false);
  const [showPush, setShowPush] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: endRef is stable
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const toStore = messages
      .slice(-20)
      .map(({ role, content, id }) => ({ role, content, id }));
    localStorage.setItem("bf_master_ai_history", JSON.stringify(toStore));
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = {
      role: "user",
      content: input.trim(),
      id: `u-${Date.now()}`,
    };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);
    const s = getSettings();

    try {
      let reply = "";
      const history = [...messages.slice(-18), userMsg];

      if (provider === "gemini") {
        const key = s.geminiKey;
        if (!key) throw new Error("No Gemini API key in Settings");
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${MASTER_AI_SYSTEM}\n\n${history.map((m) => `${m.role === "user" ? "User" : "Ara"}: ${m.content}`).join("\n")}`,
                    },
                  ],
                },
              ],
            }),
          },
        );
        const d = await res.json();
        reply = d.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
      } else if (provider === "groq") {
        const key = s.groqKey;
        if (!key) throw new Error("No Groq API key in Settings");
        const res = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: MASTER_AI_SYSTEM },
                ...history.map((m) => ({ role: m.role, content: m.content })),
              ],
            }),
          },
        );
        const d = await res.json();
        reply = d.choices?.[0]?.message?.content || "No response";
      } else {
        const key = s.openrouterKey;
        if (!key) throw new Error("No OpenRouter API key in Settings");
        const res = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://brainforge-7xn.pages.dev",
              "X-Title": "BrainForge Admin",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: MASTER_AI_SYSTEM },
                ...history.map((m) => ({ role: m.role, content: m.content })),
              ],
            }),
          },
        );
        const d = await res.json();
        reply =
          d.choices?.[0]?.message?.content || d.error?.message || "No response";
      }

      setMessages((p) => [
        ...p,
        { role: "assistant", content: reply, id: `a-${Date.now()}` },
      ]);
    } catch (e: any) {
      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          content: `❌ Error: ${e.message}`,
          id: `err-${Date.now()}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, provider, model]);

  const triggerDeploy = async () => {
    const token = getGHToken();
    const res = await fetch(
      `https://api.github.com/repos/${GH_REPO}/actions/workflows/deploy.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );
    if (res.ok || res.status === 204) toast.success("Deploy triggered!");
    else toast.error("Failed to trigger deploy");
  };

  const accentColor = "oklch(0.65 0.25 280)";
  const currentModels = PROVIDERS.find((p) => p.id === provider)?.models || [];

  return (
    <div className="flex flex-col h-full" data-ocid="admin.master_ai.page">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{
          borderBottom: "1px solid oklch(0.18 0.06 280)",
          background: "oklch(0.08 0.025 280)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "oklch(0.55 0.25 280 / 0.15)",
              border: "1px solid oklch(0.55 0.25 280 / 0.3)",
            }}
          >
            <Bot className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Master AI — Ara
            </p>
            <p className="text-[10px] text-muted-foreground">
              BrainForge maintenance AI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ background: "oklch(0.12 0.03 280)" }}
          >
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setModel(
                  PROVIDERS.find((p) => p.id === e.target.value)?.models[0] ||
                    "",
                );
              }}
              className="bg-transparent text-[10px] text-foreground focus:outline-none"
              data-ocid="admin.master_ai.provider.select"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ background: "oklch(0.12 0.03 280)" }}
          >
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-transparent text-[10px] text-foreground focus:outline-none max-w-28"
              data-ocid="admin.master_ai.model.select"
            >
              {currentModels.map((m) => (
                <option key={m} value={m}>
                  {m.split("/").pop()?.replace(":free", "") || m}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setMessages([])}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition-colors"
            title="Clear chat"
            data-ocid="admin.master_ai.clear_button"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action bar */}
      <div
        className="px-4 py-2 flex items-center gap-2 shrink-0"
        style={{
          borderBottom: "1px solid oklch(0.15 0.05 280)",
          background: "oklch(0.07 0.02 280)",
        }}
      >
        <button
          type="button"
          onClick={() => setShowRead(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
          style={{
            background: "oklch(0.18 0.05 220 / 0.3)",
            color: "oklch(0.65 0.18 220)",
            border: "1px solid oklch(0.65 0.18 220 / 0.2)",
          }}
          data-ocid="admin.master_ai.read_github_button"
        >
          <FileText className="w-3 h-3" />
          Read GitHub File
        </button>
        <button
          type="button"
          onClick={() => setShowPush(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
          style={{
            background: "oklch(0.18 0.05 140 / 0.3)",
            color: "oklch(0.65 0.18 140)",
            border: "1px solid oklch(0.65 0.18 140 / 0.2)",
          }}
          data-ocid="admin.master_ai.push_github_button"
        >
          <Github className="w-3 h-3" />
          Push to GitHub
        </button>
        <button
          type="button"
          onClick={triggerDeploy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
          style={{
            background: "oklch(0.18 0.05 280 / 0.3)",
            color: accentColor,
            border: "1px solid oklch(0.55 0.25 280 / 0.2)",
          }}
          data-ocid="admin.master_ai.deploy_button"
        >
          <Rocket className="w-3 h-3" />
          Trigger Deploy
        </button>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full py-16 space-y-3"
            data-ocid="admin.master_ai.empty_state"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "oklch(0.55 0.25 280 / 0.1)",
                border: "1px solid oklch(0.55 0.25 280 / 0.2)",
              }}
            >
              <Bot className="w-7 h-7" style={{ color: accentColor }} />
            </div>
            <p className="text-sm font-medium text-foreground">Ara is ready</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Ask me to review code, suggest improvements, update files, or
              trigger deploys.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            data-ocid="admin.master_ai.item.1"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{
                background:
                  m.role === "user"
                    ? "oklch(0.65 0.25 280 / 0.2)"
                    : "oklch(0.55 0.18 160 / 0.2)",
                border: `1px solid ${m.role === "user" ? "oklch(0.65 0.25 280 / 0.3)" : "oklch(0.55 0.18 160 / 0.3)"}`,
              }}
            >
              {m.role === "user" ? (
                <User className="w-3.5 h-3.5" style={{ color: accentColor }} />
              ) : (
                <Bot
                  className="w-3.5 h-3.5"
                  style={{ color: "oklch(0.65 0.18 160)" }}
                />
              )}
            </div>
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3"
              style={{
                background:
                  m.role === "user"
                    ? "oklch(0.55 0.25 280 / 0.12)"
                    : "oklch(0.12 0.025 280)",
                border: `1px solid ${m.role === "user" ? "oklch(0.55 0.25 280 / 0.25)" : "oklch(0.20 0.06 280)"}`,
              }}
            >
              <pre className="text-xs text-foreground whitespace-pre-wrap font-sans">
                {m.content}
              </pre>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: "oklch(0.55 0.18 160 / 0.2)",
                border: "1px solid oklch(0.55 0.18 160 / 0.3)",
              }}
            >
              <Bot
                className="w-3.5 h-3.5"
                style={{ color: "oklch(0.65 0.18 160)" }}
              />
            </div>
            <div
              className="rounded-2xl px-4 py-3"
              style={{
                background: "oklch(0.12 0.025 280)",
                border: "1px solid oklch(0.20 0.06 280)",
              }}
              data-ocid="admin.master_ai.loading_state"
            >
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: accentColor }}
              />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: "1px solid oklch(0.18 0.06 280)" }}
      >
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask Ara to review code, suggest features, update files..."
            rows={2}
            className="flex-1 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none resize-none"
            style={{
              background: "oklch(0.10 0.025 280)",
              border: "1px solid oklch(0.25 0.10 280)",
            }}
            data-ocid="admin.master_ai.input"
          />
          <button
            type="button"
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-3 rounded-xl text-white transition-all disabled:opacity-40"
            style={{ background: "oklch(0.55 0.25 280)" }}
            data-ocid="admin.master_ai.submit_button"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      {showRead && <GHFileModal onClose={() => setShowRead(false)} />}
      {showPush && <PushModal onClose={() => setShowPush(false)} />}
    </div>
  );
}
