import { useCallback, useEffect, useRef, useState } from "react";
import type { AIProvider } from "../constants/models";
import type { ChatMessage } from "./useTermux";

const SYSTEM_PROMPT =
  "You are an expert app builder. Generate clean HTML/CSS/JS code. " +
  "When asked to build an app, return a complete single HTML file. " +
  "When fixing errors, return the complete corrected code.";

// Free OpenRouter models tried in sequence on rate limit
const OR_FALLBACKS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "qwen/qwen3-coder:free",
  "openai/gpt-oss-120b:free",
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

// Returns reply string, or throws "RATE_LIMITED" / real error
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
      throw new Error(
        "Invalid OpenRouter API key. Go to Settings \u2192 API Keys to fix it.",
      );
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `OpenRouter error ${res.status}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("RATE_LIMITED"); // empty = model unavailable
  return content;
}

// Try all OpenRouter fallback models in sequence
async function openRouterWithFallback(
  key: string,
  preferred: string,
  history: { role: string; content: string }[],
  signal: AbortSignal,
  onModel: (label: string) => void,
): Promise<string> {
  const candidates = [
    preferred,
    ...OR_FALLBACKS.filter((m) => m !== preferred),
  ];
  for (const model of candidates) {
    if (signal.aborted) break;
    onModel(model.split("/").pop()?.replace(":free", "") ?? model);
    try {
      return await tryOpenRouter(key, model, history, signal);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      if (e instanceof Error && e.message === "RATE_LIMITED") continue;
      throw e; // real error -- stop
    }
  }
  throw new Error("RATE_LIMITED");
}

async function tryGemini(
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
      throw new Error(
        "Invalid Gemini API key. Go to Settings \u2192 API Keys.",
      );
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

async function tryDeepSeek(
  key: string,
  model: string,
  history: { role: string; content: string }[],
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
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
      throw new Error(
        "Invalid DeepSeek API key. Go to Settings \u2192 API Keys.",
      );
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `DeepSeek error ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response";
}

interface UseAIChatOptions {
  provider: AIProvider;
  openRouterKey: string;
  openRouterModel: string;
  geminiKey: string;
  geminiModel: string;
  deepSeekKey: string;
  deepSeekModel: string;
  projectName: string;
}

export function useAIChat(opts: UseAIChatOptions) {
  const {
    provider,
    openRouterKey,
    openRouterModel,
    geminiKey,
    geminiModel,
    deepSeekKey,
    deepSeekModel,
    projectName,
  } = opts;

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadChatMessages(projectName),
  );
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
          // --- Gemini direct ---
          if (!geminiKey)
            throw new Error(
              "No Gemini API key. Go to Settings \u2192 API Keys.",
            );
          setActiveModel("Gemini");
          try {
            reply = await tryGemini(geminiKey, geminiModel, history, signal);
          } catch (e: unknown) {
            if (e instanceof Error && e.message === "RATE_LIMITED") {
              throw new Error(
                "Gemini rate limit reached (15 req/min). Wait about 60 seconds and try again.",
              );
            }
            throw e;
          }
        } else if (provider === "deepseek") {
          // --- DeepSeek direct ---
          if (!deepSeekKey)
            throw new Error(
              "No DeepSeek API key. Go to Settings \u2192 API Keys.",
            );
          setActiveModel("DeepSeek");
          try {
            reply = await tryDeepSeek(
              deepSeekKey,
              deepSeekModel,
              history,
              signal,
            );
          } catch (e: unknown) {
            if (e instanceof Error && e.message === "RATE_LIMITED") {
              throw new Error(
                "DeepSeek rate limited. Wait a moment and try again.",
              );
            }
            throw e;
          }
        } else if (provider === "auto") {
          // --- Auto: only use providers that have keys, skip others silently ---
          // Build list of providers to try (only those with keys)
          type Provider = { name: string; call: () => Promise<string> };
          const queue: Provider[] = [];

          if (openRouterKey) {
            queue.push({
              name: "OpenRouter",
              call: () =>
                openRouterWithFallback(
                  openRouterKey,
                  openRouterModel,
                  history,
                  signal,
                  (m) => setActiveModel(m),
                ),
            });
          }
          if (geminiKey) {
            queue.push({
              name: "Gemini",
              call: () => {
                setActiveModel("Gemini");
                return tryGemini(geminiKey, geminiModel, history, signal);
              },
            });
          }
          if (deepSeekKey) {
            queue.push({
              name: "DeepSeek",
              call: () => {
                setActiveModel("DeepSeek");
                return tryDeepSeek(deepSeekKey, deepSeekModel, history, signal);
              },
            });
          }

          if (queue.length === 0) {
            throw new Error(
              "No API keys configured. Go to Settings \u2192 API Keys and add at least one.",
            );
          }

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
              if (e instanceof Error && e.message === "RATE_LIMITED") continue; // try next
              throw e; // real error
            }
          }

          if (!succeeded) {
            throw new Error(
              `All available providers are rate limited (tried: ${tried.join(", ")}). Wait a minute and try again.`,
            );
          }
        } else {
          // --- OpenRouter with automatic model fallback ---
          if (!openRouterKey)
            throw new Error(
              "No OpenRouter API key. Go to Settings \u2192 API Keys.",
            );
          try {
            reply = await openRouterWithFallback(
              openRouterKey,
              openRouterModel,
              history,
              signal,
              (m) => setActiveModel(m),
            );
          } catch (e: unknown) {
            if (e instanceof Error && e.message === "RATE_LIMITED") {
              throw new Error(
                "All free OpenRouter models are rate limited right now. Switch to Auto in Settings \u2192 AI Settings to also use Gemini as a fallback.",
              );
            }
            throw e;
          }
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
    [
      provider,
      openRouterKey,
      openRouterModel,
      geminiKey,
      geminiModel,
      deepSeekKey,
      deepSeekModel,
      projectName,
    ],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    persist(projectName, []);
    setError(null);
    setActiveModel("");
  }, [projectName]);

  return {
    messages,
    isLoading,
    error,
    activeProvider: activeModel,
    sendMessage,
    clearMessages,
  };
}
