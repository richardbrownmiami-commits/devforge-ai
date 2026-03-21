import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AlertCircle, Info, Loader2, Monitor, Send, Trash2 } from "lucide-react";
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
    if (result.index > last)
      blocks.push({ type: "text", id: `t-${idx++}`, text: content.slice(last, result.index) });
    blocks.push({ type: "code", id: `c-${idx++}`, lang: result[1] || "text", code: result[2] });
    last = result.index + result[0].length;
    result = regex.exec(content);
  }
  if (last < content.length)
    blocks.push({ type: "text", id: `t-${idx++}`, text: content.slice(last) });
  if (blocks.length === 0)
    blocks.push({ type: "text", id: "t-0", text: content });
  return blocks;
}

function CodeBlock({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className="space-y-1.5">
      {blocks.map((b) =>
        b.type === "code" ? (
          <div key={b.id} className="rounded overflow-hidden border border-border">
            {b.lang && (
              <div className="px-2 py-0.5 text-[9px] font-mono text-muted-foreground bg-muted/50 border-b border-border uppercase tracking-wider">
                {b.lang}
              </div>
            )}
            <pre className="code-editor px-3 py-2 text-[11px] overflow-x-auto bg-[oklch(0.1_0_0)] leading-relaxed">
              <code>{b.code}</code>
            </pre>
          </div>
        ) : (
          <p key={b.id} className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">
            {b.text}
          </p>
        )
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
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || disabled) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    onSend(text);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  };

  return (
    <div className="flex flex-col h-full" data-ocid="chat.panel">

      {/* Messages area */}
      <ScrollArea className="flex-1 px-3">
        <div className="py-3 space-y-3">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="text-center py-14" data-ocid="chat.empty_state">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-xs text-muted-foreground">Describe what you want to build</p>
              <p className="text-[11px] text-muted-foreground/50 mt-1">AI generates code + live preview</p>
            </div>
          )}

          {/* API key notice */}
          {apiKeyMissing && messages.length === 0 && (
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-lg p-2.5" data-ocid="chat.api_key_notice">
              <Info className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
              <span>Add OpenRouter API key in <a href="/settings" className="text-primary hover:underline">Settings &rsaquo; API</a></span>
            </div>
          )}

          {/* Messages */}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={`msg-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "rounded-lg px-3 py-2",
                  msg.role === "user" ? "chat-bubble-user ml-6" : "chat-bubble-ai"
                )}
                data-ocid={`chat.item.${i + 1}`}
              >
                <span className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">
                  {msg.role === "user" ? "you" : "ai"}
                </span>
                <CodeBlock content={msg.content} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading */}
          {isLoading && (
            <div className="chat-bubble-ai rounded-lg px-3 py-2" data-ocid="chat.loading_state">
              <span className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">ai</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5" data-ocid="chat.error_state">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview shortcut -- appears after code is generated */}
          {hasCode && !isLoading && onPreview && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <button
                type="button"
                onClick={onPreview}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-[11px] text-primary"
              >
                <Monitor className="w-3 h-3" />
                Tap to open preview
              </button>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="px-3 py-2.5 border-t border-border shrink-0 bg-background">
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
            placeholder="Enter instruction or question..."
            disabled={disabled || isLoading}
            rows={1}
            className="resize-none text-[12px] bg-card border border-border rounded-md px-3 py-2 flex-1 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 leading-relaxed"
            style={{ fontSize: "16px", minHeight: "38px", maxHeight: "100px" }}
            data-ocid="chat.input"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || disabled}
            size="icon"
            className="h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
            data-ocid="chat.submit_button"
          >
            {isLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground/30 mt-1 ml-0.5">Enter · send &nbsp;&nbsp; Shift+Enter · new line</p>
      </div>
    </div>
  );
}
