import { useCallback, useEffect, useRef, useState } from "react";
import type { AIProvider } from "../constants/models";
import {
  idbGet,
  idbRemove,
  idbSet,
  pullSessionFromGitHub,
  pushSessionToGitHub,
} from "../utils/storage";
import type { ChatMessage } from "./useTermux";

// ---- CAFFEINE-STYLE SYSTEM PROMPT ----
const SYSTEM_PROMPT = `You are an expert web app builder. You build complete, working, beautiful apps.

CRITICAL RULES:
1. ALWAYS return a COMPLETE, self-contained single HTML file with ALL CSS and JS embedded inside it.
2. Wrap the entire output in ONE code block: \`\`\`html ... \`\`\`
3. Never return partial code or code snippets. Every response must be a fully working app.
4. Make it visually polished: modern design, good typography, smooth animations, responsive layout.
5. Use only vanilla HTML/CSS/JS (no external CDN unless user specifically asks).
6. When fixing an error, return the COMPLETE corrected HTML file -- not just the fixed part.
7. Keep your text explanation SHORT (1-2 sentences max), then provide the complete code.
8. Make the app actually functional -- buttons work, forms submit, UI responds to interactions.
9. Use CSS custom properties, flexbox/grid, and modern JS (ES6+).
10. Default to dark theme with good contrast unless user specifies otherwise.

EXAMPLE RESPONSE FORMAT:
Here is your todo app with local storage support.
\`\`\`html
<!DOCTYPE html>
<html lang="en">
...(complete app)...
</html>
\`\`\`

NEVER:
- Return only CSS or only JS without the full HTML structure
- Leave placeholders like "// add your code here"
- Return multiple separate code blocks for one app
- Explain what to do instead of doing it`;

// Free OpenRouter models tried in sequence on rate limit
const OR_FALLBACKS = [
  "qwen/qwen3-coder:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "openai/gpt-oss-120b:free",
];

const GEMINI_FALLBACKS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
const GROQ_FALLBACKS = ["llama-3.3-70b-versatile", "qwen-qwq-32b", "llama-3.1-8b-instant"];

function storageKey(name: string) { return `bf_chat_${name}`; }

export function loadChatMessages(name: string): ChatMessage[] {
  if (!name) return [];
  try {
    const raw = localStorage.getItem(storageKey(name));
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {}
  return [];
}

export async function loadChatMessagesAsync(name: string): Promise<ChatMessage[]> {
  if (!name) return [];
  try {
    const raw = await idbGet(storageKey(name));
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {}
  return [];
}

function persist(name: string, msgs: ChatMessage[]) {
  const data = JSON.stringify(msgs.slice(-200));
  idbSet(storageKey(name), data).catch(() => {
    try { localStorage.setItem(storageKey(name), data); } catch {}
  });
  try { localStorage.setItem(storageKey(name), JSON.stringify(msgs.slice(-50))); } catch {}
}

let _sessionPushTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSessionPush(name: string, msgs: ChatMessage[]) {
  if (_sessionPushTimer) clearTimeout(_sessionPushTimer);
  _sessionPushTimer = setTimeout(() => { pushSessionToGitHub(name, msgs).catch(() => {}); }, 5000);
}

// ---- OpenRouter ----
async function tryOpenRouter(key: string, model: string, history: { role: string; content: string }[], signal: AbortSignal): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://brainforge-7xn.pages.dev", "X-Title": "BrainForge" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history], stream: false }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("Invalid OpenRouter API key. Go to Settings \u2192 API Keys.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `OpenRouter error ${res.status}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("RATE_LIMITED");
  return content;
}

async function openRouterWithFallback(key: string, preferred: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void): Promise<string> {
  const candidates = [preferred, ...OR_FALLBACKS.filter(m => m !== preferred)];
  for (const model of candidates) {
    if (signal.aborted) break;
    onModel(model.split("/").pop()?.replace(":free", "") ?? model);
    try { return await tryOpenRouter(key, model, history, signal); }
    catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      if (e instanceof Error && e.message === "RATE_LIMITED") continue;
      throw e;
    }
  }
  throw new Error("RATE_LIMITED");
}

// ---- Gemini ----
async function tryGeminiModel(key: string, model: string, history: { role: string; content: string }[], signal: AbortSignal): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: history.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 8192 },
    }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) throw new Error("Invalid Gemini API key. Go to Settings \u2192 API Keys.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("RATE_LIMITED");
  return text;
}

async function geminiWithFallback(key: string, preferred: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void): Promise<string> {
  const candidates = [preferred, ...GEMINI_FALLBACKS.filter(m => m !== preferred)];
  for (const model of candidates) {
    if (signal.aborted) break;
    onModel(`Gemini (${model})`);
    try { return await tryGeminiModel(key, model, history, signal); }
    catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      if (e instanceof Error && e.message === "RATE_LIMITED") continue;
      throw e;
    }
  }
  throw new Error("RATE_LIMITED");
}

// ---- Groq ----
async function tryGroqModel(key: string, model: string, history: { role: string; content: string }[], signal: AbortSignal): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history], stream: false }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("Invalid Groq API key. Go to Settings \u2192 API Keys.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `Groq error ${res.status}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("RATE_LIMITED");
  return content;
}

async function groqWithFallback(key: string, preferred: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void): Promise<string> {
  const candidates = [preferred, ...GROQ_FALLBACKS.filter(m => m !== preferred)];
  for (const model of candidates) {
    if (signal.aborted) break;
    onModel(`Groq (${model})`);
    try { return await tryGroqModel(key, model, history, signal); }
    catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      if (e instanceof Error && e.message === "RATE_LIMITED") continue;
      throw e;
    }
  }
  throw new Error("RATE_LIMITED");
}

// ---- GitHub Models ----
async function tryGitHubModel(token: string, model: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void): Promise<string> {
  onModel(`GitHub (${model})`);
  const res = await fetch("https://models.inference.ai.azure.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history], stream: false }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("Invalid GitHub Models token. Go to Settings \u2192 API Keys.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `GitHub Models error ${res.status}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("RATE_LIMITED");
  return content;
}

interface UseAIChatOptions {
  provider: AIProvider;
  openRouterKey: string; openRouterModel: string;
  geminiKey: string; geminiModel: string;
  groqKey: string; groqModel: string;
  githubModelsKey: string; githubModelsModel: string;
  projectName: string;
}

export function useAIChat(opts: UseAIChatOptions) {
  const { provider, openRouterKey, openRouterModel, geminiKey, geminiModel, groqKey, groqModel, githubModelsKey, githubModelsModel, projectName } = opts;

  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatMessages(projectName));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const projectRef = useRef(projectName);

  useEffect(() => {
    if (projectRef.current !== projectName) {
      projectRef.current = projectName;
      const local = loadChatMessages(projectName);
      if (local.length > 0) { setMessages(local); }
      else {
        loadChatMessagesAsync(projectName).then(async (idbMsgs) => {
          if (idbMsgs.length > 0) { setMessages(idbMsgs); }
          else {
            const ghMsgs = await pullSessionFromGitHub(projectName).catch(() => null);
            if (ghMsgs && ghMsgs.length > 0) {
              const msgs = ghMsgs as ChatMessage[];
              setMessages(msgs);
              persist(projectName, msgs);
            }
          }
        });
      }
      setError(null); setActiveModel("");
    }
  }, [projectName]);

  const sendMessage = useCallback(async (message: string) => {
    setError(null);
    const userMsg: ChatMessage = { role: "user", content: message };
    const prev = loadChatMessages(projectName);
    const next = [...prev, userMsg];
    setMessages(next);
    persist(projectName, next);
    setIsLoading(true); setActiveModel("");

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    const history = next.map(m => ({ role: m.role, content: m.content }));

    try {
      let reply = "";

      if (provider === "groq") {
        if (!groqKey) throw new Error("No Groq API key. Go to Settings \u2192 API Keys.");
        reply = await groqWithFallback(groqKey, groqModel, history, signal, setActiveModel);
      } else if (provider === "github") {
        if (!githubModelsKey) throw new Error("No GitHub Models token. Go to Settings \u2192 API Keys.");
        reply = await tryGitHubModel(githubModelsKey, githubModelsModel, history, signal, setActiveModel);
      } else if (provider === "gemini") {
        if (!geminiKey) throw new Error("No Gemini API key. Go to Settings \u2192 API Keys.");
        reply = await geminiWithFallback(geminiKey, geminiModel, history, signal, setActiveModel);
      } else if (provider === "auto") {
        type P = { name: string; call: () => Promise<string> };
        const queue: P[] = [];
        if (openRouterKey) queue.push({ name: "OpenRouter", call: () => openRouterWithFallback(openRouterKey, openRouterModel, history, signal, setActiveModel) });
        if (geminiKey) queue.push({ name: "Gemini", call: () => geminiWithFallback(geminiKey, geminiModel, history, signal, setActiveModel) });
        if (groqKey) queue.push({ name: "Groq", call: () => groqWithFallback(groqKey, groqModel, history, signal, setActiveModel) });
        if (githubModelsKey) queue.push({ name: "GitHub", call: () => tryGitHubModel(githubModelsKey, githubModelsModel, history, signal, setActiveModel) });
        if (queue.length === 0) throw new Error("No API keys configured. Go to Settings \u2192 API Keys and add at least one.");
        let succeeded = false;
        const tried: string[] = [];
        for (const p of queue) {
          if (signal.aborted) break;
          tried.push(p.name);
          try { reply = await p.call(); succeeded = true; break; }
          catch (e: unknown) {
            if (e instanceof Error && e.name === "AbortError") throw e;
            if (e instanceof Error && e.message === "RATE_LIMITED") continue;
            throw e;
          }
        }
        if (!succeeded) throw new Error(`All providers rate limited (tried: ${tried.join(", ")}). Wait a minute and try again.`);
      } else {
        if (!openRouterKey) throw new Error("No OpenRouter API key. Go to Settings \u2192 API Keys.");
        reply = await openRouterWithFallback(openRouterKey, openRouterModel, history, signal, setActiveModel);
      }

      const replyMsg: ChatMessage = { role: "assistant", content: reply };
      setMessages(p => {
        const n = [...p, replyMsg];
        persist(projectName, n);
        scheduleSessionPush(projectName, n);
        return n;
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
      setActiveModel("");
    } finally {
      setIsLoading(false);
    }
  }, [provider, openRouterKey, openRouterModel, geminiKey, geminiModel, groqKey, groqModel, githubModelsKey, githubModelsModel, projectName]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    persist(projectName, []);
    idbRemove(storageKey(projectName)).catch(() => {});
    setError(null); setActiveModel("");
  }, [projectName]);

  return { messages, isLoading, error, activeProvider: activeModel, sendMessage, clearMessages };
}
