import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Loader2, Trash2 } from "lucide-react";

const API = "https://brainforge-api.richard-brown-miami.workers.dev";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, history }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.error || "No response" }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Network error - check your connection." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">AI Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <Bot className="w-12 h-12 text-primary/40" />
            <div>
              <p className="text-sm font-medium text-foreground">BrainForge AI Chat</p>
              <p className="text-xs text-muted-foreground mt-1">Ask me anything about your project, architecture, or code</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary/20 text-foreground rounded-br-sm"
                  : "bg-muted/50 text-foreground rounded-bl-sm border border-border/50"
              }`}
              style={msg.role === "user" ? { background: "oklch(0.76 0.16 158 / 0.15)" } : {}}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-primary/70" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="max-w-[80%] rounded-xl px-4 py-3 bg-muted/50 border border-border/50">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-4 py-4 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 h-10 rounded-lg px-4 text-sm bg-muted/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center disabled:opacity-40 transition-colors hover:bg-primary/80"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
