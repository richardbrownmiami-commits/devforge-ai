/**
 * useAIChat.ts
 * Multi-provider AI chat hook.
 * Supports: OpenRouter, Google Gemini (direct), DeepSeek (direct), Auto
 * Chat history persisted per-project in localStorage.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { AIProvider } from "../constants/models";
import type { ChatMessage } from "./useTermux";

const SYSTEM_PROMPT =
  "You are an expert app builder. Generate clean React/HTML/CSS/JS code. " +
  "When asked to build an app, return the complete code inside a single HTML file. " +
  "When fixing errors, return the complete corrected code.";

function storageKey(projectName: string) {
  return `bf_chat_${projectName}`;
}

export function loadChatMessages(projectName: string): ChatMessage[] {
  if (!projectName) return [];
  try {
    const raw = localStorage.getItem(storageKey(projectName));
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {}
  return [];
}

function persistMessages(projectName: string, msgs: ChatMessage[]) {
  try {
    // Keep last 50 messages
    const trimmed = msgs.slice(-50);
    localStorage.setItem(storageKey(projectName), JSON.stringify(trimmed));
  } catch {}
}

// ---- Provider call functions ----

async function callOpenRouter(
  apiKey: string,
  model: string,
  history: { role: string; content: string }[],
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    const msg = err?.error?.message || `HTTP ${res.status}`;
    if (res.status === 401) throw new Error("Invalid OpenRouter API key.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(msg);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response";
}

async function callGemini(
  apiKey: string,
  model: string,
  history: { role: string; content: string }[],
  signal: AbortSignal,
): Promise<string> {
  const geminiHistory = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: geminiHistory,
        generationConfig: { maxOutputTokens: 8192 },
      }),
      signal,
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403)
      throw new Error("Invalid Gemini API key.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `Gemini HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

async function callDeepSeek(
  apiKey: string,
  model: string,
  history: { role: string; content: string }[],
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    if (res.status === 401) throw new Error("Invalid DeepSeek API key.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `DeepSeek HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response";
}

// ---- Main hook ----

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
  const [activeProvider, setActiveProvider] = useState<string>("");
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
      const prevMessages = loadChatMessages(projectName);
      const nextMessages = [...prevMessages, userMsg];
      setMessages(nextMessages);
      persistMessages(projectName, nextMessages);
      setIsLoading(true);

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      const history = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        let reply = "";

        if (provider === "gemini") {
          if (!geminiKey)
            throw new Error(
              "No Gemini API key. Add it in Settings > AI Settings.",
            );
          setActiveProvider("Gemini");
          reply = await callGemini(geminiKey, geminiModel, history, signal);
        } else if (provider === "deepseek") {
          if (!deepSeekKey)
            throw new Error(
              "No DeepSeek API key. Add it in Settings > AI Settings.",
            );
          setActiveProvider("DeepSeek");
          reply = await callDeepSeek(
            deepSeekKey,
            deepSeekModel,
            history,
            signal,
          );
        } else if (provider === "auto") {
          // Try providers in order: OpenRouter -> Gemini -> DeepSeek
          const attempts: Array<() => Promise<string>> = [];
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
              "No API keys configured. Add at least one in Settings > AI Settings.",
            );

          for (const attempt of attempts) {
            try {
              reply = await attempt();
              break;
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "";
              if (msg === "RATE_LIMITED") { continue; }
              throw e;
            }
          }
          if (!reply)
            throw new Error(
              "All providers rate limited. Try again in a moment.",
            );
        } else {
          // Default: OpenRouter
          if (!openRouterKey)
            throw new Error(
              "No OpenRouter API key. Add it in Settings > AI Settings.",
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
        setMessages((prev) => {
          const next = [...prev, replyMsg];
          persistMessages(projectName, next);
          return next;
        });
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") {
          const msg =
            e.message === "RATE_LIMITED"
              ? "Rate limited. Switching model or try again."
              : e.message;
          setError(msg);
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
    persistMessages(projectName, []);
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
