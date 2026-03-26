import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Clock,
  Code2,
  ExternalLink,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
} from "../hooks/useBackend";

function formatTime(ts: bigint): string {
  try {
    const ms = Number(ts) / 1_000_000;
    if (ms === 0) return "Just now";
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "Just now";
  } catch {
    return "—";
  }
}

const TEMPLATES = [
  {
    id: "blank",
    icon: "⚡",
    label: "Blank",
    desc: "Start from scratch",
    color: "oklch(0.55 0.18 280)",
    bg: "oklch(0.55 0.18 280 / 0.12)",
    prompt: "",
  },
  {
    id: "landing",
    icon: "🌐",
    label: "Landing Page",
    desc: "Hero, features, CTA sections",
    color: "oklch(0.55 0.18 200)",
    bg: "oklch(0.55 0.18 200 / 0.12)",
    prompt: "Build a stunning modern landing page with: 1) Hero section with animated gradient background, headline, subtext, and CTA button 2) Features section with 3 icon cards 3) Testimonials section 4) Footer. Dark theme, smooth scroll animations, fully responsive.",
  },
  {
    id: "dashboard",
    icon: "📊",
    label: "Dashboard",
    desc: "Stats, charts, data tables",
    color: "oklch(0.55 0.18 160)",
    bg: "oklch(0.55 0.18 160 / 0.12)",
    prompt: "Build a professional analytics dashboard with: 1) Top stats row with 4 KPI cards showing numbers with trend arrows 2) A bar chart and line chart side by side 3) A data table with sortable columns 4) Sidebar navigation. Dark theme, Chart.js CDN.",
  },
  {
    id: "game",
    icon: "🎮",
    label: "Browser Game",
    desc: "Interactive canvas game",
    color: "oklch(0.55 0.18 60)",
    bg: "oklch(0.55 0.18 60 / 0.12)",
    prompt: "Build a fun browser game using HTML5 canvas. Include: start screen with instructions, smooth game loop with increasing difficulty, score counter, lives system, particle effects on events, and game over screen with high score. Dark neon theme.",
  },
  {
    id: "todo",
    icon: "✅",
    label: "Todo App",
    desc: "Task manager with filters",
    color: "oklch(0.55 0.18 130)",
    bg: "oklch(0.55 0.18 130 / 0.12)",
    prompt: "Build a beautiful todo app with: add/edit/delete tasks, mark complete, filter by All/Active/Completed, drag to reorder, local storage persistence, task count. Dark theme with smooth animations.",
  },
  {
    id: "chat",
    icon: "💬",
    label: "Chat UI",
    desc: "Messaging interface",
    color: "oklch(0.55 0.18 320)",
    bg: "oklch(0.55 0.18 320 / 0.12)",
    prompt: "Build a chat app UI with: contacts sidebar with online status, message bubbles (sent/received), timestamp, typing indicator animation, emoji support, message input with send button. Dark theme, mobile-friendly.",
  },
  {
    id: "portfolio",
    icon: "🎨",
    label: "Portfolio",
    desc: "Personal showcase site",
    color: "oklch(0.55 0.18 30)",
    bg: "oklch(0.55 0.18 30 / 0.12)",
    prompt: "Build a creative developer portfolio with: animated hero with name and role, skills section with progress bars, projects grid with hover effects, contact form, smooth animations throughout. Dark minimal design.",
  },
  {
    id: "expense",
    icon: "💰",
    label: "Expense Tracker",
    desc: "Finance with charts",
    color: "oklch(0.55 0.18 100)",
    bg: "oklch(0.55 0.18 100 / 0.12)",
    prompt: "Build an expense tracker with: add expense (amount, category, note, date), expenses list with delete, category breakdown pie chart, monthly total, filter by category. Uses localStorage. Dark theme with Chart.js.",
  },
  {
    id: "notes",
    icon: "📝",
    label: "Notes App",
    desc: "Rich text note taking",
    color: "oklch(0.55 0.18 240)",
    bg: "oklch(0.55 0.18 240 / 0.12)",
    prompt: "Build a notes app with: sidebar list of notes, click to open/edit, create new note, delete note, auto-save to localStorage, search notes, color tag labels, and timestamps. Dark theme, minimal design.",
  },
] as const;

const PROJECT_COLORS = [
  "oklch(0.55 0.25 280)",
  "oklch(0.55 0.20 200)",
  "oklch(0.55 0.20 160)",
  "oklch(0.55 0.20 60)",
  "oklch(0.55 0.20 320)",
  "oklch(0.55 0.20 30)",
];

function getProjectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

function ProjectCard({ project, index, onOpen, onDelete }: {
  project: any;
  index: number;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const color = getProjectColor(project.name);
  const deployUrl = localStorage.getItem(`bf_deploy_url_${project.name}`);
  const lang = localStorage.getItem(`bf_lang_${project.name}`) || "html";
  const initials = project.name.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
    >
      <button
        type="button"
        className="group w-full text-left rounded-xl border transition-all duration-200 overflow-hidden"
        style={{
          background: "oklch(0.10 0.02 280)",
          borderColor: "oklch(0.20 0.06 280)",
        }}
        onClick={onOpen}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = color.replace(")", " / 0.5)").replace("oklch(", "oklch(");
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${color.replace(")", " / 0.12)").replace("oklch(", "oklch(")}`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.20 0.06 280)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        {/* Color bar top */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color.replace("0.55", "0.35")})` }} />

        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}, ${color.replace("0.55", "0.35")})` }}
            >
              {initials}
            </div>
            {/* Delete btn */}
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
              style={{ color: "oklch(0.55 0.15 20)" }}
              onClick={onDelete}
              title="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="font-semibold text-sm text-foreground truncate mb-1">{project.name}</p>

          <div className="flex items-center gap-2 mt-2">
            <span
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: "oklch(0.55 0.18 280 / 0.12)", color: "oklch(0.65 0.18 280)" }}
            >
              <Code2 className="w-2.5 h-2.5" />
              {lang === "react-tailwind" ? "React" : lang}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(project.lastModified)}
            </span>
          </div>

          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 mt-2 text-[10px] hover:underline"
              style={{ color: "oklch(0.65 0.18 160)" }}
            >
              <ExternalLink className="w-2.5 h-2.5" />
              Live
            </a>
          )}
        </div>
      </button>
    </motion.div>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const [newName, setNewName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!search) return projects;
    return projects.filter((p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [projects, search]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createProject.mutateAsync(name);
      setNewName("");
      setDialogOpen(false);
      setPendingName(name);
      setTemplateOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to create project");
    }
  };

  const handleTemplateSelect = (prompt: string) => {
    setTemplateOpen(false);
    if (prompt) localStorage.setItem(`bf_starter_${pendingName}`, prompt);
    toast.success(`Project "${pendingName}" created!`);
    navigate({ to: "/editor/$projectName", params: { projectName: pendingName } });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject.mutateAsync(deleteTarget);
      toast.success(`Deleted "${deleteTarget}"`);
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" data-ocid="projects.page">

      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: "oklch(0.18 0.05 280)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "oklch(0.55 0.25 280 / 0.15)" }}
          >
            <Zap className="w-4 h-4" style={{ color: "oklch(0.70 0.25 280)" }} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">My Projects</h1>
            <p className="text-[11px] text-muted-foreground">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.25 280), oklch(0.45 0.25 300))",
                color: "white",
              }}
              data-ocid="projects.create.open_modal_button"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border" data-ocid="projects.create.dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                New Project
              </DialogTitle>
            </DialogHeader>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="my-awesome-app"
              className="bg-background border-border"
              data-ocid="projects.name.input"
              autoFocus
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || createProject.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-ocid="projects.create.confirm_button"
              >
                {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search bar */}
      {projects.length > 3 && (
        <div
          className="px-6 py-3 border-b shrink-0"
          style={{ borderColor: "oklch(0.18 0.05 280)" }}
        >
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-transparent border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1"
              style={{
                borderColor: "oklch(0.22 0.06 280)",
                background: "oklch(0.10 0.02 280)",
              }}
            />
          </div>
        </div>
      )}

      {/* Template Picker */}
      <Dialog open={templateOpen} onOpenChange={(o) => { if (!o) handleTemplateSelect(""); }}>
        <DialogContent
          className="bg-card border-border max-w-lg"
          data-ocid="projects.template.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Choose a Template
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            Pick a starting point or choose Blank to start fresh.
          </p>
          <div className="grid grid-cols-3 gap-2 mt-1 max-h-80 overflow-y-auto pr-1">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTemplateSelect(t.prompt)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105"
                style={{
                  background: t.bg,
                  borderColor: t.color.replace("0.55", "0.25").replace(")", " / 0.3)").replace("oklch(", "oklch("),
                }}
                data-ocid={`projects.template.${t.id}`}
              >
                <span className="text-2xl">{t.icon}</span>
                <p className="text-[11px] font-semibold text-foreground text-center leading-tight">{t.label}</p>
                <p className="text-[10px] text-muted-foreground text-center leading-tight">{t.desc}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "oklch(0.65 0.25 280)" }} />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load projects</p>
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "oklch(0.55 0.25 280 / 0.10)" }}
            >
              <FolderOpen className="w-7 h-7" style={{ color: "oklch(0.55 0.25 280 / 0.5)" }} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No projects yet</p>
            <p className="text-xs text-muted-foreground mb-4">Create your first project to start building</p>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.25 280), oklch(0.45 0.25 300))",
                color: "white",
              }}
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              Create First Project
            </button>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((project: any, i: number) => (
                <ProjectCard
                  key={project.name}
                  project={project}
                  index={i}
                  onOpen={() => navigate({ to: "/editor/$projectName", params: { projectName: project.name } })}
                  onDelete={(e) => { e.stopPropagation(); setDeleteTarget(project.name); }}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="bg-card border-border" data-ocid="projects.delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong className="text-foreground">"{deleteTarget}"</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
              data-ocid="projects.delete.confirm_button"
            >
              {deleteProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
