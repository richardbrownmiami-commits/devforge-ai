import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AlertCircle, Info, Loader2, Send, Trash2 } from "lucide-react";
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
}

type Block =
  | { type: "text"; id: string; text: string }
  | { type: "code"; id: string; lang: string; code: string };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let idx = 0;
  let result = regex.exec(content);
  while (result !== null) {
    if (result.index > last) {
      blocks.push({
        type: "text",
        id: `t-${idx++}`,
        text: content.slice(last, result.index),
      });
    }
    blocks.push({
      type: "code",
      id: `c-${idx++}`,
      lang: result[1] || "text",
      code: result[2],
    });
    last = result.index + result[0].length;
    result = regex.exec(content);
  }
  if (last < content.length) {
    blocks.push({ type: "text", id: `t-${idx++}`, text: content.slice(last) });
  }
  if (blocks.length === 0) {
    blocks.push({ type: "text", id: "t-0", text: content });
  }
  return blocks;
}

const TYPING_DOTS = ["d0", "d1", "d2"];
const TYPING_DELAYS = ["0s", "0.15s", "0.3s"];

function CodeBlock({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className="space-y-2">
      {blocks.map((b) =>
        b.type === "code" ? (
          <div
            key={b.id}
            className="rounded-md overflow-hidden border border-border"
          >
            {b.lang && (
              <div className="px-3 py-1 text-[10px] font-mono text-muted-foreground bg-muted/50 border-b border-border">
                {b.lang}
              </div>
            )}
            <pre className="code-editor p-3 text-xs overflow-x-auto bg-[oklch(0.1_0_0)]">
              <code>{b.code}</code>
            </pre>
          </div>
        ) : (
          <p key={b.id} className="text-sm leading-relaxed whitespace-pre-wrap">
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
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message/loading change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || disabled) return;
    setInput("");
    onSend(text);
  };

  return (
    <div className="flex flex-col h-full min-h-0" data-ocid="chat.panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <span className="text-sm font-medium text-foreground">Chat</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onClear}
          data-ocid="chat.clear.button"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Scrollable messages area -- flex-1 so it fills all space between header and input */}
      <ScrollArea className="flex-1 min-h-0 px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16" data-ocid="chat.empty_state">
              <div className="text-3xl mb-3">⚡</div>
              <p className="text-sm text-muted-foreground">
                Describe what you want to build
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                AI will generate the code for you
              </p>
            </div>
          )}
          {apiKeyMissing && messages.length === 0 && (
            <div
              className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg p-3"
              data-ocid="chat.api_key_notice"
            >
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              <span>
                Add your OpenRouter API key in{" "}
                <a href="/settings" className="text-primary hover:underline">
                  Settings
                </a>{" "}
                to enable AI
              </span>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={`msg-${msg.content.slice(0, 20)}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "rounded-lg p-3",
                  msg.role === "user"
                    ? "chat-bubble-user ml-8"
                    : "chat-bubble-ai mr-0",
                )}
                data-ocid={`chat.item.${i + 1}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase shrink-0 mt-0.5">
                    {msg.role === "user" ? "you" : "ara"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <CodeBlock content={msg.content} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div
              className="chat-bubble-ai rounded-lg p-3"
              data-ocid="chat.loading_state"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  ara
                </span>
                <div className="flex gap-1">
                  {TYPING_DOTS.map((id, i) => (
                    <span
                      key={id}
                      className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                      style={{ animationDelay: TYPING_DELAYS[i] }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {error && (
            <div
              className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3"
              data-ocid="chat.error_state"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input bar -- Caffeine style, pinned to bottom */}
      <div className="shrink-0 border-t border-border bg-card">
        <div className="flex items-center gap-2 px-3 py-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Enter instruction or question..."
            disabled={disabled || isLoading}
            rows={1}
            className="flex-1 resize-none min-h-[36px] max-h-[120px] text-sm bg-transparent border-0 focus-visible:ring-0 p-0 pt-1"
            style={{ fontSize: "16px" }}
            data-ocid="chat.input"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || disabled}
            size="icon"
            className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
            data-ocid="chat.submit_button"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
