/**
 * useBackend.ts
 * All data stored in localStorage -- no ICP actor dependency.
 * Works on Cloudflare Pages and any static host.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project, Settings } from "../backend.d";

const SETTINGS_KEY = "bf_settings";
const PROJECTS_KEY = "bf_projects";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as Settings;
  } catch {}
  return {
    openRouterApiKey: "",
    defaultModel: "qwen/qwen3-coder:free",
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
    masterAIModel: "deepseek/deepseek-r1:free",
    // AI provider settings
    aiProvider: "openrouter",
    geminiApiKey: "",
    geminiModel: "gemini-2.0-flash",
    deepSeekApiKey: "",
    deepSeekModel: "deepseek-chat",
  } as unknown as Settings;
}

function saveSettingsToStorage(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (raw) return JSON.parse(raw) as Project[];
  } catch {}
  return [];
}

function saveProjectsToStorage(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
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
      // Also remove chat history
      localStorage.removeItem(`bf_chat_${name}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
