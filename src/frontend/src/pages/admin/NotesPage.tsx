import { useEffect, useRef, useState } from "react";
import { FileText, Plus, Save, Trash2, X } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

const NOTE_COLORS = [
  "oklch(0.45 0.20 280)", // purple
  "oklch(0.45 0.20 160)", // green
  "oklch(0.45 0.20 60)",  // yellow
  "oklch(0.45 0.20 20)",  // red-orange
  "oklch(0.45 0.20 220)", // blue
  "oklch(0.45 0.20 330)", // pink
];

const STORAGE_KEY = "bf_admin_notes";

function loadNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

const DEFAULT_NOTES: Note[] = [
  {
    id: "roadmap-1",
    title: "Post-Stability Roadmap",
    content: `Phase A -- User Authentication
- Google Login (Supabase Auth + Google OAuth)
- User Profile: name, email, avatar
- Session persistence across devices

Phase B -- Admin Panel
- Owner dashboard (Richard only)
- User management: view, block/unblock
- Usage stats: apps built, credits used
- Announcements to users
- Published apps list

Phase C -- Credits & Plans
- Free: 10 credits/day, 3 projects, basic AI
- Pro: 50 credits/day, unlimited projects, fast models, publish to BrainForge URL
- Premium: Unlimited credits, all features, priority support

Phase D -- Inbuilt Publish (Netlify API)
- "Publish to BrainForge" button
- appname.netlify.app -- no user account needed
- Supabase mein record, Published tab in Projects

Phase E -- Support
- Contact form (Supabase table)
- FAQ section
- In-app bug report`,
    color: NOTE_COLORS[0],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "roadmap-2",
    title: "Priority Order (After Stability)",
    content: `1. Google Login (Supabase Auth) -- sabse pehle
2. Admin Panel -- login ke baad
3. Credits system -- Admin ke baad
4. Inbuilt Publish (Netlify) -- credits ke saath tie
5. Contact/Support page -- parallel mein`,
    color: NOTE_COLORS[4],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "security-notes",
    title: "Security Reminders",
    content: `🔴 URGENT
- GitHub token chat mein share mat karo
- Token rotate karo regularly
- Repo private rakho

🟠 IMPORTANT
- Cloudflare Worker secret (2200) -- Worker env vars mein badlo
- Admin panel URL kisi ko share mat karo
- API keys kabhi commit mat karo

🟡 ROUTINE
- D1 backup weekly trigger karo
- GitHub Actions logs monthly check karo
- API keys quarterly rotate karo

🟢 REMEMBER
- Session reset ho to restore prompt paste karo
- BrainForge update -- Admin > Master AI se kaho
- Har naya feature -- pehle confirm, phir build`,
    color: NOTE_COLORS[3],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "unresolved",
    title: "Unresolved Issues / TODOs",
    content: `- Cloudflare Pages direct-upload: GitHub-connected mode nahi ho sakta bina delete ke
- API Key Exposure: localStorage visible in DevTools -- Worker routing planned
- Master AI Push Reliability: confirmation + audit log needed
- Model Availability: free models change without notice, auto-rotation mitigates
- Multi-user support: not yet implemented (planned: Google login, credits)
- Inbuilt publish for users without CF/GitHub: planned via Worker/Netlify
- Figma/image-to-code: basic AI vision, full Figma import not done
- Team/collab features: not present`,
    color: NOTE_COLORS[3],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "daily-use-ideas",
    title: "Heavy Project Ideas (Daily Use)",
    content: `1. AI Personal Finance Tracker
   -- Roz expenses, AI budgeting, monthly reports
   -- Supabase + Charts + AI analysis

2. Smart Inventory Manager
   -- Barcode scan, low stock alert, purchase history
   -- Camera + Supabase + notifications

3. AI Study Companion
   -- Notes upload, AI quiz, flashcards, progress
   -- File upload + AI + Supabase

4. Local Business Directory + Booking
   -- Area services, direct booking, WhatsApp integration
   -- Supabase + maps

5. Family Task & Chores Manager
   -- Task assign, reminder, points for kids
   -- Auth + Supabase + notifications

6. AI Recipe & Meal Planner
   -- Fridge items → AI recipe → weekly plan
   -- AI + Supabase + shopping list`,
    color: NOTE_COLORS[1],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = loadNotes();
    if (stored.length === 0) {
      saveNotes(DEFAULT_NOTES);
      setNotes(DEFAULT_NOTES);
      setSelectedId(DEFAULT_NOTES[0].id);
    } else {
      setNotes(stored);
      setSelectedId(stored[0]?.id || null);
    }
  }, []);

  const selected = notes.find((n) => n.id === selectedId) || null;

  const addNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: "New Note",
      content: "",
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    saveNotes(updated);
    setSelectedId(newNote.id);
    setEditing(true);
    setTimeout(() => titleRef.current?.select(), 50);
  };

  const saveNote = () => {
    if (!selected || !titleRef.current || !contentRef.current) return;
    const updated = notes.map((n) =>
      n.id === selected.id
        ? {
            ...n,
            title: titleRef.current!.value || "Untitled",
            content: contentRef.current!.value,
            updatedAt: Date.now(),
          }
        : n
    );
    setNotes(updated);
    saveNotes(updated);
    setEditing(false);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    saveNotes(updated);
    setSelectedId(updated[0]?.id || null);
    setEditing(false);
  };

  const changeColor = (color: string) => {
    if (!selected) return;
    const updated = notes.map((n) =>
      n.id === selected.id ? { ...n, color, updatedAt: Date.now() } : n
    );
    setNotes(updated);
    saveNotes(updated);
  };

  return (
    <div className="flex h-full" style={{ background: "oklch(0.06 0.02 280)" }}>
      {/* Sidebar list */}
      <div
        className="w-56 shrink-0 flex flex-col border-r overflow-y-auto"
        style={{
          borderColor: "oklch(0.20 0.08 280)",
          background: "oklch(0.08 0.025 280)",
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-3 sticky top-0"
          style={{
            borderBottom: "1px solid oklch(0.18 0.06 280)",
            background: "oklch(0.08 0.025 280)",
          }}
        >
          <span className="text-xs font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" style={{ color: "oklch(0.65 0.25 280)" }} />
            Notes
          </span>
          <button
            type="button"
            onClick={addNote}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-80 transition"
            style={{ background: "oklch(0.55 0.25 280 / 0.2)", color: "oklch(0.75 0.25 280)" }}
            title="New note"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 py-1.5 px-2 space-y-0.5">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => { setSelectedId(note.id); setEditing(false); }}
              className="w-full text-left px-2.5 py-2 rounded-lg transition-all group"
              style={
                selectedId === note.id
                  ? { background: "oklch(0.55 0.25 280 / 0.15)", border: "1px solid oklch(0.55 0.25 280 / 0.3)" }
                  : { border: "1px solid transparent" }
              }
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: note.color }}
                />
                <span className="text-xs text-foreground truncate font-medium">{note.title}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 ml-4 truncate">
                {new Date(note.updatedAt).toLocaleDateString()}
              </p>
            </button>
          ))}
          {notes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
          )}
        </div>
      </div>

      {/* Note editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Toolbar */}
            <div
              className="flex items-center justify-between px-4 py-2.5 shrink-0"
              style={{
                borderBottom: "1px solid oklch(0.18 0.06 280)",
                background: "oklch(0.08 0.025 280)",
              }}
            >
              <div className="flex items-center gap-2">
                {/* Color picker */}
                <div className="flex items-center gap-1">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => changeColor(c)}
                      className="w-4 h-4 rounded-full transition-transform hover:scale-125"
                      style={{
                        background: c,
                        outline: selected.color === c ? `2px solid ${c}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground ml-1">
                  {new Date(selected.updatedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveNote}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition"
                      style={{
                        background: "oklch(0.55 0.25 280 / 0.2)",
                        color: "oklch(0.75 0.25 280)",
                        border: "1px solid oklch(0.55 0.25 280 / 0.3)",
                      }}
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition"
                    style={{
                      background: "oklch(0.55 0.25 280 / 0.15)",
                      color: "oklch(0.65 0.25 280)",
                      border: "1px solid oklch(0.55 0.25 280 / 0.25)",
                    }}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteNote(selected.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-red-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {editing ? (
                <div className="h-full flex flex-col gap-3 max-w-2xl">
                  <input
                    ref={titleRef}
                    defaultValue={selected.title}
                    className="w-full bg-transparent border-b text-base font-semibold text-foreground focus:outline-none pb-2"
                    style={{ borderColor: "oklch(0.25 0.08 280)" }}
                    placeholder="Note title..."
                  />
                  <textarea
                    ref={contentRef}
                    defaultValue={selected.content}
                    className="flex-1 w-full bg-transparent text-sm text-foreground/90 focus:outline-none resize-none leading-relaxed"
                    placeholder="Write your note here..."
                  />
                </div>
              ) : (
                <div className="max-w-2xl">
                  <h2 className="text-base font-semibold text-foreground mb-3">{selected.title}</h2>
                  <pre
                    className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed font-sans"
                  >
                    {selected.content || <span className="text-muted-foreground italic">Empty note. Click Edit to add content.</span>}
                  </pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Select a note or create a new one</p>
              <button
                type="button"
                onClick={addNote}
                className="px-4 py-2 rounded-lg text-xs font-medium transition"
                style={{
                  background: "oklch(0.55 0.25 280 / 0.15)",
                  color: "oklch(0.75 0.25 280)",
                  border: "1px solid oklch(0.55 0.25 280 / 0.3)",
                }}
              >
                + New Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
