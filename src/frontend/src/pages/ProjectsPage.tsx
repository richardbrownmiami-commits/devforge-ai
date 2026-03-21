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
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Clock,
  ExternalLink,
  FileCode,
  FolderOpen,
  Github,
  Globe,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useSettings,
} from "../hooks/useBackend";

function formatTime(ts: bigint): string {
  try {
    const ms = Number(ts) / 1_000_000;
    if (ms === 0) return "Just now";
    return new Date(ms).toLocaleDateString();
  } catch {
    return "—";
  }
}

const PROJECT_TEMPLATES = [
  { id: "blank", label: "Blank", icon: "📄", desc: "Empty project" },
  { id: "landing", label: "Landing Page", icon: "🚀", desc: "Hero + features" },
  { id: "dashboard", label: "Dashboard", icon: "📊", desc: "Charts + stats" },
  { id: "game", label: "2D Game", icon: "🎮", desc: "Canvas game" },
  { id: "chat", label: "Chat App", icon: "💬", desc: "Messaging UI" },
];

interface ProjectCardProps {
  project: any;
  index: number;
  githubRepo?: string;
  onOpen: () => void;
  onDelete: () => void;
  onSetLiveLink: (link: string) => void;
}

function ProjectCard({ project, index, githubRepo, onOpen, onDelete, onSetLiveLink }: ProjectCardProps) {
  const [showLinkEdit, setShowLinkEdit] = useState(false);
  const [liveLink, setLiveLink] = useState(project.liveLink || "");

  const saveLiveLink = () => {
    onSetLiveLink(liveLink);
    setShowLinkEdit(false);
    toast.success("Live link saved");
  };

  const fileCount = project.files?.length || 0;

  return (
    <motion.div
      key={project.name}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-all group"
      data-ocid={`projects.item.${index + 1}`}
    >
      {/* Card top -- click to open */}
      <button type="button" className="w-full text-left p-4" onClick={onOpen}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-lg">
            {project.template === "landing" ? "🚀" :
             project.template === "dashboard" ? "📊" :
             project.template === "game" ? "🎮" :
             project.template === "chat" ? "💬" : "📁"}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            onClick={(e) => { e.stopPropagation(); onDelete(); }} data-ocid={`projects.delete_button.${index + 1}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="font-medium text-sm text-foreground truncate">{project.name}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />{formatTime(project.lastModified)}
          </div>
          {fileCount > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <FileCode className="w-3 h-3" />{fileCount} file{fileCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </button>

      {/* Live link row */}
      <div className="border-t border-border px-4 py-2">
        {showLinkEdit ? (
          <div className="flex gap-2">
            <Input value={liveLink} onChange={(e) => setLiveLink(e.target.value)}
              placeholder="https://your-app.pages.dev" className="h-7 text-xs bg-background border-border flex-1"
              style={{ fontSize: "14px" }} />
            <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" onClick={saveLiveLink}>Save</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowLinkEdit(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {project.liveLink || liveLink ? (
              <a href={project.liveLink || liveLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-primary hover:underline truncate max-w-[180px]" onClick={(e) => e.stopPropagation()}>
                <Globe className="w-3 h-3 shrink-0" />
                <span className="truncate">{(project.liveLink || liveLink).replace("https://", "")}</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
              </a>
            ) : (
              <span className="text-[11px] text-muted-foreground/50">No live link</span>
            )}
            <button type="button" className="text-[10px] text-muted-foreground hover:text-primary transition-colors ml-2 shrink-0"
              onClick={(e) => { e.stopPropagation(); setShowLinkEdit(true); }}>
              {project.liveLink || liveLink ? "Edit" : "+ Add link"}
            </button>
          </div>
        )}
      </div>

      {/* GitHub push row */}
      {githubRepo && (
        <div className="border-t border-border px-4 py-2 flex items-center gap-2">
          <Github className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-muted-foreground truncate flex-1">{githubRepo}</span>
          <button type="button" className="text-[10px] text-primary hover:underline shrink-0"
            onClick={() => window.open(`https://github.com/${githubRepo}`, "_blank")}>
            View <ExternalLink className="inline w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading, error } = useProjects();
  const { data: settings } = useSettings();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const [newName, setNewName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [projectLinks, setProjectLinks] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("bf-project-links") || "{}"); } catch { return {}; }
  });

  const githubRepo = settings?.githubRepo;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createProject.mutateAsync(name);
      setNewName("");
      setDialogOpen(false);
      toast.success(`Project "${name}" created`);
      navigate({ to: "/editor/$projectName", params: { projectName: name } });
    } catch (e: any) {
      toast.error(e.message || "Failed to create project");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject.mutateAsync(deleteTarget);
      toast.success(`Project "${deleteTarget}" deleted`);
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete project");
    }
  };

  const handleSetLiveLink = (projectName: string, link: string) => {
    const updated = { ...projectLinks, [projectName]: link };
    setProjectLinks(updated);
    localStorage.setItem("bf-project-links", JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" data-ocid="projects.page">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Projects</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-7">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9" data-ocid="projects.create.open_modal_button">
              <Plus className="w-4 h-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border" data-ocid="projects.create.dialog">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Project Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="my-awesome-app" className="bg-background border-border"
                  data-ocid="projects.name.input" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Starter Template</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PROJECT_TEMPLATES.map((t) => (
                    <button key={t.id} type="button"
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedTemplate === t.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40"
                      }`}>
                      <div className="text-lg mb-1">{t.icon}</div>
                      <div className="text-xs font-medium">{t.label}</div>
                      <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)} data-ocid="projects.create.cancel_button">Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || createProject.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground" data-ocid="projects.create.confirm_button">
                {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16" data-ocid="projects.loading_state">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-destructive" data-ocid="projects.error_state">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load projects</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16" data-ocid="projects.empty_state">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No projects yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create your first project to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project, i) => (
              <ProjectCard
                key={project.name}
                project={{ ...project, liveLink: projectLinks[project.name] }}
                index={i}
                githubRepo={githubRepo}
                onOpen={() => navigate({ to: "/editor/$projectName", params: { projectName: project.name } })}
                onDelete={() => setDeleteTarget(project.name)}
                onSetLiveLink={(link) => handleSetLiveLink(project.name, link)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="bg-card border-border" data-ocid="projects.delete.dialog">
          <DialogHeader><DialogTitle>Delete Project</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{deleteTarget}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} data-ocid="projects.delete.cancel_button">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProject.isPending} data-ocid="projects.delete.confirm_button">
              {deleteProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
