import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronDown, ChevronUp, Code2, Info, Loader2, Monitor, Send, Trash2, Wrench } from "lucide-react";
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

type Block = { type: "text"; id: string; text: string } | { type: "code"; id: string; lang: string; code: string };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0; let idx = 0; let m = regex.exec(content);
  while (m) {
    if (m.index > last) blocks.push({ type: "text", id: `t-${idx++}`, text: content.slice(last, m.index) });
    blocks.push({ type: "code", id: `c-${idx++}`, lang: m[1] || "text", code: m[2] });
    last = m.index + m[0].length; m = regex.exec(content);
  }
  if (last < content.length) blocks.push({ type: "text", id: `t-${idx++}`, text: content.slice(last) });
  if (!blocks.length) blocks.push({ type: "text", id: "t-0", text: content });
  return blocks;
}

function CodeBadge({ lang, lines, onPreview }: { lang: string; lines: number; onPreview?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-green-500/30 bg-green-950/20 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-green-400" />
          <span className="text-[11px] font-mono text-green-400 uppercase tracking-wider">{lang || "code"}</span>
          <span className="text-[10px] text-green-600">{lines} lines</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onPreview && (
            <button type="button" onClick={onPreview} className="text-[10px] text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2 py-0.5 rounded-full">
              Preview
            </button>
          )}
          <button type="button" onClick={() => setOpen(v => !v)} className="text-green-600 hover:text-green-400">
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function AiMessage({ content, onPreview }: { content: string; onPreview?: () => void }) {
  const blocks = parseBlocks(content);
  const texts = blocks.filter(b => b.type === "text");
  const codes = blocks.filter(b => b.type === "code");
  return (
    <div className="space-y-2">
      {texts.map(b => b.type === "text" && b.text.trim() ? (
        <p key={b.id} className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">{b.text.trim()}</p>
      ) : null)}
      {codes.length > 0 && (
        <div className="space-y-1.5 mt-1">
          {codes.map(b => b.type === "code" ? <CodeBadge key={b.id} lang={b.lang} lines={b.code.split("\n").length} onPreview={onPreview} /> : null)}
        </div>
      )}
    </div>
  );
}

export function ChatPanel({ messages, isLoading, error, onSend, onClear, disabled, apiKeyMissing, onPreview, hasCode, initialMessage, autoFixStatus }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only
  useEffect(() => { if (initialMessage) setInput(initialMessage); }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading, autoFixStatus]);

  const handleSend = () => {
    const t = input.trim(); if (!t || isLoading || disabled) return;
    setInput(""); if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend(t);
  };

  return (
    <div className="flex flex-col h-full" data-ocid="chat.panel">
      <ScrollArea className="flex-1 px-3">
        <div className="py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-14" data-ocid="chat.empty_state">
              <div className="text-3xl mb-2">⚡</div>
              <p className="text-xs text-muted-foreground">Describe what you want to build</p>
              <p className="text-[11px] text-muted-foreground/50 mt-1">AI generates complete working code + live preview</p>
            </div>
          )}
          {apiKeyMissing && messages.length === 0 && (
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-lg p-2.5">
              <Info className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
              <span>Add API key in <a href="/settings" className="text-primary underline">Settings › API</a></span>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div key={`${msg.role}-${i}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                className={cn("rounded-xl px-3 py-2.5", msg.role === "user" ? "chat-bubble-user ml-8" : "chat-bubble-ai")}
                data-ocid={`chat.item.${i + 1}`}>
                <span className={cn("text-[9px] font-mono uppercase block mb-1.5 tracking-wider", msg.role === "user" ? "text-violet-300/70" : "text-cyan-400/70")}>
                  {msg.role === "user" ? "you" : "✦ ai"}
                </span>
                {msg.role === "assistant" ? <AiMessage content={msg.content} onPreview={onPreview} /> : (
                  <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">{msg.content}</p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {autoFixStatus && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <Wrench className="w-3.5 h-3.5 text-orange-400 animate-spin" />
              <span className="text-[11px] text-orange-400">{autoFixStatus}</span>
            </motion.div>
          )}

          {isLoading && (
            <div className="chat-bubble-ai rounded-xl px-3 py-2.5" data-ocid="chat.loading_state">
              <span className="text-[9px] font-mono text-cyan-400/70 uppercase block mb-1.5">✦ ai</span>
              <div className="flex gap-1">
                {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: `${i*0.15}s` }} />)}
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-2.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          {hasCode && !isLoading && !autoFixStatus && onPreview && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <button type="button" onClick={onPreview}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-violet-500/10 hover:from-primary/20 hover:to-violet-500/20 text-[11px] text-primary font-medium">
                <Monitor className="w-3.5 h-3.5" /> Open Preview
              </button>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="px-3 py-2.5 border-t border-border shrink-0 bg-background">
        {messages.length > 0 && (
          <div className="flex justify-end mb-1">
            <button type="button" onClick={onClear} className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-destructive">
              <Trash2 className="w-2.5 h-2.5" /> Clear
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea ref={textareaRef} value={input}
            onChange={e => { setInput(e.target.value); const el = e.target; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight,120)}px`; }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Describe what you want to build..."
            disabled={disabled || isLoading} rows={1}
            className="resize-none bg-card border border-border rounded-xl px-3 py-2 flex-1 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 overflow-hidden"
            style={{ fontSize: "16px", minHeight: "38px", maxHeight: "120px" }} data-ocid="chat.input" />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading || disabled} size="icon"
            className="h-9 w-9 bg-gradient-to-br from-primary to-violet-600 hover:opacity-90 text-primary-foreground shrink-0 rounded-xl" data-ocid="chat.submit_button">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground/30 mt-1">Enter · send  Shift+Enter · new line</p>
      </div>
    </div>
  );
}
