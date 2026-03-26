import { Bell, CheckCircle, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Announcement { id: string; message: string; type: "info"|"warning"|"success"; createdAt: string; }

const STORAGE_KEY = "bf_announcements";

function getAnnouncements(): Announcement[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveAnnouncements(list: Announcement[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function BroadcastPage() {
  const [list, setList] = useState<Announcement[]>(() => getAnnouncements());
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<"info"|"warning"|"success">("info");
  const cardStyle = { background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" };

  const send = () => {
    if (!msg.trim()) return;
    const item: Announcement = { id: Date.now().toString(), message: msg.trim(), type, createdAt: new Date().toISOString() };
    const updated = [item, ...list];
    saveAnnouncements(updated);
    setList(updated);
    setMsg("");
    toast.success("Broadcast bhej diya! Sab users ko dikhega.");
  };

  const remove = (id: string) => {
    const updated = list.filter(a => a.id !== id);
    saveAnnouncements(updated);
    setList(updated);
  };

  const typeColors = {
    info: { bg: "oklch(0.55 0.25 220 / 0.1)", border: "oklch(0.55 0.25 220 / 0.3)", text: "oklch(0.70 0.25 220)" },
    warning: { bg: "oklch(0.55 0.25 60 / 0.1)", border: "oklch(0.55 0.25 60 / 0.3)", text: "oklch(0.75 0.25 60)" },
    success: { bg: "oklch(0.50 0.20 160 / 0.1)", border: "oklch(0.50 0.20 160 / 0.3)", text: "oklch(0.65 0.20 160)" },
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-yellow-400" /> Broadcast
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Sab users ko ek saath message bhejo — app mein notification ke roop mein dikhega.</p>
      </div>

      {/* Compose */}
      <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <p className="text-sm font-semibold text-foreground">Naya Announcement</p>
        <div className="flex gap-2">
          {(["info","warning","success"] as const).map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
              style={type === t
                ? { background: typeColors[t].bg, border: `1px solid ${typeColors[t].border}`, color: typeColors[t].text }
                : { background: "oklch(0.08 0.02 280)", border: "1px solid oklch(0.18 0.06 280)", color: "oklch(0.55 0.05 280)" }
              }>{t}</button>
          ))}
        </div>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3}
          placeholder="Message likho jo sab users ko dikhega..."
          className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none"
          style={{ background: "oklch(0.07 0.02 280)", border: "1px solid oklch(0.22 0.07 280 / 0.6)" }} />
        <button type="button" onClick={send} disabled={!msg.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "oklch(0.55 0.25 280)" }}>
          <Send className="w-4 h-4" /> Broadcast Bhejo
        </button>
      </div>

      {/* Active announcements */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active ({list.length})</p>
        {list.length === 0 ? (
          <div className="rounded-xl p-6 text-center text-xs text-muted-foreground" style={cardStyle}>Koi announcement nahi</div>
        ) : list.map(a => (
          <div key={a.id} className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: typeColors[a.type].bg, border: `1px solid ${typeColors[a.type].border}` }}>
            <Bell className="w-4 h-4 mt-0.5 shrink-0" style={{ color: typeColors[a.type].text }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{a.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {a.type} · {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
            <button type="button" onClick={() => remove(a.id)}
              className="p-1 text-muted-foreground hover:text-red-400 transition-colors shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
