import { useCallback, useEffect, useRef, useState } from "react";
import { cfApi } from "../lib/cloudflareApi";
import type { ChatMessage } from "./useTermux";

const SYSTEM_PROMPT =
  "You are an expert app builder. Generate clean React/HTML/CSS/JS code. " +
  "When asked to build an app, return the complete code. " +
  "When fixing errors, return the corrected code.";

const NEEDS_SEARCH_REGEX =
  /\b(latest|current|new|today|2024|2025|2026|recently|now|update|release)\b/i;

// Module-level store -- persists across component unmounts/remounts
// This ensures AI keeps coding even when user navigates away
const projectLoadingState = new Map<string, boolean>();
const projectMessageStore = new Map<string, ChatMessage[]>();

async function searchWeb(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
    );
    const data = await res.json();
    const results = data.RelatedTopics?.slice(0, 3)
      .map((t: any) => t.Text)
      .filter(Boolean)
      .join("\n");
    return results ? `\n\n[Web context]:\n${results}` : "";
  } catch {
    return "";
  }
}

function parseOpenRouterError(status: number, errBody: any): string {
  const rawMsg: string =
    errBody?.error?.message ||
    errBody?.error?.metadata?.raw ||
    errBody?.message ||
    `HTTP ${status}`;
  if (status === 401) return "Invalid API key -- check your OpenRouter key in Settings";
  if (status === 402) return "Insufficient credits -- use a free model like qwen/qwen3-coder:free";
  if (status === 429) return "Rate limit reached -- wait a moment or switch models";
  if (rawMsg.toLowerCase().includes("provider") || rawMsg.toLowerCase().includes("upstream") || rawMsg.toLowerCase().includes("overloaded"))
    return "AI provider error -- try selecting a different model in the top bar";
  return rawMsg;
}

export interface UseOpenRouterChatOptions {
  onSnapshot?: (code: string) => void;
}

export function useOpenRouterChat(
  apiKey: string,
  model: string,
  projectName: string,
  options: UseOpenRouterChatOptions = {},
) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => projectMessageStore.get(projectName) || []
  );
  const [isLoading, setIsLoading] = useState(
    () => projectLoadingState.get(projectName) || false
  );
  const [error, setError] = useState<string | null>(null);
  const autoFixCountRef = useRef(0);
  const mountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load persisted messages from D1 on mount / project change
  useEffect(() => {
    if (!projectName) return;
    // Check module store first (from in-progress request)
    const cached = projectMessageStore.get(projectName);
    if (cached && cached.length > 0) {
      setMessages(cached);
      setIsLoading(projectLoadingState.get(projectName) || false);
      return;
    }
    // Load from D1
    cfApi.getMessages(projectName).then((msgs) => {
      if (msgs.length > 0 && mountedRef.current) {
        const chatMsgs = msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        setMessages(chatMsgs);
        projectMessageStore.set(projectName, chatMsgs);
      }
    }).catch(() => {});
  }, [projectName]);

  const sendMessage = useCallback(
    async (message: string) => {
      setError(null);
      const userMsg: ChatMessage = { role: "user", content: message };

      // Snapshot before AI responds
      if (options.onSnapshot) {
        const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
        if (lastAssistant) options.onSnapshot(lastAssistant.content);
      }

      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      projectMessageStore.set(projectName, newMessages);
      projectLoadingState.set(projectName, true);
      setIsLoading(true);

      // Persist user message to D1
      if (projectName) {
        cfApi.addMessage({ project_id: projectName, role: "user", content: message }).catch(() => {});
      }

      try {
        if (!apiKey) throw new Error("No OpenRouter API key set. Go to Settings and add your key.");

        let webContext = "";
        if (NEEDS_SEARCH_REGEX.test(message)) webContext = await searchWeb(message);

        const history = newMessages.map((m) => ({ role: m.role, content: m.content }));
        const systemPrompt = webContext ? SYSTEM_PROMPT + webContext : SYSTEM_PROMPT;

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "BrainForge",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...history,
              { role: "user", content: message },
            ],
            stream: false,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(parseOpenRouterError(res.status, errBody));
        }

        const data = await res.json();
        const reply: ChatMessage = {
          role: "assistant",
          content: data.choices?.[0]?.message?.content || "No response",
        };

        const finalMessages = [...newMessages, reply];
        projectMessageStore.set(projectName, finalMessages);
        autoFixCountRef.current = 0;

        // Always update state -- React 18 ignores setState on unmounted components safely
        setMessages(finalMessages);

        // Persist AI reply to D1
        if (projectName) {
          cfApi.addMessage({ project_id: projectName, role: "assistant", content: reply.content }).catch(() => {});
        }
      } catch (e: any) {
        if (mountedRef.current) setError(e.message || "Request failed");
      } finally {
        projectLoadingState.set(projectName, false);
        if (mountedRef.current) setIsLoading(false);
      }
    },
    [apiKey, model, messages, options, projectName],
  );

  const autoFixError = useCallback(
    async (previewError: string) => {
      if (autoFixCountRef.current >= 3) {
        setError(`Auto-fix failed after 3 attempts. Error: ${previewError}`);
        return;
      }
      autoFixCountRef.current += 1;
      await sendMessage(`Fix this error: ${previewError}`);
    },
    [sendMessage],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    autoFixCountRef.current = 0;
    projectMessageStore.delete(projectName);
    projectLoadingState.delete(projectName);
  }, [projectName]);

  return { messages, isLoading, error, sendMessage, autoFixError, clearMessages };
}
