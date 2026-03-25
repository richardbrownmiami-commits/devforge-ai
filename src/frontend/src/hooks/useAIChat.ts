import { useCallback, useEffect, useRef, useState } from "react";
import type { AIProvider } from "../constants/models";
import { idbGet, idbRemove, idbSet, pullSessionFromGitHub, pushSessionToGitHub } from "../utils/storage";
import type { ChatMessage } from "./useTermux";

export type AppLanguage = "html" | "react" | "react-tailwind" | "typescript" | "python" | "sql" | "markdown" | "p5js" | "threejs" | "chartjs";

// ---- Language-specific system prompts ----
const PROMPTS: Record<AppLanguage, string> = {
  html: `You are an expert web app builder. Build complete, working, beautiful apps.

CRITICAL RULES:
1. ALWAYS return a COMPLETE, self-contained single HTML file with ALL CSS and JS embedded.
2. Wrap entire output in ONE code block: \`\`\`html ... \`\`\`
3. Never return partial code. Every response must be a fully working app.
4. Make it visually polished: modern design, smooth animations, responsive layout.
5. Use vanilla HTML/CSS/JS only (no external CDN unless user asks).
6. When fixing an error, return the COMPLETE corrected HTML file.
7. Keep explanation SHORT (1-2 sentences), then provide complete code.
8. Default to dark theme. Use CSS variables, flexbox/grid, ES6+.`,

  react: `You are an expert React developer. Build complete, working React apps.

CRITICAL RULES:
1. Return a COMPLETE single HTML file using React + Babel standalone (CDN).
2. Wrap entire output in ONE code block: \`\`\`html ... \`\`\`
3. ALWAYS include these CDN scripts in <head>:
   <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
   <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
   <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
4. Write ALL React code inside <script type="text/babel"> tags.
5. Always end with: ReactDOM.createRoot(document.getElementById('root')).render(<App />);
6. Use React hooks (useState, useEffect, useCallback, useMemo).
7. Keep explanation SHORT (1-2 sentences), then complete code.
8. Dark theme with inline CSS or <style> tag. Make it beautiful.

EXAMPLE:
\`\`\`html
<!DOCTYPE html><html><head>
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>body{margin:0;background:#0a0a0a;color:#fff;font-family:sans-serif}</style>
</head><body><div id="root"></div>
<script type="text/babel">
const { useState } = React;
const App = () => { ... };
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script></body></html>
\`\`\``,

  "react-tailwind": `You are an expert React + Tailwind CSS developer. Build complete, beautiful React apps.

CRITICAL RULES:
1. Return a COMPLETE single HTML file using React + Babel + Tailwind CDN.
2. Wrap entire output in ONE code block: \`\`\`html ... \`\`\`
3. ALWAYS include these CDN scripts in <head>:
   <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
   <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
   <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
   <script src="https://cdn.tailwindcss.com"></script>
4. Write ALL React code inside <script type="text/babel"> tags.
5. Use Tailwind classes extensively for styling -- NO custom CSS unless needed.
6. Always end with: ReactDOM.createRoot(document.getElementById('root')).render(<App />);
7. Use React hooks freely. Make the UI beautiful and polished.
8. Dark theme using Tailwind dark classes (bg-gray-900, text-white etc).
9. Keep explanation SHORT (1-2 sentences), then complete code.`,

  typescript: `You are an expert TypeScript developer. Build complete, type-safe web apps.

CRITICAL RULES:
1. Return a COMPLETE single HTML file using TypeScript via Babel standalone.
2. Wrap entire output in ONE code block: \`\`\`html ... \`\`\`
3. ALWAYS include these CDN scripts:
   <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
4. Write TypeScript code inside <script type="text/babel" data-type="module"> or <script type="text/babel" data-presets="typescript">.
5. Use proper TypeScript: interfaces, types, generics, strict typing.
6. No React needed -- vanilla TypeScript compiled by Babel.
7. Keep explanation SHORT (1-2 sentences), then complete code.
8. Dark theme. Modern design.

EXAMPLE:
\`\`\`html
<!DOCTYPE html><html><head>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>body{margin:0;background:#0a0a0a;color:#fff}</style>
</head><body>
<div id="app"></div>
<script type="text/babel" data-presets="typescript">
interface User { name: string; age: number; }
const greet = (user: User): string => \`Hello \${user.name}!\`;
document.getElementById('app')!.innerHTML = greet({ name: 'World', age: 25 });
</script></body></html>
\`\`\``,

  python: `You are an expert Python developer. Build Python apps that run in the browser via Pyodide.

CRITICAL RULES:
1. Return a COMPLETE single HTML file using Pyodide (Python in WebAssembly).
2. Wrap entire output in ONE code block: \`\`\`html ... \`\`\`
3. ALWAYS include Pyodide CDN in <head>: <script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"></script>
4. Load pyodide, run Python via pyodide.runPythonAsync(), show output in a div.
5. Show a loading spinner while Pyodide initializes.
6. Keep explanation SHORT (1-2 sentences), then complete code.
7. Dark theme. Make output display beautiful.`,

  sql: `You are an expert SQL developer. Build interactive SQL demos using sql.js.

CRITICAL RULES:
1. Return a COMPLETE single HTML file using sql.js (SQLite in browser).
2. Wrap entire output in ONE code block: \`\`\`html ... \`\`\`
3. ALWAYS include sql.js: <script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js"></script>
4. Create tables with sample data. Show results in styled HTML tables.
5. Add an interactive SQL input box for custom queries.
6. Handle errors (show message for invalid SQL).
7. Keep explanation SHORT (1-2 sentences), then complete code.
8. Dark theme. Look like a proper SQL client.`,

  markdown: `You are a Markdown expert. Create beautiful markdown documents with live preview.

CRITICAL RULES:
1. Return a COMPLETE single HTML file using marked.js.
2. Wrap entire output in ONE code block: \`\`\`html ... \`\`\`
3. ALWAYS include: <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
4. Split layout: LEFT = editable markdown textarea, RIGHT = live rendered preview.
5. Update preview in real-time as user types.
6. Include rich sample markdown (headings, lists, code, tables).
7. Keep explanation SHORT (1-2 sentences), then complete code.
8. Dark theme. Beautiful typography for the rendered output.`,


  p5js: `You are an expert creative coder using p5.js. Build beautiful animations, art, and interactive sketches.

CRITICAL RULES:
1. Return a COMPLETE single HTML file using p5.js CDN.
2. Wrap entire output in ONE code block: \`\`\`html ... \`\`\`
3. ALWAYS include: <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
4. Write p5.js sketch with setup() and draw() functions.
5. Make it visually stunning -- use colors, animations, particles, fractals.
6. Keep explanation SHORT (1-2 sentences), then complete code.
7. Dark background by default. Add interactivity (mouse, keyboard) when appropriate.`,

  threejs: `You are an expert 3D developer using Three.js. Build stunning 3D scenes and visualizations.

CRITICAL RULES:
1. Return a COMPLETE single HTML file using Three.js CDN.
2. Wrap entire output in ONE code block: \`\`\`html ... \`\`\`
3. ALWAYS include: <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
4. Create a WebGL scene with geometry, materials, lights, and animation loop.
5. Use requestAnimationFrame for smooth animation.
6. Keep explanation SHORT (1-2 sentences), then complete code.
7. Dark background. Add OrbitControls or mouse interaction if possible.`,

  chartjs: `You are an expert data visualization developer using Chart.js. Build beautiful, interactive charts.

CRITICAL RULES:
1. Return a COMPLETE single HTML file using Chart.js CDN.
2. Wrap entire output in ONE code block: \`\`\`html ... \`\`\`
3. ALWAYS include: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
4. Create rich charts with real-looking data relevant to the user's request.
5. Use multiple chart types when appropriate (bar, line, pie, doughnut, radar).
6. Add tooltips, legends, and interactive features.
7. Keep explanation SHORT (1-2 sentences), then complete code.
8. Dark theme. Use attractive color schemes.`,

};

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

async function tryOpenRouter(key: string, model: string, history: { role: string; content: string }[], signal: AbortSignal, sysPrompt: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://brainforge-7xn.pages.dev", "X-Title": "BrainForge" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: sysPrompt }, ...history], stream: false }), signal,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); if (res.status === 429) throw new Error("RATE_LIMITED"); throw new Error(e?.error?.message || `OpenRouter ${res.status}`); }
  const d = await res.json(); const c = d.choices?.[0]?.message?.content; if (!c) throw new Error("RATE_LIMITED"); return c;
}

async function openRouterWithFallback(key: string, preferred: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void, sysPrompt: string): Promise<string> {
  for (const m of [preferred, ...OR_FALLBACKS.filter(x => x !== preferred)]) {
    if (signal.aborted) break;
    onModel(m.split("/").pop()?.replace(":free", "") ?? m);
    try { return await tryOpenRouter(key, m, history, signal, sysPrompt); }
    catch (e: unknown) { if (e instanceof Error && e.name === "AbortError") throw e; if (e instanceof Error && e.message === "RATE_LIMITED") continue; throw e; }
  }
  throw new Error("RATE_LIMITED");
}

async function tryGemini(key: string, model: string, history: { role: string; content: string }[], signal: AbortSignal, sysPrompt: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system_instruction: { parts: [{ text: sysPrompt }] }, contents: history.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: 8192 } }), signal,
  });
  if (!res.ok) { if (res.status === 429) throw new Error("RATE_LIMITED"); throw new Error(`Gemini ${res.status}`); }
  const d = await res.json(); const t = d.candidates?.[0]?.content?.parts?.[0]?.text; if (!t) throw new Error("RATE_LIMITED"); return t;
}

async function geminiWithFallback(key: string, preferred: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void, sysPrompt: string): Promise<string> {
  for (const m of [preferred, ...GEMINI_FALLBACKS.filter(x => x !== preferred)]) {
    if (signal.aborted) break; onModel(`Gemini(${m})`);
    try { return await tryGemini(key, m, history, signal, sysPrompt); }
    catch (e: unknown) { if (e instanceof Error && e.name === "AbortError") throw e; if (e instanceof Error && e.message === "RATE_LIMITED") continue; throw e; }
  }
  throw new Error("RATE_LIMITED");
}

async function tryGroq(key: string, model: string, history: { role: string; content: string }[], signal: AbortSignal, sysPrompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: sysPrompt }, ...history], stream: false }), signal,
  });
  if (!res.ok) { if (res.status === 429) throw new Error("RATE_LIMITED"); throw new Error(`Groq ${res.status}`); }
  const d = await res.json(); const c = d.choices?.[0]?.message?.content; if (!c) throw new Error("RATE_LIMITED"); return c;
}

async function groqWithFallback(key: string, preferred: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void, sysPrompt: string): Promise<string> {
  for (const m of [preferred, ...GROQ_FALLBACKS.filter(x => x !== preferred)]) {
    if (signal.aborted) break; onModel(`Groq(${m})`);
    try { return await tryGroq(key, m, history, signal, sysPrompt); }
    catch (e: unknown) { if (e instanceof Error && e.name === "AbortError") throw e; if (e instanceof Error && e.message === "RATE_LIMITED") continue; throw e; }
  }
  throw new Error("RATE_LIMITED");
}

async function tryGitHub(token: string, model: string, history: { role: string; content: string }[], signal: AbortSignal, onModel: (l: string) => void, sysPrompt: string): Promise<string> {
  onModel(`GitHub(${model})`);
  const res = await fetch("https://models.inference.ai.azure.com/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: sysPrompt }, ...history], stream: false }), signal,
  });
  if (!res.ok) { if (res.status === 429) throw new Error("RATE_LIMITED"); throw new Error(`GitHub ${res.status}`); }
  const d = await res.json(); const c = d.choices?.[0]?.message?.content; if (!c) throw new Error("RATE_LIMITED"); return c;
}

interface UseAIChatOptions {
  provider: AIProvider; language?: AppLanguage;
  openRouterKey: string; openRouterModel: string;
  geminiKey: string; geminiModel: string;
  groqKey: string; groqModel: string;
  githubModelsKey: string; githubModelsModel: string;
  projectName: string;
}

export function useAIChat(opts: UseAIChatOptions) {
  const { provider, language = "html", openRouterKey, openRouterModel, geminiKey, geminiModel, groqKey, groqModel, githubModelsKey, githubModelsModel, projectName } = opts;
  const sysPrompt = PROMPTS[language] || PROMPTS.html;

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
        if (!groqKey) throw new Error("No Groq key.");
        reply = await groqWithFallback(groqKey, groqModel, history, signal, setActiveModel, sysPrompt);
      } else if (provider === "github") {
        if (!githubModelsKey) throw new Error("No GitHub Models token.");
        reply = await tryGitHub(githubModelsKey, githubModelsModel, history, signal, setActiveModel, sysPrompt);
      } else if (provider === "gemini") {
        if (!geminiKey) throw new Error("No Gemini key.");
        reply = await geminiWithFallback(geminiKey, geminiModel, history, signal, setActiveModel, sysPrompt);
      } else if (provider === "auto") {
        const queue: { name: string; call: () => Promise<string> }[] = [];
        if (openRouterKey) queue.push({ name: "OpenRouter", call: () => openRouterWithFallback(openRouterKey, openRouterModel, history, signal, setActiveModel, sysPrompt) });
        if (geminiKey) queue.push({ name: "Gemini", call: () => geminiWithFallback(geminiKey, geminiModel, history, signal, setActiveModel, sysPrompt) });
        if (groqKey) queue.push({ name: "Groq", call: () => groqWithFallback(groqKey, groqModel, history, signal, setActiveModel, sysPrompt) });
        if (githubModelsKey) queue.push({ name: "GitHub", call: () => tryGitHub(githubModelsKey, githubModelsModel, history, signal, setActiveModel, sysPrompt) });
        if (!queue.length) throw new Error("No API keys. Go to Settings → API Keys.");
        let ok = false;
        for (const p of queue) {
          if (signal.aborted) break;
          try { reply = await p.call(); ok = true; break; }
          catch (e: unknown) { if (e instanceof Error && e.name === "AbortError") throw e; if (e instanceof Error && e.message === "RATE_LIMITED") continue; throw e; }
        }
        if (!ok) throw new Error("All providers rate limited. Wait and try again.");
      } else {
        if (!openRouterKey) throw new Error("No OpenRouter key.");
        reply = await openRouterWithFallback(openRouterKey, openRouterModel, history, signal, setActiveModel, sysPrompt);
      }
      setMessages(p => { const n = [...p, { role: "assistant", content: reply } as ChatMessage]; persist(projectName, n); scheduleSessionPush(projectName, n); return n; });
    } catch (e: unknown) { if (e instanceof Error && e.name !== "AbortError") setError(e.message); setActiveModel(""); }
    finally { setIsLoading(false); }
  }, [provider, language, openRouterKey, openRouterModel, geminiKey, geminiModel, groqKey, groqModel, githubModelsKey, githubModelsModel, projectName, sysPrompt]);

  const clearMessages = useCallback(() => {
    setMessages([]); persist(projectName, []); idbRemove(storageKey(projectName)).catch(() => {}); setError(null); setActiveModel("");
  }, [projectName]);

  return { messages, isLoading, error, activeProvider: activeModel, sendMessage, clearMessages };
}


