import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { Sidebar } from "./components/Sidebar";
import { EditorPage } from "./pages/EditorPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SettingsPage } from "./pages/SettingsPage";

const rootRoute = createRootRoute({
  component: () => (
    <div
      className="flex bg-background overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <Sidebar />
      {/* Desktop main */}
      <main className="hidden md:flex flex-1 overflow-hidden flex-col">
        <Outlet />
      </main>
      {/* Mobile main -- offset by top bar, fills remaining dynamic viewport height */}
      <main
        className="md:hidden flex flex-1 overflow-hidden flex-col"
        style={{
          paddingTop: "calc(56px + env(safe-area-inset-top, 0px))",
          height: "100dvh",
        }}
      >
        <Outlet />
      </main>
      <Toaster />
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/projects" });
  },
  component: () => null,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsPage,
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor/$projectName",
  component: EditorPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectsRoute,
  editorRoute,
  settingsRoute,
]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
