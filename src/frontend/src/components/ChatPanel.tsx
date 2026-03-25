import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Code2,
  Info,
  Monitor,
  Send,
  Trash2,
  Wrench,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../hooks/useTermux";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSend: (message: string) => void;
  onClear: () => void;
  disabled?: boolean;
  apiKeyMissing?: boolean;
  onPreview?: () => void;
  hasCode?: boolean;
  initialMessage?: string;
  autoFixStatus?: string | null;
}

type Block =
  | { type: "text"; id: string; text: string }
  | { type: "code"; id: string; lang: string; code: string };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let idx = 0;
  let m = regex.exec(content);
  while (m !== null) {
    if (m.index > last)
      blocks.push({
        type: "text",
        id: `t-${idx++}`,
        text: content.slice(last, m.index),
      });
    blocks.push({
      type: "code",
      id: `c-${idx++}`,
      lang: m[1] || "text",
      code: m[2],
    });
    last = m.index + m[0].length;
    m = regex.exec(content);
  }
  if (last < content.length)
    blocks.push({ type: "text", id: `t-${idx++}`, text: content.slice(last) });
  if (blocks.length === 0)
    blocks.push({ type: "text", id: "t-0", text: content });
  return blocks;
}

function CodeBadge({
  lang,
  code,
  onPreview,
}: {
  lang: string;
  code: string;
  onPreview?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const lines = code.trim().split("\n").length;
  return (
    <div className="my-1">
      <div
        className="flex items-center gap-1.5 rounded-md px-2 py-1"
        style={{
          background: "oklch(0.1 0.04 140 / 0.5)",
          border: "1px solid oklch(0.25 0.06 140 / 0.5)",
        }}
      >
        <Code2 className="w-3 h-3" style={{ color: "#4ade80" }} />
        <span className="text-[10px] font-mono" style={{ color: "#4ade80" }}>
          {lang || "code"} · {lines} lines
        </span>
        <div className="flex-1" />
        {onPreview && (
          <button
            type="button"
            onClick={onPreview}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors"
            style={{
              background: "oklch(0.2 0.06 140 / 0.5)",
              color: "#4ade80",
            }}
          >
            <Monitor className="w-2.5 h-2.5" /> Preview
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>
      {expanded && (
        <pre
          className="mt-1 rounded p-2 text-[10px] font-mono overflow-x-auto leading-relaxed whitespace-pre"
          style={{
            background: "oklch(0.08 0 0)",
            color: "#4ade80",
            maxHeight: "240px",
            overflowY: "auto",
          }}
        >
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

function AIMessageContent({
  content,
  onPreview,
}: {
  content: string;
  onPreview?: () => void;
}) {
  const blocks = parseBlocks(content);
  return (
    <div className="space-y-1">
      {blocks.map((b) =>
        b.type === "code" ? (
          <CodeBadge
            key={b.id}
            lang={b.lang}
            code={b.code}
            onPreview={onPreview}
          />
        ) : (
          <p
            key={b.id}
            className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground"
          >
            {b.text}
          </p>
        ),
      )}
    </div>
  );
}

export function ChatPanel({
  messages,
  isLoading,
  error,
  onSend,
  onClear,
  disabled,
  apiKeyMissing,
  onPreview,
  hasCode,
  initialMessage,
  autoFixStatus,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    if (initialMessage) setInput(initialMessage);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || disabled) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend(text);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full" data-ocid="chat.panel">
      <ScrollArea className="flex-1 px-3" style={{ overflowX: "auto" }}>
        <div className="py-3 space-y-3 min-w-0">
          {messages.length === 0 && (
            <div className="text-center py-14" data-ocid="chat.empty_state">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-xs text-muted-foreground">
                Describe what you want to build
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-1">
                AI generates complete working code + live preview
              </p>
            </div>
          )}

          {apiKeyMissing && messages.length === 0 && (
            <div
              className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-lg p-2.5"
              data-ocid="chat.api_key_notice"
            >
              <Info className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
              <span>
                Add OpenRouter or Gemini API key in{" "}
                <a href="/settings" className="text-primary hover:underline">
                  Settings › API
                </a>
              </span>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={`${msg.role}-${i}-${msg.content.slice(0, 8)}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "rounded-lg px-3 py-2",
                  msg.role === "user"
                    ? "chat-bubble-user ml-8"
                    : "chat-bubble-ai",
                )}
                data-ocid={`chat.item.${i + 1}`}
              >
                <span
                  className="text-[9px] font-mono uppercase block mb-1"
                  style={{
                    color:
                      msg.role === "user"
                        ? "oklch(0.7 0.15 290)"
                        : "oklch(0.7 0.1 220)",
                  }}
                >
                  {msg.role === "user" ? "you" : "✦ ai"}
                </span>
                {msg.role === "assistant" ? (
                  <AIMessageContent
                    content={msg.content}
                    onPreview={onPreview}
                  />
                ) : (
                  <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">
                    {msg.content}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div
              className="chat-bubble-ai rounded-lg px-3 py-2"
              data-ocid="chat.loading_state"
            >
              <span
                className="text-[9px] font-mono uppercase block mb-1"
                style={{ color: "oklch(0.7 0.1 220)" }}
              >
                ✦ ai
              </span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {autoFixStatus && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: "oklch(0.18 0.06 60 / 0.5)",
                border: "1px solid oklch(0.35 0.1 60 / 0.5)",
              }}
              data-ocid="chat.autofix.loading_state"
            >
              <Wrench
                className="w-3.5 h-3.5 animate-spin shrink-0"
                style={{ color: "oklch(0.75 0.15 60)" }}
              />
              <span
                className="text-[11px]"
                style={{ color: "oklch(0.75 0.15 60)" }}
              >
                {autoFixStatus}
              </span>
            </motion.div>
          )}

          {error && (
            <div
              className="flex items-start gap-2 text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5"
              data-ocid="chat.error_state"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {hasCode && !isLoading && onPreview && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                type="button"
                onClick={onPreview}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-[11px] text-primary"
                data-ocid="chat.preview.button"
              >
                <Monitor className="w-3 h-3" />
                Tap to open preview
              </button>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-border shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe what you want to build..."
            rows={1}
            disabled={disabled || isLoading}
            className="flex-1 resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-40 transition-all"
            style={{ minHeight: "36px", maxHeight: "120px" }}
            data-ocid="chat.input"
          />
          <div className="flex gap-1 shrink-0">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-xl"
                onClick={onClear}
                title="Clear chat"
                data-ocid="chat.clear.button"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !!disabled}
              className="h-9 w-9 flex items-center justify-center rounded-xl disabled:opacity-30 transition-all"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.6 0.2 250), oklch(0.5 0.2 290))",
              }}
              data-ocid="chat.submit_button"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
