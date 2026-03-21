import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { FolderOpen, Menu, Moon, Settings, Sun, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useSettings } from "../hooks/useBackend";

function SidebarInner({ onClose }: { onClose?: () => void }) {
  const matchRoute = useMatchRoute();
  const { data: settings } = useSettings();
  const { theme, setTheme } = useTheme();
  const isProjects = !!matchRoute({ to: "/projects" });
  const isSettings = !!matchRoute({ to: "/settings" });
  const termuxUrl = settings?.termuxUrl || "";

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "oklch(var(--sidebar))" }}
    >
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <Link
            to="/projects"
            className="flex items-center gap-2 group"
            data-ocid="sidebar.link"
            onClick={onClose}
          >
            <div className="logo-img-wrap">
              <Zap
                className="logo-img w-5 h-5 text-primary fill-primary"
                strokeWidth={0}
              />
            </div>
            <span className="font-bold text-base text-foreground tracking-tight group-hover:text-primary transition-colors">
              BrainForge
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Toggle theme"
            data-ocid="sidebar.theme.toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link
          to="/projects"
          data-ocid="nav.projects.link"
          onClick={onClose}
          className={cn(
            "nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all",
            isProjects
              ? "nav-item-active text-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
          )}
        >
          <FolderOpen className="w-4 h-4" />
          Projects
        </Link>
        <Link
          to="/settings"
          data-ocid="nav.settings.link"
          onClick={onClose}
          className={cn(
            "nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all",
            isSettings
              ? "nav-item-active text-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </nav>
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground"
          data-ocid="sidebar.status.panel"
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              termuxUrl ? "bg-primary animate-pulse" : "bg-muted-foreground/40",
            )}
          />
          <span>{termuxUrl ? "Ara active" : "Ready"}</span>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground/50">
          © {new Date().getFullYear()}{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <>
      <aside
        className="hidden md:flex flex-col w-[240px] shrink-0 border-r border-border"
        data-ocid="sidebar.panel"
      >
        <SidebarInner />
      </aside>
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 border-b border-sidebar-border"
        style={{
          background: "oklch(var(--sidebar))",
          paddingTop: "env(safe-area-inset-top, 12px)",
          height: "calc(56px + env(safe-area-inset-top, 0px))",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Open menu"
          data-ocid="nav.hamburger.button"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary fill-primary" strokeWidth={0} />
          <span className="font-bold text-sm text-foreground tracking-tight">
            BrainForge
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Toggle theme"
            data-ocid="nav.theme.toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          <Link
            to="/settings"
            className="p-2 -mr-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Settings"
            data-ocid="nav.mobile.settings.link"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[240px] border-r border-border"
          style={{ background: "oklch(var(--sidebar))" }}
        >
          <SidebarInner onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
