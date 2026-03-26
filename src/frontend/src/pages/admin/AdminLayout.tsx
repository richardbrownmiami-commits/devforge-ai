import { Link, Outlet, useRouter } from "@tanstack/react-router";
import {
  Activity,
  Bot,
  StickyNote,
  ChevronLeft,
  ClipboardList,
  Database,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Rocket,
  Terminal,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AdminPinGate } from "./AdminPinGate";

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: MessageSquare, label: "Feedback", path: "/admin/feedback" },
  { icon: Bot, label: "Master AI", path: "/admin/master-ai" },
  { icon: Database, label: "Database", path: "/admin/database" },
  { icon: Activity, label: "Status", path: "/admin/status" },
  { icon: HardDrive, label: "Backup", path: "/admin/backup" },
  { icon: ClipboardList, label: "Issues", path: "/admin/issues" },
  { icon: Rocket, label: "Deploy Log", path: "/admin/deploy-log" },
  { icon: StickyNote, label: "Notes", path: "/admin/notes" },
  { icon: Terminal, label: "Termux", path: "/admin/termux" },
];

function useIdleLogout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        localStorage.removeItem("bf_admin_last_unlock");
        window.location.reload();
      }, IDLE_TIMEOUT);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart", "touchmove"];
    events.forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(ev => window.removeEventListener(ev, reset));
    };
  }, []);
}

function IdleWarning() {
  const [remaining, setRemaining] = useState(IDLE_TIMEOUT);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const resetActivity = () => { lastActivity.current = Date.now(); };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(ev => window.addEventListener(ev, resetActivity, { passive: true }));

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      setRemaining(Math.max(0, IDLE_TIMEOUT - idle));
    }, 1000);

    return () => {
      clearInterval(interval);
      events.forEach(ev => window.removeEventListener(ev, resetActivity));
    };
  }, []);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isWarning = remaining < 2 * 60 * 1000;

  if (!isWarning) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl text-xs font-medium shadow-lg"
      style={{ background: "oklch(0.50 0.25 40 / 0.9)", color: "white", border: "1px solid oklch(0.60 0.25 40)" }}>
      ⏱ Idle logout: {mins}:{secs.toString().padStart(2, "0")}
    </div>
  );
}

function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const currentPath = router.state.location.pathname;
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("bf_admin_last_unlock");
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "oklch(0.08 0.025 280)", borderRight: "1px solid oklch(0.20 0.08 280)" }}>
      <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(0.18 0.06 280)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: "oklch(0.55 0.25 280 / 0.2)", border: "1px solid oklch(0.55 0.25 280 / 0.4)" }}>⚙️</div>
          <div>
            <p className="text-xs font-bold text-foreground">BrainForge</p>
            <p className="text-[10px]" style={{ color: "oklch(0.65 0.25 280)" }}>Admin Panel</p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === "/admin" ? currentPath === "/admin" : currentPath.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path as any} onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
              style={isActive ? { background: "oklch(0.55 0.25 280 / 0.15)", color: "oklch(0.75 0.25 280)", border: "1px solid oklch(0.55 0.25 280 / 0.3)" } : { color: "oklch(0.6 0.05 280)", border: "1px solid transparent" }}
              data-ocid={`admin.nav.${item.label.toLowerCase().replace(" ", "_")}.link`}>
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-3 space-y-2" style={{ borderTop: "1px solid oklch(0.18 0.06 280)" }}>
        <div className="px-3 py-2 rounded-lg" style={{ background: "oklch(0.12 0.03 280)" }}>
          <p className="text-[10px] text-muted-foreground">{time.toLocaleDateString()}</p>
          <p className="text-xs font-mono" style={{ color: "oklch(0.65 0.25 280)" }}>{time.toLocaleTimeString()}</p>
        </div>
        <Link to="/projects" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors" data-ocid="admin.nav.back_to_app.link">
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to BrainForge
        </Link>
        <button type="button" onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-red-400 transition-colors" data-ocid="admin.nav.logout_button">
          <LogOut className="w-3.5 h-3.5" />
          Lock Admin
        </button>
      </div>
    </div>
  );
}

function AdminContent() {
  useIdleLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "oklch(0.06 0.02 280)" }}>
      <div className="hidden md:flex w-56 shrink-0 flex-col">
        <AdminSidebar />
      </div>
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 flex flex-col"><AdminSidebar onClose={() => setSidebarOpen(false)} /></div>
          <button type="button" aria-label="Close sidebar" className="flex-1" onClick={() => setSidebarOpen(false)} style={{ background: "oklch(0 0 0 / 0.6)" }} />
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid oklch(0.18 0.06 280)", background: "oklch(0.08 0.025 280)" }}>
          <button type="button" onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg" style={{ background: "oklch(0.55 0.25 280 / 0.15)" }}>
            <Menu className="w-4 h-4" style={{ color: "oklch(0.65 0.25 280)" }} />
          </button>
          <span className="text-sm font-semibold text-foreground">⚙️ BrainForge Admin</span>
        </div>
        <div className="flex-1 overflow-auto"><Outlet /></div>
      </div>
      <IdleWarning />
    </div>
  );
}

export function AdminLayout() {
  return (
    <AdminPinGate>
      <AdminContent />
    </AdminPinGate>
  );
}
