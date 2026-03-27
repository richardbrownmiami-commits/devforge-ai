import { addFeedback, getCurrentUser, getFeedback, getUnreadCount, markNotificationsRead } from "../lib/userUtils";
import { X, Bell } from "lucide-react";
import { useEffect, useState } from "react";

const TYPES = [
  { value: "suggest" as const, label: "💡 Suggestion", color: "oklch(0.60 0.25 260)" },
  { value: "feedback" as const, label: "👍 Feedback", color: "oklch(0.60 0.25 150)" },
  { value: "issue" as const, label: "🐛 Issue", color: "oklch(0.60 0.25 30)" },
];

// Broadcast announcement banner for users
function BroadcastBanner() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      try {
        const list = JSON.parse(localStorage.getItem("bf_announcements") || "[]");
        const seen = new Set<string>(JSON.parse(localStorage.getItem("bf_announcements_seen") || "[]"));
        const unread = list.filter((a: any) => !seen.has(a.id));
        setAnnouncements(unread);
        setDismissed(seen);
      } catch {}
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = (id: string) => {
    const newSeen = new Set([...dismissed, id]);
    localStorage.setItem("bf_announcements_seen", JSON.stringify([...newSeen]));
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    setDismissed(newSeen);
  };

  if (announcements.length === 0) return null;

  const typeColors: Record<string, { bg: string; border: string; text: string }> = {
    info: { bg: "oklch(0.55 0.25 220 / 0.12)", border: "oklch(0.55 0.25 220 / 0.4)", text: "oklch(0.80 0.20 220)" },
    warning: { bg: "oklch(0.55 0.25 60 / 0.12)", border: "oklch(0.55 0.25 60 / 0.4)", text: "oklch(0.80 0.25 60)" },
    success: { bg: "oklch(0.50 0.20 160 / 0.12)", border: "oklch(0.50 0.20 160 / 0.4)", text: "oklch(0.75 0.20 160)" },
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 space-y-2">
      {announcements.slice(0, 2).map(a => {
        const c = typeColors[a.type] || typeColors.info;
        return (
          <div key={a.id} className="rounded-xl px-4 py-3 flex items-start gap-3 shadow-xl"
            style={{ background: c.bg, border: `1px solid ${c.border}`, backdropFilter: "blur(12px)" }}>
            <span className="text-base shrink-0">{a.type === "warning" ? "⚠️" : a.type === "success" ? "✅" : "📢"}</span>
            <p className="flex-1 text-sm leading-relaxed" style={{ color: c.text }}>{a.message}</p>
            <button type="button" onClick={() => dismiss(a.id)}
              className="shrink-0 text-lg leading-none opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: c.text }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [type, setType] = useState<"suggest" | "feedback" | "issue">("feedback");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [unread, setUnread] = useState(0);

  const user = getCurrentUser();

  useEffect(() => {
    if (!user) return;
    setUnread(getUnreadCount(user));
    const interval = setInterval(() => setUnread(getUnreadCount(user!)), 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Listen for sidebar "Feedback" nav click
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("openFeedback", handler);
    return () => window.removeEventListener("openFeedback", handler);
  }, []);

  if (!user) return (
    <>
      <BroadcastBanner />
    </>
  );

  const myFeedback = getFeedback().filter(f => f.username === user && f.adminReply);

  const handleSend = () => {
    if (!message.trim()) return;
    addFeedback(type, message);
    setMessage("");
    setSent(true);
    setTimeout(() => { setSent(false); setOpen(false); }, 2000);
  };

  const handleOpenNotif = () => {
    setNotifOpen(true);
    markNotificationsRead(user);
    setUnread(0);
  };

  return (
    <>
      <BroadcastBanner />

      {/* Notification bell (only if admin has replied) */}
      {myFeedback.length > 0 && (
        <button type="button" onClick={handleOpenNotif}
          title="Admin replies"
          className="fixed bottom-5 right-5 z-30 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
          style={{ background: "oklch(0.55 0.25 200)", border: "1px solid oklch(0.70 0.20 200 / 0.5)" }}>
          <Bell className="w-4 h-4 text-white" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
              style={{ background: "oklch(0.55 0.25 30)" }}>{unread}</span>
          )}
        </button>
      )}

      {/* Feedback modal (triggered from sidebar) */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
          <div className="w-80 rounded-2xl border p-5 space-y-4 shadow-2xl pointer-events-auto"
            style={{ background: "oklch(0.10 0.025 280)", borderColor: "oklch(0.30 0.15 280 / 0.5)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Send Feedback</h3>
              <button type="button" onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            {sent ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm text-foreground">Bhej diya! Admin dekh lega.</p>
              </div>
            ) : (<>
              <div className="flex gap-1.5">
                {TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setType(t.value)}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                    style={type === t.value ? { background: t.color + "30", border: `1px solid ${t.color}`, color: t.color } : { background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.20 0.05 280)", color: "oklch(0.50 0.05 280)" }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Apni baat yahan likho..."
                rows={4} className="w-full rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none"
                style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.25 0.08 280 / 0.5)" }}
              />
              <button type="button" onClick={handleSend} disabled={!message.trim()}
                className="w-full py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                style={{ background: "oklch(0.55 0.25 280)" }}>
                Bhejo
              </button>
            </>)}
          </div>
        </div>
      )}

      {/* Notifications modal */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
          <div className="w-80 rounded-2xl border p-5 space-y-3 shadow-2xl pointer-events-auto max-h-96 overflow-y-auto"
            style={{ background: "oklch(0.10 0.025 280)", borderColor: "oklch(0.30 0.15 200 / 0.5)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">📬 Admin Replies</h3>
              <button type="button" onClick={() => setNotifOpen(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            {myFeedback.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Abhi koi reply nahi aaya</p>
            ) : myFeedback.map(f => (
              <div key={f.id} className="rounded-lg p-3 space-y-2"
                style={{ background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.20 0.05 280)" }}>
                <p className="text-[10px] text-muted-foreground">Tumhari {f.type}: <span className="text-foreground">{f.message}</span></p>
                <p className="text-xs" style={{ color: "oklch(0.70 0.20 200)" }}>Admin: {f.adminReply}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
