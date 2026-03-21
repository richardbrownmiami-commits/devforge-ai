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
  ExternalLink,
  FolderOpen,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
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
    return new Date(ms).toLocaleDateString();
  } catch {
    return "—";
  }
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const [newName, setNewName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      data-ocid="projects.page"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              data-ocid="projects.create.open_modal_button"
            >
              <Plus className="w-4 h-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent
            className="bg-card border-border"
            data-ocid="projects.create.dialog"
          >
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
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
              <Button
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                data-ocid="projects.create.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || createProject.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-ocid="projects.create.confirm_button"
              >
                {createProject.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {isLoading ? (
          <div
            className="flex items-center justify-center py-16"
            data-ocid="projects.loading_state"
          >
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div
            className="text-center py-16 text-destructive"
            data-ocid="projects.error_state"
          >
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load projects</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16" data-ocid="projects.empty_state">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No projects yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Create your first project to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project, i) => (
              <motion.div
                key={project.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                data-ocid={`projects.item.${i + 1}`}
              >
                <button
                  type="button"
                  className="group w-full text-left bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/40 hover:bg-card/80 transition-all"
                  onClick={() =>
                    navigate({
                      to: "/editor/$projectName",
                      params: { projectName: project.name },
                    })
                  }
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                      <FolderOpen className="w-4 h-4 text-primary" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(project.name);
                      }}
                      data-ocid={`projects.delete_button.${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="font-medium text-sm text-foreground truncate">
                    {project.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTime(project.lastModified)}
                  </div>
                  {(() => {
                    const url = localStorage.getItem(`bf_deploy_url_${project.name}`);
                    return url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 mt-1 text-[10px] text-green-400 hover:underline"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> Live
                      </a>
                    ) : null;
                  })()}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent
          className="bg-card border-border"
          data-ocid="projects.delete.dialog"
        >
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong className="text-foreground">{deleteTarget}</strong>? This
            cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              data-ocid="projects.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
              data-ocid="projects.delete.confirm_button"
            >
              {deleteProject.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
