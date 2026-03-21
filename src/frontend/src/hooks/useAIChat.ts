import { useCallback, useEffect, useRef, useState } from "react";
import type { AIProvider } from "../constants/models";
import type { ChatMessage } from "./useTermux";

const SYSTEM_PROMPT =
  "You are an expert app builder. Generate clean HTML/CSS/JS code. " +
  "When asked to build an app, return a complete single HTML file. " +
  "When fixing errors, return the complete corrected code.";

// Free models tried in order when rate limited -- most reliable first
const OPENROUTER_FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "qwen/qwen3-coder:free",
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

async function callOpenRouterModel(
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
      throw new Error("Invalid OpenRouter API key. Check Settings > API Keys.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err?.error?.message || `OpenRouter error ${res.status}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("RATE_LIMITED"); // empty = model unavailable
  return content;
}

async function callOpenRouterWithFallback(
  key: string,
  preferredModel: string,
  history: { role: string; content: string }[],
  signal: AbortSignal,
  onModelTry: (model: string) => void,
): Promise<string> {
  // Build ordered list: preferred first, then fallbacks (skip duplicates)
  const candidates = [
    preferredModel,
    ...OPENROUTER_FALLBACK_MODELS.filter((m) => m !== preferredModel),
  ];

  let lastError = "";
  for (const model of candidates) {
    if (signal.aborted) throw new Error("AbortError");
    onModelTry(model.split("/").pop()?.replace(":free", "") ?? model);
    try {
      return await callOpenRouterModel(key, model, history, signal);
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.name === "AbortError") throw e;
        if (e.message === "RATE_LIMITED") {
          lastError = `${model} rate limited`;
          continue; // try next model
        }
        throw e; // non-rate-limit error -- stop
      }
      throw e;
    }
  }
  throw new Error(
    `All free models are rate limited. ${lastError}. Try again in a few minutes or add a Gemini key in Settings > API Keys.`,
  );
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
      throw new Error("Invalid Gemini API key. Check Settings > API Keys.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
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
    if (res.status === 401)
      throw new Error("Invalid DeepSeek API key. Check Settings > API Keys.");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    const err = await res.json().catch(() => ({}));
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
          if (!geminiKey)
            throw new Error("No Gemini key. Add it in Settings > API Keys.");
          setActiveModel("Gemini");
          reply = await callGemini(geminiKey, geminiModel, history, signal);
        } else if (provider === "deepseek") {
          if (!deepSeekKey)
            throw new Error("No DeepSeek key. Add it in Settings > API Keys.");
          setActiveModel("DeepSeek");
          reply = await callDeepSeek(
            deepSeekKey,
            deepSeekModel,
            history,
            signal,
          );
        } else if (provider === "auto") {
          // Auto: try OpenRouter with full model fallback first, then Gemini, then DeepSeek
          if (openRouterKey) {
            try {
              reply = await callOpenRouterWithFallback(
                openRouterKey,
                openRouterModel,
                history,
                signal,
                (m) => setActiveModel(m),
              );
            } catch (e: unknown) {
              if (
                e instanceof Error &&
                e.message !== "RATE_LIMITED" &&
                !e.message.includes("All free models")
              )
                throw e;
              // All OpenRouter models exhausted -- try Gemini
              if (geminiKey) {
                setActiveModel("Gemini");
                reply = await callGemini(
                  geminiKey,
                  geminiModel,
                  history,
                  signal,
                );
              } else if (deepSeekKey) {
                setActiveModel("DeepSeek");
                reply = await callDeepSeek(
                  deepSeekKey,
                  deepSeekModel,
                  history,
                  signal,
                );
              } else {
                throw new Error(
                  "All OpenRouter models rate limited. Add a Gemini key in Settings > API Keys for a reliable fallback.",
                );
              }
            }
          } else if (geminiKey) {
            setActiveModel("Gemini");
            reply = await callGemini(geminiKey, geminiModel, history, signal);
          } else if (deepSeekKey) {
            setActiveModel("DeepSeek");
            reply = await callDeepSeek(
              deepSeekKey,
              deepSeekModel,
              history,
              signal,
            );
          } else {
            throw new Error(
              "No API keys set. Add at least one in Settings > API Keys.",
            );
          }
        } else {
          // OpenRouter -- try preferred model, auto-rotate through fallbacks on rate limit
          if (!openRouterKey)
            throw new Error(
              "No OpenRouter key. Add it in Settings > API Keys.",
            );
          reply = await callOpenRouterWithFallback(
            openRouterKey,
            openRouterModel,
            history,
            signal,
            (m) => setActiveModel(m),
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
          setError(e.message);
        }
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
