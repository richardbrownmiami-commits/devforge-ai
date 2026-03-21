import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { FolderOpen, Menu, Settings, Zap } from "lucide-react";
import { useState } from "react";

function SidebarInner({ onClose }: { onClose?: () => void }) {
  const matchRoute = useMatchRoute();
  const isProjects = !!matchRoute({ to: "/projects" });
  const isSettings = !!matchRoute({ to: "/settings" });

  return (
    <div className="flex flex-col h-full" style={{ background: "oklch(var(--sidebar))" }}>
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link to="/projects" className="flex items-center gap-2 group" data-ocid="sidebar.link" onClick={onClose}>
          <div className="logo-img-wrap">
            <Zap className="logo-img w-5 h-5 text-primary fill-primary" strokeWidth={0} />
          </div>
          <span className="font-bold text-base text-foreground tracking-tight group-hover:text-primary transition-colors">
            BrainForge
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link to="/projects" data-ocid="nav.projects.link" onClick={onClose}
          className={cn(
            "nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all",
            isProjects ? "nav-item-active text-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
          )}>
          <FolderOpen className="w-4 h-4" />
          Projects
        </Link>
        <Link to="/settings" data-ocid="nav.settings.link" onClick={onClose}
          className={cn(
            "nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all",
            isSettings ? "nav-item-active text-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
          )}>
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </nav>

      {/* Clean footer -- no broken connection status */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2" data-ocid="sidebar.status.panel">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Active</span>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground/50">
          © {new Date().getFullYear()} BrainForge
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="hidden md:flex flex-col w-[240px] shrink-0 border-r border-border" data-ocid="sidebar.panel">
        <SidebarInner />
      </aside>
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 border-b border-sidebar-border"
        style={{ background: "oklch(var(--sidebar))", paddingTop: "env(safe-area-inset-top, 12px)", height: "calc(56px + env(safe-area-inset-top, 0px))" }}>
        <button type="button" onClick={() => setOpen(true)}
          className="p-2 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Open menu" data-ocid="nav.hamburger.button">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary fill-primary" strokeWidth={0} />
          <span className="font-bold text-sm text-foreground tracking-tight">BrainForge</span>
        </div>
        <Link to="/settings"
          className="p-2 -mr-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Settings" data-ocid="nav.mobile.settings.link">
          <Settings className="w-5 h-5" />
        </Link>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[240px] border-r border-border" style={{ background: "oklch(var(--sidebar))" }}>
          <SidebarInner onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
