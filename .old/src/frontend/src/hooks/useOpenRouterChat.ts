import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "./useTermux";

const SYSTEM_PROMPT =
  "You are an expert app builder. Generate clean React/HTML/CSS/JS code. " +
  "When asked to build an app, return the complete code. " +
  "When fixing errors, return the corrected code.";

export function useOpenRouterChat(apiKey: string, model: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message: string, _projectName: string) => {
      setError(null);
      const userMsg: ChatMessage = { role: "user", content: message };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        if (!apiKey) {
          throw new Error("No OpenRouter API key set. Add it in Settings.");
        }

        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const res = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...history,
                { role: "user", content: message },
              ],
              stream: false,
            }),
            signal: abortRef.current.signal,
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const reply: ChatMessage = {
          role: "assistant",
          content: data.choices?.[0]?.message?.content || "No response",
        };
        setMessages((prev) => [...prev, reply]);
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setError(e.message || "Request failed");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, model, messages],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
