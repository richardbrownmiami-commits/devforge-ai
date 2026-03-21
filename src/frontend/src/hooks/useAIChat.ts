import { useCallback, useEffect, useRef, useState } from "react";
import type { AIProvider } from "../constants/models";
import type { ChatMessage } from "./useTermux";

const SYSTEM_PROMPT =
  "You are an expert app builder. Generate clean HTML/CSS/JS code. " +
  "When asked to build an app, return a complete single HTML file. " +
  "When fixing errors, return the complete corrected code.";

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

async function callOpenRouter(
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
      model: model === "openrouter/auto" ? undefined : model,
      models:
        model === "openrouter/auto"
          ? [
              "qwen/qwen3-coder:free",
              "meta-llama/llama-3.3-70b-instruct:free",
              "deepseek/deepseek-r1:free",
            ]
          : undefined,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      stream: false,
    }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("Invalid OpenRouter API key.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `OpenRouter HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response";
}

async function callGemini(
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
    if (res.status === 401 || res.status === 403)
      throw new Error("Invalid Gemini API key.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

async function callDeepSeek(
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
    if (res.status === 401) throw new Error("Invalid DeepSeek API key.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `DeepSeek HTTP ${res.status}`);
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
  const [activeProvider, setActiveProvider] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const projectRef = useRef(projectName);

  useEffect(() => {
    if (projectRef.current !== projectName) {
      projectRef.current = projectName;
      setMessages(loadChatMessages(projectName));
      setError(null);
      setActiveProvider("");
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
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;
      const history = next.map((m) => ({ role: m.role, content: m.content }));
      try {
        let reply = "";
        if (provider === "gemini") {
          if (!geminiKey)
            throw new Error(
              "No Gemini API key. Add it in Settings > API Keys.",
            );
          setActiveProvider("Gemini");
          reply = await callGemini(geminiKey, geminiModel, history, signal);
        } else if (provider === "deepseek") {
          if (!deepSeekKey)
            throw new Error(
              "No DeepSeek API key. Add it in Settings > API Keys.",
            );
          setActiveProvider("DeepSeek");
          reply = await callDeepSeek(
            deepSeekKey,
            deepSeekModel,
            history,
            signal,
          );
        } else if (provider === "auto") {
          type Attempt = () => Promise<string>;
          const attempts: Attempt[] = [];
          if (openRouterKey)
            attempts.push(() => {
              setActiveProvider("OpenRouter");
              return callOpenRouter(
                openRouterKey,
                openRouterModel,
                history,
                signal,
              );
            });
          if (geminiKey)
            attempts.push(() => {
              setActiveProvider("Gemini");
              return callGemini(geminiKey, geminiModel, history, signal);
            });
          if (deepSeekKey)
            attempts.push(() => {
              setActiveProvider("DeepSeek");
              return callDeepSeek(deepSeekKey, deepSeekModel, history, signal);
            });
          if (attempts.length === 0)
            throw new Error(
              "No API keys configured. Add at least one in Settings > API Keys.",
            );
          for (const attempt of attempts) {
            try {
              reply = await attempt();
              if (reply) break;
            } catch (e: unknown) {
              if (e instanceof Error && e.message === "RATE_LIMITED") continue;
              throw e;
            }
          }
          if (!reply)
            throw new Error(
              "All providers rate limited. Try again in a moment.",
            );
        } else {
          if (!openRouterKey)
            throw new Error(
              "No OpenRouter API key. Add it in Settings > API Keys.",
            );
          setActiveProvider("OpenRouter");
          reply = await callOpenRouter(
            openRouterKey,
            openRouterModel,
            history,
            signal,
          );
        }
        const replyMsg: ChatMessage = { role: "assistant", content: reply };
        setMessages((p) => {
          const n = [...p, replyMsg];
          persist(projectName, n);
          return n;
        });
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") {
          setError(
            e.message === "RATE_LIMITED"
              ? "Rate limited. Try again or switch provider."
              : e.message,
          );
        }
        setActiveProvider("");
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
    setActiveProvider("");
  }, [projectName]);

  return {
    messages,
    isLoading,
    error,
    activeProvider,
    sendMessage,
    clearMessages,
  };
}
