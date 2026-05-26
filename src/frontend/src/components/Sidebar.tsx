import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { Bot, FolderOpen, LogOut, Menu, MessageSquare, Moon, Settings, Smartphone, Sun, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUser, logoutUser } from "../lib/userUtils";

// Apply theme from localStorage on module load (prevents flash)
function applyStoredTheme() {
  const stored = localStorage.getItem("bf_theme");
  if (stored === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
    if (!stored) localStorage.setItem("bf_theme", "dark");
  }
}
try { applyStoredTheme(); } catch {}

function SidebarInner({ onClose }: { onClose?: () => void }) {
  const matchRoute = useMatchRoute();
  const isProjects = !!matchRoute({ to: "/projects" });
  const isSettings = !!matchRoute({ to: "/settings" });
  const isApkBuilder = !!matchRoute({ to: "/apk-builder" });
  const isChat = !!matchRoute({ to: "/chat" });
  const [user, setUser] = useState<string | null>(null);

  const [dark, setDark] = useState(
    () => localStorage.getItem("bf_theme") !== "light"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("bf_theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    try {
      const { getCurrentUser } = require("../lib/userUtils");
      setUser(getCurrentUser());
    } catch {}
  }, []);

  const handleFeedback = () => {
    onClose?.();
    window.dispatchEvent(new CustomEvent("openFeedback"));
  };

  const handleLogout = () => {
    onClose?.();
    try { logoutUser(); } catch {}
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "oklch(var(--sidebar))" }}>
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link to="/projects" className="flex items-center gap-3 group" data-ocid="sidebar.link" onClick={onClose}>
          <img src="/assets/generated/brainforge-icon-3d.dim_512x512.png" alt="BrainForge" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          <span className="font-bold text-base text-foreground tracking-tight group-hover:text-primary transition-colors">
            BrainForge
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link to="/projects" data-ocid="nav.projects.link" onClick={onClose}
          className={cn(
            "nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all",
            isProjects
              ? "nav-item-active text-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
          )}>
          <FolderOpen className="w-4 h-4" />
          Projects
        </Link>
        <Link to="/apk-builder" data-ocid="nav.apk_builder_link" onClick={onClose}
          className={cn(
            "nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all",
            isApkBuilder
              ? "nav-item-active text-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
          )}>
          <Smartphone className="w-4 h-4" />
          APK Builder
        </Link>
        <Link to="/settings" data-ocid="nav.settings.link" onClick={onClose}
          className={cn(
            "nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all",
            isSettings
              ? "nav-item-active text-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
          )}>
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <button
          type="button"
          onClick={handleFeedback}
          data-ocid="nav.feedback.button"
          className="nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all w-full text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
          title="Send feedback, suggestion or report issue"
        >
          <MessageSquare className="w-4 h-4" />
          Feedback
        </button>
        {user && (
          <button
            type="button"
            onClick={handleLogout}
            data-ocid="nav.logout.button"
            className="nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all w-full text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
            title="Logout from your account"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border" data-ocid="sidebar.status.panel">
        {/* Dark / Light toggle */}
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors mb-3"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          data-ocid="sidebar.theme.toggle"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="text-xs">{dark ? "Light mode" : "Dark mode"}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Active</span>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground/50">
          &copy; {new Date().getFullYear()} BrainForge
        </p>
      {/* Neon Tagline */}
        <div className="mt-3 px-1 text-center">
          <p
            className="text-[11px] font-bold leading-snug tracking-wide"
            style={{
              color: "oklch(0.80 0.30 160)",
              textShadow: "0 0 8px oklch(0.70 0.35 160), 0 0 20px oklch(0.60 0.30 160 / 0.6)",
              fontStyle: "italic",
            }}
          >
            Soocho Mat — Bana Dalo
            <br />
            <span style={{ color: "oklch(0.85 0.28 280)", textShadow: "0 0 8px oklch(0.75 0.35 280), 0 0 20px oklch(0.65 0.30 280 / 0.6)" }}>
              KHUD Ka App ⚡
            </span>
          </p>
        </div>
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

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 border-b border-sidebar-border"
        style={{ background: "oklch(var(--sidebar))", paddingTop: "env(safe-area-inset-top, 12px)", height: "calc(56px + env(safe-area-inset-top, 0px))" }}
      >
        <Link to="/projects" className="flex items-center gap-2">
          <img src="/assets/generated/brainforge-icon-3d.dim_512x512.png" alt="BrainForge" className="w-9 h-9 rounded-md object-cover" />
          <span className="font-bold text-sm text-foreground">BrainForge</span>
        </Link>
        <button type="button" onClick={() => setOpen(true)}
          className="p-2 text-muted-foreground hover:text-foreground">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[240px] border-border">
          <SidebarInner onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
