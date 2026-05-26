import { Loader2, Plus, RefreshCw, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const GH_REPO = "richardbrownmiami-commits/devforge-ai";

function getGHToken() {
  return (
    JSON.parse(localStorage.getItem("bf_settings") || "{}").githubToken ||
    ""
  );
}

interface Task {
  id: string;
  text: string;
  done: boolean;
}
interface Section {
  emoji: string;
  title: string;
  key: string;
  tasks: Task[];
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function parseTodo(md: string): Section[] {
  const sections: Section[] = [
    { emoji: "🔴", title: "Urgent", key: "urgent", tasks: [] },
    { emoji: "🟠", title: "High", key: "high", tasks: [] },
    { emoji: "🟡", title: "Medium", key: "medium", tasks: [] },
    { emoji: "🟢", title: "Planned", key: "planned", tasks: [] },
    { emoji: "✅", title: "Done", key: "done", tasks: [] },
  ];
  let currentSection: Section | null = null;
  for (const line of md.split("\n")) {
    const secMatch = sections.find(
      (s) =>
        line.includes(s.emoji) ||
        line.toLowerCase().includes(`## ${s.title.toLowerCase()}`),
    );
    if (secMatch) {
      currentSection = secMatch;
      continue;
    }
    const doneMatch = line.match(/^- \[x\] (.+)/i);
    const todoMatch = line.match(/^- \[ \] (.+)/);
    if (doneMatch && currentSection)
      currentSection.tasks.push({
        id: makeId(),
        text: doneMatch[1],
        done: true,
      });
    else if (todoMatch && currentSection)
      currentSection.tasks.push({
        id: makeId(),
        text: todoMatch[1],
        done: false,
      });
  }
  return sections;
}

function buildTodo(sections: Section[], originalMd: string): string {
  const header = originalMd.split("\n").slice(0, 3).join("\n");
  return `${header}\n\n${sections
    .map(
      (s) =>
        `## ${s.emoji} ${s.title}\n${s.tasks.map((t) => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n")}`,
    )
    .join("\n\n")}\n`;
}

export function IssueTrackerPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [originalMd, setOriginalMd] = useState("");
  const [sha, setSha] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTodo = useCallback(async () => {
    setLoading(true);
    try {
      const token = getGHToken();
      const res = await fetch(
        `https://api.github.com/repos/${GH_REPO}/contents/TODO.md`,
        { headers: { Authorization: `token ${token}` } },
      );
      if (!res.ok) throw new Error("TODO.md not found");
      const data = await res.json();
      const content = atob(data.content.replace(/\n/g, ""));
      setOriginalMd(content);
      setSha(data.sha);
      setSections(parseTodo(content));
      setLastUpdated(new Date());
    } catch (e: any) {
      toast.error(e.message || "Failed to load TODO.md");
      setSections([
        { emoji: "🔴", title: "Urgent", key: "urgent", tasks: [] },
        { emoji: "🟠", title: "High", key: "high", tasks: [] },
        { emoji: "🟡", title: "Medium", key: "medium", tasks: [] },
        { emoji: "🟢", title: "Planned", key: "planned", tasks: [] },
        { emoji: "✅", title: "Done", key: "done", tasks: [] },
      ]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTodo();
  }, [fetchTodo]);

  const toggleTask = (sectionKey: string, taskId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.key !== sectionKey
          ? s
          : {
              ...s,
              tasks: s.tasks.map((t) =>
                t.id !== taskId ? t : { ...t, done: !t.done },
              ),
            },
      ),
    );
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setSections((prev) =>
      prev.map((s) =>
        s.key !== "urgent"
          ? s
          : {
              ...s,
              tasks: [
                { id: makeId(), text: newTask.trim(), done: false },
                ...s.tasks,
              ],
            },
      ),
    );
    setNewTask("");
  };

  const removeTask = (sectionKey: string, taskId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.key !== sectionKey
          ? s
          : { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) },
      ),
    );
  };

  const saveToGitHub = async () => {
    setSaving(true);
    try {
      const token = getGHToken();
      const content = buildTodo(sections, originalMd);
      const res = await fetch(
        `https://api.github.com/repos/${GH_REPO}/contents/TODO.md`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Update TODO via Admin Panel",
            content: btoa(unescape(encodeURIComponent(content))),
            sha,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setSha(data.content.sha);
        toast.success("TODO.md saved to GitHub!");
        setLastUpdated(new Date());
      } else {
        const e = await res.json();
        toast.error(e.message || "Save failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const cardStyle = {
    background: "oklch(0.10 0.025 280)",
    border: "1px solid oklch(0.20 0.08 280)",
  };
  const accentColor = "oklch(0.65 0.25 280)";

  return (
    <div
      className="p-4 md:p-6 space-y-5 max-w-3xl"
      data-ocid="admin.issues.page"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Issue Tracker</h1>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchTodo}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{
              background: "oklch(0.55 0.25 280 / 0.15)",
              border: "1px solid oklch(0.55 0.25 280 / 0.3)",
              color: accentColor,
            }}
            data-ocid="admin.issues.refresh_button"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={saveToGitHub}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "oklch(0.55 0.25 280)" }}
            data-ocid="admin.issues.save_button"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            Save to GitHub
          </button>
        </div>
      </div>

      {/* Add task */}
      <div className="flex gap-2">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add urgent task..."
          className="flex-1 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none"
          style={{
            background: "oklch(0.10 0.025 280)",
            border: "1px solid oklch(0.25 0.10 280)",
          }}
          data-ocid="admin.issues.input"
        />
        <button
          type="button"
          onClick={addTask}
          disabled={!newTask.trim()}
          className="px-3 py-2.5 rounded-xl text-white text-xs font-medium disabled:opacity-40 flex items-center gap-1"
          style={{ background: "oklch(0.55 0.25 280)" }}
          data-ocid="admin.issues.primary_button"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Sections */}
      {loading ? (
        <div
          className="flex items-center justify-center py-16"
          data-ocid="admin.issues.loading_state"
        >
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: accentColor }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.key}
              className="rounded-xl overflow-hidden"
              style={cardStyle}
            >
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderBottom: "1px solid oklch(0.18 0.06 280)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{section.emoji}</span>
                  <span className="text-xs font-semibold text-foreground">
                    {section.title}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "oklch(0.55 0.25 280 / 0.1)",
                      color: accentColor,
                    }}
                  >
                    {section.tasks.length}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {section.tasks.filter((t) => t.done).length}/
                  {section.tasks.length} done
                </span>
              </div>
              {section.tasks.length === 0 ? (
                <div className="px-4 py-4 text-xs text-muted-foreground text-center">
                  No tasks
                </div>
              ) : (
                <div
                  className="divide-y"
                  style={{ borderColor: "oklch(0.15 0.04 280)" }}
                >
                  {section.tasks.map((task, ti) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 px-4 py-3 group"
                      data-ocid={`admin.issues.item.${ti + 1}`}
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(section.key, task.id)}
                        className="mt-0.5 w-3.5 h-3.5 rounded shrink-0 cursor-pointer accent-violet-500"
                        data-ocid={`admin.issues.checkbox.${ti + 1}`}
                      />
                      <span
                        className={`flex-1 text-xs ${
                          task.done
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {task.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTask(section.key, task.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity text-muted-foreground hover:text-red-400"
                        data-ocid={`admin.issues.delete_button.${ti + 1}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
