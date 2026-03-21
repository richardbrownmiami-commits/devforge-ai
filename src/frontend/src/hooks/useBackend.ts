import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project, Settings } from "../backend.d";
import { cfApi } from "../lib/cloudflareApi";

// Convert CF project to backend Project type
function toProject(p: any): Project {
  return {
    name: p.name,
    aiModel: p.ai_model || "",
    created: BigInt(0),
    lastModified:
      BigInt(
        new Date(p.last_modified || p.created_at || Date.now()).getTime(),
      ) * BigInt(1_000_000),
  };
}

export function useSettings() {
  return useQuery<Settings | null>({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        const s = await cfApi.getSettings();
        return {
          githubRepo: s.githubRepo || "",
          githubToken: s.githubToken || "",
          masterAiModel: s.masterAiModel || "",
          openRouterApiKey: s.openRouterApiKey || "",
          defaultModel: s.defaultModel || "",
          termuxUrl: s.termuxUrl || "",
        };
      } catch {
        return null;
      }
    },
    staleTime: 30000,
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Settings) => {
      await cfApi.saveSettings(settings);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      try {
        const list = await cfApi.listProjects();
        return list.map(toProject);
      } catch {
        return [];
      }
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      await cfApi.createProject({ name, ai_model: "", code: "" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      await cfApi.deleteProject(name);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["claimedModels"] });
    },
  });
}
