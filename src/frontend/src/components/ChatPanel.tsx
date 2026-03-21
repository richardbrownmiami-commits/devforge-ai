import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    if (result.index > last) blocks.push({ type: "text", id: `t-${idx++}`, text: content.slice(last, result.index) });
    blocks.push({ type: "code", id: `c-${idx++}`, lang: result[1] || "text", code: result[2] });
    last = result.index + result[0].length;
    result = regex.exec(content);
  }
  if (last < content.length) blocks.push({ type: "text", id: `t-${idx++}`, text: content.slice(last) });
  if (blocks.length === 0) blocks.push({ type: "text", id: "t-0", text: content });
  return blocks;
}

function CodeBlock({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className="space-y-2">
      {blocks.map((b) =>
        b.type === "code" ? (
          <div key={b.id} className="rounded-md overflow-hidden border border-border">
            {b.lang && (
              <div className="px-3 py-1 text-[10px] font-mono text-muted-foreground bg-muted/50 border-b border-border">{b.lang}</div>
            )}
            <pre className="code-editor p-3 text-xs overflow-x-auto bg-[oklch(0.1_0_0)]">
              <code>{b.code}</code>
            </pre>
          </div>
        ) : (
          <p key={b.id} className="text-sm leading-relaxed whitespace-pre-wrap">{b.text}</p>
        )
      )}
    </div>
  );
}

export function ChatPanel({ messages, isLoading, error, onSend, onClear, disabled, apiKeyMissing }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message/loading change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || disabled) return;
    setInput("");
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea as user types
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full" data-ocid="chat.panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-sm font-medium text-foreground">Chat</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onClear} data-ocid="chat.clear.button">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Messages -- flex-1 fills all remaining space */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16" data-ocid="chat.empty_state">
              <div className="text-3xl mb-3">⚡</div>
              <p className="text-sm text-muted-foreground">Describe what you want to build</p>
              <p className="text-xs text-muted-foreground/60 mt-1">AI will generate the code and preview it instantly</p>
            </div>
          )}
          {apiKeyMissing && messages.length === 0 && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg p-3" data-ocid="chat.api_key_notice">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              <span>Add your OpenRouter API key in <a href="/settings" className="text-primary hover:underline">Settings &rsaquo; API</a> to enable AI</span>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={`msg-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn("rounded-lg p-3", msg.role === "user" ? "chat-bubble-user ml-8" : "chat-bubble-ai")}
                data-ocid={`chat.item.${i + 1}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase shrink-0 mt-0.5">
                    {msg.role === "user" ? "you" : "ai"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <CodeBlock content={msg.content} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="chat-bubble-ai rounded-lg p-3" data-ocid="chat.loading_state">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">ai</span>
                <div className="flex gap-1">
                  {["d0","d1","d2"].map((id, i) => (
                    <span key={id} className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3" data-ocid="chat.error_state">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input bar -- always at bottom, never clipped */}
      <div className="px-3 py-3 border-t border-border shrink-0 bg-background">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Enter instruction or question..."
            disabled={disabled || isLoading}
            rows={1}
            className="resize-none text-sm bg-card border border-border rounded-md px-3 py-2 flex-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 leading-relaxed"
            style={{ fontSize: "16px", minHeight: "40px", maxHeight: "120px" }}
            data-ocid="chat.input"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || disabled}
            size="icon"
            className="h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
            data-ocid="chat.submit_button"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-1.5 ml-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
