// useBackend.ts -- All data goes to Cloudflare Worker, NOT ICP/Motoko
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const WORKER = import.meta.env.VITE_CF_WORKER_URL ||
  "https://brainforge-api.richard-brown-miami.workers.dev";

const api = {
  async get(path: string) {
    const res = await fetch(`${WORKER}${path}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
  async post(path: string, body: unknown) {
    const res = await fetch(`${WORKER}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
  async put(path: string, body: unknown) {
    const res = await fetch(`${WORKER}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
  async del(path: string) {
    const res = await fetch(`${WORKER}${path}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
};

// ---- Settings ----
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get("/api/settings"),
    staleTime: 30_000,
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      api.post("/api/settings", settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

// ---- Projects ----
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/api/projects"),
    staleTime: 10_000,
    select: (data: any[]) =>
      data.map((p) => ({
        ...p,
        // Normalise field names
        name: p.name,
        aiModel: p.ai_model || "",
        lastModified: BigInt(0), // keep compatible with existing UI
      })),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post("/api/projects", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.del(`/api/projects/${encodeURIComponent(name)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["claimedModels"] });
    },
  });
}
