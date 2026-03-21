import { useCallback, useEffect, useRef, useState } from "react";
import type { AIProvider } from "../constants/models";
import type { ChatMessage } from "./useTermux";

const SYSTEM_PROMPT =
  "You are an expert app builder. Generate clean HTML/CSS/JS code. " +
  "When asked to build an app, return a complete single HTML file. " +
  "When fixing errors, return the complete corrected code.";

// Free OpenRouter models tried in sequence on rate limit (no deepseek)
const OR_FALLBACKS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "openai/gpt-oss-120b:free",
];

// Gemini free models tried in sequence on rate limit (all free via AI Studio)
const GEMINI_FALLBACKS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];

function storageKey(name: string) {
  return `bf_chat_${name}`;
}

export function loadChatMessages(name: string): ChatMessage[] {
  if (!name) return [];
  try {
    const raw = localStorage.getItem(storageKey(name));
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {}
  return [];
}

function persist(name: string, msgs: ChatMessage[]) {
  try {
    localStorage.setItem(storageKey(name), JSON.stringify(msgs.slice(-50)));
  } catch {}
}

async function tryOpenRouter(
  key: string,
  model: string,
  history: { role: string; content: string }[],
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://brainforge-7xn.pages.dev",
      "X-Title": "BrainForge",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      stream: false,
    }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401)
      throw new Error("Invalid OpenRouter API key. Go to Settings \u2192 API Keys to fix it.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `OpenRouter error ${res.status}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("RATE_LIMITED");
  return content;
}

async function openRouterWithFallback(
  key: string,
  preferred: string,
  history: { role: string; content: string }[],
  signal: AbortSignal,
  onModel: (label: string) => void,
): Promise<string> {
  const candidates = [preferred, ...OR_FALLBACKS.filter((m) => m !== preferred)];
  for (const model of candidates) {
    if (signal.aborted) break;
    onModel(model.split("/").pop()?.replace(":free", "") ?? model);
    try {
      return await tryOpenRouter(key, model, history, signal);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      if (e instanceof Error && e.message === "RATE_LIMITED") continue;
      throw e;
    }
  }
  throw new Error("RATE_LIMITED");
}

async function tryGeminiModel(
  key: string,
  model: string,
  history: { role: string; content: string }[],
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: history.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 8192 },
      }),
      signal,
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403)
      throw new Error("Invalid Gemini API key. Go to Settings \u2192 API Keys.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("RATE_LIMITED");
  return text;
}

async function geminiWithFallback(
  key: string,
  preferred: string,
  history: { role: string; content: string }[],
  signal: AbortSignal,
  onModel: (label: string) => void,
): Promise<string> {
  const candidates = [preferred, ...GEMINI_FALLBACKS.filter((m) => m !== preferred)];
  for (const model of candidates) {
    if (signal.aborted) break;
    onModel(`Gemini (${model})`);
    try {
      return await tryGeminiModel(key, model, history, signal);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      if (e instanceof Error && e.message === "RATE_LIMITED") continue;
      throw e;
    }
  }
  throw new Error("RATE_LIMITED");
}

interface UseAIChatOptions {
  provider: AIProvider;
  openRouterKey: string;
  openRouterModel: string;
  geminiKey: string;
  geminiModel: string;
  projectName: string;
}

export function useAIChat(opts: UseAIChatOptions) {
  const { provider, openRouterKey, openRouterModel, geminiKey, geminiModel, projectName } = opts;

  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatMessages(projectName));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const projectRef = useRef(projectName);

  useEffect(() => {
    if (projectRef.current !== projectName) {
      projectRef.current = projectName;
      setMessages(loadChatMessages(projectName));
      setError(null);
      setActiveModel("");
    }
  }, [projectName]);

  const sendMessage = useCallback(
    async (message: string) => {
      setError(null);
      const userMsg: ChatMessage = { role: "user", content: message };
      const prev = loadChatMessages(projectName);
      const next = [...prev, userMsg];
      setMessages(next);
      persist(projectName, next);
      setIsLoading(true);
      setActiveModel("");

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;
      const history = next.map((m) => ({ role: m.role, content: m.content }));

      try {
        let reply = "";

        if (provider === "gemini") {
          if (!geminiKey)
            throw new Error("No Gemini API key. Go to Settings \u2192 API Keys.");
          reply = await geminiWithFallback(geminiKey, geminiModel, history, signal, setActiveModel);
        } else if (provider === "auto") {
          // Auto: try providers that have keys, skip others silently
          type P = { name: string; call: () => Promise<string> };
          const queue: P[] = [];

          if (geminiKey) {
            queue.push({
              name: "Gemini",
              call: () => geminiWithFallback(geminiKey, geminiModel, history, signal, setActiveModel),
            });
          }
          if (openRouterKey) {
            queue.push({
              name: "OpenRouter",
              call: () =>
                openRouterWithFallback(openRouterKey, openRouterModel, history, signal, setActiveModel),
            });
          }

          if (queue.length === 0)
            throw new Error("No API keys configured. Go to Settings \u2192 API Keys and add at least one.");

          let succeeded = false;
          const tried: string[] = [];
          for (const p of queue) {
            if (signal.aborted) break;
            tried.push(p.name);
            try {
              reply = await p.call();
              succeeded = true;
              break;
            } catch (e: unknown) {
              if (e instanceof Error && e.name === "AbortError") throw e;
              if (e instanceof Error && e.message === "RATE_LIMITED") continue;
              throw e;
            }
          }

          if (!succeeded)
            throw new Error(
              `All providers rate limited (tried: ${tried.join(", ")}). Wait a minute and try again.`,
            );
        } else {
          // OpenRouter explicit
          if (!openRouterKey)
            throw new Error("No OpenRouter API key. Go to Settings \u2192 API Keys.");
          reply = await openRouterWithFallback(openRouterKey, openRouterModel, history, signal, setActiveModel);
        }

        const replyMsg: ChatMessage = { role: "assistant", content: reply };
        setMessages((p) => {
          const n = [...p, replyMsg];
          persist(projectName, n);
          return n;
        });
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") setError(e.message);
        setActiveModel("");
      } finally {
        setIsLoading(false);
      }
    },
    [provider, openRouterKey, openRouterModel, geminiKey, geminiModel, projectName],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    persist(projectName, []);
    setError(null);
    setActiveModel("");
  }, [projectName]);

  return { messages, isLoading, error, activeProvider: activeModel, sendMessage, clearMessages };
}
