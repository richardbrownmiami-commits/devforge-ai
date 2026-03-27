/**
 * useBackend.ts
 * All data stored in localStorage -- no ICP actor dependency.
 * User-scoped storage for multi-user testing support.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project, Settings } from "../backend.d";

const SETTINGS_KEY = "bf_settings";

// User-scoped project key
function getProjectsKey(): string {
  const user = sessionStorage.getItem("bf_session_user");
  return user ? `bf_projects_${user}` : "bf_projects";
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Settings;
      // Inject default OR key if user has none set
      if (!s.openRouterApiKey) {
        const defaultKey = localStorage.getItem("bf_default_or_key") || "";
        s.openRouterApiKey = defaultKey;
      }
      // Inject auto model if none set
      if (!s.defaultModel) s.defaultModel = "openrouter/auto";
      return s;
    }
  } catch {}
  const defaultOrKey = localStorage.getItem("bf_default_or_key") || "";
  return {
    openRouterApiKey: defaultOrKey,
    defaultModel: "openrouter/auto",
    termuxUrl: "",
    githubToken: "",
    githubRepo: "",
    supabaseUrl: "",
    supabaseKey: "",
    cloudflareToken: "",
    cloudflareAccountId: "",
    temperature: 0.7,
    maxTokens: 4096,
    liveSearch: false,
    autoFix: true,
    proactiveAI: false,
    masterAIEnabled: true,
    aiProvider: "auto",
    geminiApiKey: "",
    geminiModel: "gemini-1.5-flash",
    groqApiKey: "",
    groqModel: "llama-3.3-70b-versatile",
    githubModelsKey: "",
    githubModelsModel: "gpt-4o",
  } as unknown as Settings;
}

function saveSettingsToStorage(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(getProjectsKey());
    if (raw) return JSON.parse(raw) as Project[];
  } catch {}
  return [];
}

function saveProjectsToStorage(projects: Project[]) {
  localStorage.setItem(getProjectsKey(), JSON.stringify(projects));
}

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => loadSettings(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      const current = loadSettings();
      const updated = { ...current, ...patch };
      saveSettingsToStorage(updated);
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => loadProjects(),
    staleTime: 30_000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const projects = loadProjects();
      if (projects.find((p) => p.name === name)) {
        throw new Error(`Project "${name}" already exists`);
      }
      const newProject: Project = {
        name,
        code: "",
        lastModified: BigInt(Date.now() * 1_000_000),
        aiModel: "",
        liveLink: "",
      } as unknown as Project;
      const updated = [...projects, newProject];
      saveProjectsToStorage(updated);
      // Log activity
      try {
        const user = sessionStorage.getItem("bf_session_user");
        if (user) {
          const log = JSON.parse(localStorage.getItem("bf_activity_log") || "[]");
          log.unshift({ id: Date.now().toString(), username: user, action: "project_create", detail: name, timestamp: new Date().toISOString() });
          localStorage.setItem("bf_activity_log", JSON.stringify(log.slice(0, 500)));
        }
      } catch {}
      return newProject;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const projects = loadProjects().filter((p) => p.name !== name);
      saveProjectsToStorage(projects);
      // Remove chat history (user-scoped)
      const user = sessionStorage.getItem("bf_session_user");
      const chatKey = user ? `bf_chat_${user}_${name}` : `bf_chat_${name}`;
      localStorage.removeItem(chatKey);
      localStorage.removeItem(`bf_chat_${name}`); // also remove non-scoped
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
