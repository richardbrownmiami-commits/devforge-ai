import { getFeedback, saveFeedback, type Feedback } from "../../lib/userUtils";
import { CheckCircle, MessageSquare, Send, X } from "lucide-react";
import { useState } from "react";

const TYPE_COLORS: Record<string, string> = {
  suggest: "oklch(0.65 0.25 260)",
  feedback: "oklch(0.65 0.25 150)",
  issue: "oklch(0.65 0.25 30)",
};
const TYPE_LABELS: Record<string, string> = {
  suggest: "💡 Suggestion",
  feedback: "👍 Feedback",
  issue: "🐛 Issue",
};

export function FeedbackAdminPage() {
  const [items, setItems] = useState<Feedback[]>(() => getFeedback());
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "replied">("all");

  const filtered = items.filter(f => filter === "all" ? true : filter === "open" ? f.status === "open" : f.status === "replied");

  const handleReply = (id: string) => {
    if (!replyText.trim()) return;
    const updated = items.map(f => f.id === id ? {
      ...f, adminReply: replyText.trim(), adminReplyAt: new Date().toISOString(),
      status: "replied" as const, replyRead: false,
    } : f);
    saveFeedback(updated);
    setItems(updated);
    setReplyId(null);
    setReplyText("");
  };

  const handleClose = (id: string) => {
    const updated = items.map(f => f.id === id ? { ...f, status: "closed" as const } : f);
    saveFeedback(updated);
    setItems(updated);
  };

  const relTime = (ts: string) => {
    const d = Date.now() - new Date(ts).getTime();
    const m = Math.floor(d / 60000), h = Math.floor(m / 60), dy = Math.floor(h / 24);
    return dy > 0 ? `${dy}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : "Just now";
  };

  const openCount = items.filter(f => f.status === "open").length;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Feedback & Issues
          {openCount > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: "oklch(0.55 0.25 30)" }}>{openCount} open</span>}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Testers ki feedback, suggestions, aur issues</p>
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "oklch(0.10 0.02 280)" }}>
        {(["all", "open", "replied"] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize"
            style={filter === f ? { background: "oklch(0.55 0.25 280)", color: "white" } : { color: "oklch(0.55 0.05 280)" }}>
            {f === "all" ? `All (${items.length})` : f === "open" ? `Open (${items.filter(i => i.status === "open").length})` : `Replied (${items.filter(i => i.status === "replied").length})`}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Koi {filter !== "all" ? filter : ""} feedback nahi</p>
          </div>
        ) : filtered.map(item => (
          <div key={item.id} className="rounded-xl p-4 space-y-3"
            style={{ background: "oklch(0.10 0.02 280)", border: `1px solid ${TYPE_COLORS[item.type]}40` }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "oklch(0.55 0.25 280 / 0.2)", color: "oklch(0.75 0.25 280)" }}>
                  {item.username[0].toUpperCase()}
                </span>
                <div>
                  <span className="text-xs font-medium text-foreground">{item.username}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded ml-2 font-medium"
                    style={{ background: TYPE_COLORS[item.type] + "20", color: TYPE_COLORS[item.type] }}>
                    {TYPE_LABELS[item.type]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">{relTime(item.timestamp)}</span>
                {item.status !== "closed" && (
                  <button type="button" onClick={() => handleClose(item.id)}
                    className="p-1 text-muted-foreground hover:text-foreground" title="Close">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-sm text-foreground">{item.message}</p>

            {item.adminReply && (
              <div className="rounded-lg p-3" style={{ background: "oklch(0.55 0.25 280 / 0.08)", border: "1px solid oklch(0.55 0.25 280 / 0.2)" }}>
                <p className="text-[10px] text-muted-foreground mb-1">Tumhara reply:</p>
                <p className="text-xs text-foreground">{item.adminReply}</p>
              </div>
            )}

            {replyId === item.id ? (
              <div className="space-y-2">
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                  placeholder="Reply likho..."
                  rows={2} className="w-full rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none"
                  style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.25 0.08 280 / 0.5)" }}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleReply(item.id)} disabled={!replyText.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white font-medium disabled:opacity-40"
                    style={{ background: "oklch(0.55 0.25 280)" }}>
                    <Send className="w-3 h-3" /> Bhejo
                  </button>
                  <button type="button" onClick={() => { setReplyId(null); setReplyText(""); }}
                    className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground"
                    style={{ background: "oklch(0.12 0.02 280)" }}>Cancel</button>
                </div>
              </div>
            ) : item.status !== "closed" && (
              <button type="button" onClick={() => { setReplyId(item.id); setReplyText(item.adminReply || ""); }}
                className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-80"
                style={{ color: "oklch(0.65 0.25 280)" }}>
                <Send className="w-3 h-3" /> {item.adminReply ? "Reply Edit Karo" : "Reply Karo"}
              </button>
            )}
            {item.status === "closed" && (
              <p className="text-[10px] flex items-center gap-1" style={{ color: "oklch(0.55 0.15 150)" }}>
                <CheckCircle className="w-3 h-3" /> Closed
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
