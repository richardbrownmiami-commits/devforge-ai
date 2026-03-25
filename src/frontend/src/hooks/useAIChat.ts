import { useCallback, useEffect, useRef, useState } from "react";
import type { AIProvider } from "../constants/models";
import { idbGet, idbRemove, idbSet, pullSessionFromGitHub, pushSessionToGitHub } from "../utils/storage";
import type { ChatMessage } from "./useTermux";

const SYSTEM_PROMPT = `You are an expert web app builder. You build complete, working, beautiful apps.

CRITICAL RULES:
1. ALWAYS return a COMPLETE, self-contained single HTML file with ALL CSS and JS embedded inside it.
2. Wrap the entire output in ONE code block: \`\`\`html ... \`\`\`
3. Never return partial code or snippets. Every response must be a fully working app.
4. Make it visually polished: modern design, good typography, smooth animations, responsive layout.
5. Use only vanilla HTML/CSS/JS (no external CDN unless user specifically asks).
6. When fixing an error, return the COMPLETE corrected HTML file.
7. Keep explanation SHORT (1-2 sentences max), then provide the complete code.
8. Make the app actually functional -- buttons work, forms submit, UI responds.
9. Use CSS custom properties, flexbox/grid, and modern JS (ES6+).
10. Default to dark theme with good contrast unless user specifies otherwise.

FORMAT:
Brief description (1-2 sentences).
\`\`\`html
<!DOCTYPE html>
<html lang="en">
...(complete working app)...
</html>
\`\`\``;

const OR_FALLBACKS = ["qwen/qwen3-coder:free", "meta-llama/llama-3.3-70b-instruct:free", "google/gemma-3-27b-it:free", "mistralai/mistral-small-3.1-24b-instruct:free"];
const GEMINI_FALLBACKS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
const GROQ_FALLBACKS = ["llama-3.3-70b-versatile", "qwen-qwq-32b", "llama-3.1-8b-instant"];

function storageKey(name: string) { return `bf_chat_${name}`; }

export function loadChatMessages(name: string): ChatMessage[] {
  if (!name) return [];
  try { const raw = localStorage.getItem(storageKey(name)); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

export async function loadChatMessagesAsync(name: string): Promise<ChatMessage[]> {
  if (!name) return [];
  try { const raw = await idbGet(storageKey(name)); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

function persist(name: string, msgs: ChatMessage[]) {
  const data = JSON.stringify(msgs.slice(-200));
  idbSet(storageKey(name), data).catch(() => { try { localStorage.setItem(storageKey(name), data); } catch {} });
  try { localStorage.setItem(storageKey(name), JSON.stringify(msgs.slice(-50))); } catch {}
}

let _timer: ReturnType<typeof setTimeout> | null = null;
function scheduleSessionPush(name: string, msgs: ChatMessage[]) {
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => { pushSessionToGitHub(name, msgs).catch(() => {}); }, 5000);
}

async function tryOpenRouter(key: string, model: string, history: { role: string; content: string }[], signal: AbortSignal): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://brainforge-7xn.pages.dev", "X-Title": "BrainForge" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history], stream: false }), signal,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); if (res.status === 429) throw new Error("RATE_LIMITED"); throw new Error(e?.error?.message || `OpenRouter ${res.status}`); }
  const d = await res.json(); const c = d.choices?.[0]?.message?.content; if (!c) throw new Error("RATE_LIMITED"); return c;
}

async function openRouterWithFallback(key: string, preferred: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void): Promise<string> {
  for (const m of [preferred, ...OR_FALLBACKS.filter(x => x !== preferred)]) {
    if (signal.aborted) break;
    onModel(m.split("/").pop()?.replace(":free", "") ?? m);
    try { return await tryOpenRouter(key, m, history, signal); }
    catch (e: unknown) { if (e instanceof Error && e.name === "AbortError") throw e; if (e instanceof Error && e.message === "RATE_LIMITED") continue; throw e; }
  }
  throw new Error("RATE_LIMITED");
}

async function tryGemini(key: string, model: string, history: { role: string; content: string }[], signal: AbortSignal): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system_instruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents: history.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: 8192 } }), signal,
  });
  if (!res.ok) { if (res.status === 429) throw new Error("RATE_LIMITED"); throw new Error(`Gemini ${res.status}`); }
  const d = await res.json(); const t = d.candidates?.[0]?.content?.parts?.[0]?.text; if (!t) throw new Error("RATE_LIMITED"); return t;
}

async function geminiWithFallback(key: string, preferred: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void): Promise<string> {
  for (const m of [preferred, ...GEMINI_FALLBACKS.filter(x => x !== preferred)]) {
    if (signal.aborted) break; onModel(`Gemini(${m})`);
    try { return await tryGemini(key, m, history, signal); }
    catch (e: unknown) { if (e instanceof Error && e.name === "AbortError") throw e; if (e instanceof Error && e.message === "RATE_LIMITED") continue; throw e; }
  }
  throw new Error("RATE_LIMITED");
}

async function tryGroq(key: string, model: string, history: { role: string; content: string }[], signal: AbortSignal): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history], stream: false }), signal,
  });
  if (!res.ok) { if (res.status === 429) throw new Error("RATE_LIMITED"); throw new Error(`Groq ${res.status}`); }
  const d = await res.json(); const c = d.choices?.[0]?.message?.content; if (!c) throw new Error("RATE_LIMITED"); return c;
}

async function groqWithFallback(key: string, preferred: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void): Promise<string> {
  for (const m of [preferred, ...GROQ_FALLBACKS.filter(x => x !== preferred)]) {
    if (signal.aborted) break; onModel(`Groq(${m})`);
    try { return await tryGroq(key, m, history, signal); }
    catch (e: unknown) { if (e instanceof Error && e.name === "AbortError") throw e; if (e instanceof Error && e.message === "RATE_LIMITED") continue; throw e; }
  }
  throw new Error("RATE_LIMITED");
}

async function tryGitHub(token: string, model: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void): Promise<string> {
  onModel(`GitHub(${model})`);
  const res = await fetch("https://models.inference.ai.azure.com/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history], stream: false }), signal,
  });
  if (!res.ok) { if (res.status === 429) throw new Error("RATE_LIMITED"); throw new Error(`GitHub ${res.status}`); }
  const d = await res.json(); const c = d.choices?.[0]?.message?.content; if (!c) throw new Error("RATE_LIMITED"); return c;
}

interface UseAIChatOptions {
  provider: AIProvider; openRouterKey: string; openRouterModel: string;
  geminiKey: string; geminiModel: string; groqKey: string; groqModel: string;
  githubModelsKey: string; githubModelsModel: string; projectName: string;
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
        loadChatMessagesAsync(projectName).then(async (idb) => {
          if (idb.length > 0) { setMessages(idb); }
          else { const gh = await pullSessionFromGitHub(projectName).catch(() => null); if (gh?.length) { setMessages(gh as ChatMessage[]); persist(projectName, gh as ChatMessage[]); } }
        });
      }
      setError(null); setActiveModel("");
    }
  }, [projectName]);

  const sendMessage = useCallback(async (message: string) => {
    setError(null);
    const prev = loadChatMessages(projectName);
    const next = [...prev, { role: "user", content: message } as ChatMessage];
    setMessages(next); persist(projectName, next);
    setIsLoading(true); setActiveModel("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;
    const history = next.map(m => ({ role: m.role, content: m.content }));
    try {
      let reply = "";
      if (provider === "groq") {
        if (!groqKey) throw new Error("No Groq key. Go to Settings → API Keys.");
        reply = await groqWithFallback(groqKey, groqModel, history, signal, setActiveModel);
      } else if (provider === "github") {
        if (!githubModelsKey) throw new Error("No GitHub Models token. Go to Settings → API Keys.");
        reply = await tryGitHub(githubModelsKey, githubModelsModel, history, signal, setActiveModel);
      } else if (provider === "gemini") {
        if (!geminiKey) throw new Error("No Gemini key. Go to Settings → API Keys.");
        reply = await geminiWithFallback(geminiKey, geminiModel, history, signal, setActiveModel);
      } else if (provider === "auto") {
        const queue: { name: string; call: () => Promise<string> }[] = [];
        if (openRouterKey) queue.push({ name: "OpenRouter", call: () => openRouterWithFallback(openRouterKey, openRouterModel, history, signal, setActiveModel) });
        if (geminiKey) queue.push({ name: "Gemini", call: () => geminiWithFallback(geminiKey, geminiModel, history, signal, setActiveModel) });
        if (groqKey) queue.push({ name: "Groq", call: () => groqWithFallback(groqKey, groqModel, history, signal, setActiveModel) });
        if (githubModelsKey) queue.push({ name: "GitHub", call: () => tryGitHub(githubModelsKey, githubModelsModel, history, signal, setActiveModel) });
        if (!queue.length) throw new Error("No API keys. Go to Settings → API Keys.");
        let ok = false;
        for (const p of queue) {
          if (signal.aborted) break;
          try { reply = await p.call(); ok = true; break; }
          catch (e: unknown) { if (e instanceof Error && e.name === "AbortError") throw e; if (e instanceof Error && e.message === "RATE_LIMITED") continue; throw e; }
        }
        if (!ok) throw new Error("All providers rate limited. Wait and try again.");
      } else {
        if (!openRouterKey) throw new Error("No OpenRouter key. Go to Settings → API Keys.");
        reply = await openRouterWithFallback(openRouterKey, openRouterModel, history, signal, setActiveModel);
      }
      setMessages(p => { const n = [...p, { role: "assistant", content: reply } as ChatMessage]; persist(projectName, n); scheduleSessionPush(projectName, n); return n; });
    } catch (e: unknown) { if (e instanceof Error && e.name !== "AbortError") setError(e.message); setActiveModel(""); }
    finally { setIsLoading(false); }
  }, [provider, openRouterKey, openRouterModel, geminiKey, geminiModel, groqKey, groqModel, githubModelsKey, githubModelsModel, projectName]);

  const clearMessages = useCallback(() => {
    setMessages([]); persist(projectName, []); idbRemove(storageKey(projectName)).catch(() => {}); setError(null); setActiveModel("");
  }, [projectName]);

  return { messages, isLoading, error, activeProvider: activeModel, sendMessage, clearMessages };
}
