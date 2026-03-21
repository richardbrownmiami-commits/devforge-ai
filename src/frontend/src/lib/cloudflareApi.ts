const BASE_URL = (import.meta.env.VITE_CF_WORKER_URL as string) || "";

async function api(path: string, options?: RequestInit) {
  // If no worker URL, fall back to localStorage
  if (!BASE_URL) return localFallback(path, options);
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// localStorage fallback when no Worker URL is set
const LS = {
  get: (k: string) => {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch {
      return null;
    }
  },
  set: (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v)),
};

function localFallback(path: string, options?: RequestInit): any {
  const method = options?.method || "GET";
  const body = options?.body ? JSON.parse(options.body as string) : null;

  if (path === "/api/projects" && method === "GET")
    return LS.get("bf_projects") || [];
  if (path === "/api/projects" && method === "POST") {
    const projects = LS.get("bf_projects") || [];
    const now = new Date().toISOString();
    const p = {
      id: crypto.randomUUID(),
      ...body,
      created_at: now,
      last_modified: now,
    };
    LS.set("bf_projects", [...projects, p]);
    return p;
  }
  if (path.startsWith("/api/projects/") && method === "DELETE") {
    const name = decodeURIComponent(path.split("/api/projects/")[1]);
    LS.set(
      "bf_projects",
      (LS.get("bf_projects") || []).filter((p: any) => p.name !== name),
    );
    return { success: true };
  }
  if (path === "/api/settings" && method === "GET")
    return LS.get("bf_settings") || {};
  if (path === "/api/settings" && method === "POST") {
    LS.set("bf_settings", { ...(LS.get("bf_settings") || {}), ...body });
    return { success: true };
  }
  if (path === "/api/model-claims" && method === "GET")
    return LS.get("bf_claims") || [];
  if (path === "/api/model-claims" && method === "POST") {
    const claims = (LS.get("bf_claims") || []).filter(
      (c: any) => c.model_id !== body.model_id,
    );
    claims.push(body);
    LS.set("bf_claims", claims);
    return { success: true };
  }
  if (path.startsWith("/api/model-claims/") && method === "DELETE") {
    const id = decodeURIComponent(path.split("/api/model-claims/")[1]);
    LS.set(
      "bf_claims",
      (LS.get("bf_claims") || []).filter((c: any) => c.model_id !== id),
    );
    return { success: true };
  }
  if (path.startsWith("/api/messages/") && method === "GET") {
    const pid = decodeURIComponent(path.split("/api/messages/")[1]);
    return (LS.get("bf_messages") || []).filter(
      (m: any) => m.project_id === pid,
    );
  }
  if (path === "/api/messages" && method === "POST") {
    const msgs = LS.get("bf_messages") || [];
    const m = {
      id: crypto.randomUUID(),
      ...body,
      created_at: new Date().toISOString(),
    };
    LS.set("bf_messages", [...msgs, m]);
    return m;
  }
  // Snapshots fallback
  if (path.startsWith("/api/snapshots/") && method === "GET") {
    const pid = decodeURIComponent(path.split("/api/snapshots/")[1]);
    return (LS.get("bf_snapshots") || []).filter(
      (s: any) => s.project_id === pid,
    );
  }
  if (path === "/api/snapshots" && method === "POST") {
    const snaps = LS.get("bf_snapshots") || [];
    const s = {
      id: crypto.randomUUID(),
      ...body,
      created_at: new Date().toISOString(),
    };
    // Keep only last 10 per project
    const filtered = snaps.filter((x: any) => x.project_id !== body.project_id);
    const projectSnaps = snaps
      .filter((x: any) => x.project_id === body.project_id)
      .slice(-9);
    LS.set("bf_snapshots", [...filtered, ...projectSnaps, s]);
    return s;
  }
  return null;
}

export interface CFProject {
  id: string;
  name: string;
  ai_model: string;
  code: string;
  created_at: string;
  last_modified: string;
}
export interface CFSettings {
  githubRepo?: string;
  githubToken?: string;
  masterAiModel?: string;
  openRouterApiKey?: string;
  defaultModel?: string;
  termuxUrl?: string;
}
export interface CFModelClaim {
  model_id: string;
  claimed_by: string;
  claim_type: string;
}
export interface CFMessage {
  id: string;
  project_id: string;
  role: string;
  content: string;
  created_at: string;
}
export interface CFSnapshot {
  id: string;
  project_id: string;
  code: string;
  description: string;
  created_at: string;
}

export const cfApi = {
  listProjects: (): Promise<CFProject[]> => api("/api/projects"),
  createProject: (data: Partial<CFProject>): Promise<CFProject> =>
    api("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (name: string, data: Partial<CFProject>): Promise<void> =>
    api(`/api/projects/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteProject: (name: string): Promise<void> =>
    api(`/api/projects/${encodeURIComponent(name)}`, { method: "DELETE" }),
  getMessages: (projectId: string): Promise<CFMessage[]> =>
    api(`/api/messages/${encodeURIComponent(projectId)}`),
  addMessage: (msg: Omit<CFMessage, "id" | "created_at">): Promise<CFMessage> =>
    api("/api/messages", { method: "POST", body: JSON.stringify(msg) }),
  getSettings: (): Promise<CFSettings> => api("/api/settings"),
  saveSettings: (s: CFSettings): Promise<void> =>
    api("/api/settings", { method: "POST", body: JSON.stringify(s) }),
  getModelClaims: (): Promise<CFModelClaim[]> => api("/api/model-claims"),
  claimModel: (
    modelId: string,
    claimedBy: string,
    claimType = "project",
  ): Promise<void> =>
    api("/api/model-claims", {
      method: "POST",
      body: JSON.stringify({
        model_id: modelId,
        claimed_by: claimedBy,
        claim_type: claimType,
      }),
    }),
  releaseModel: (modelId: string): Promise<void> =>
    api(`/api/model-claims/${encodeURIComponent(modelId)}`, {
      method: "DELETE",
    }),
  getSnapshots: (projectId: string): Promise<CFSnapshot[]> =>
    api(`/api/snapshots/${encodeURIComponent(projectId)}`),
  saveSnapshot: (data: {
    project_id: string;
    code: string;
    description: string;
  }): Promise<CFSnapshot> =>
    api("/api/snapshots", { method: "POST", body: JSON.stringify(data) }),
};
