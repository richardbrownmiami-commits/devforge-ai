// BrainForge API Worker
const SECRET_HEADER = "2200";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-BrainForge-Secret",
    "Content-Type": "application/json"
  };
}
function j(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: cors() });
}

// Cloudflare Workers-safe base64 encoding (handles unicode)
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// ---- D1 Backup to GitHub ----
async function backupToGitHub(env, token, repo) {
  const githubToken = token || env.GITHUB_TOKEN || "";
  const githubRepo = repo || env.GITHUB_REPO || "";
  if (!githubToken || !githubRepo) throw new Error("GitHub token and repo required");

  const backup = { timestamp: new Date().toISOString(), tables: {} };
  for (const table of ["projects", "messages"]) {
    try {
      const r = await env.DB.prepare(`SELECT * FROM ${table} LIMIT 1000`).all();
      backup.tables[table] = r.results || [];
    } catch { backup.tables[table] = []; }
  }

  const date = new Date().toISOString().slice(0, 10);
  const path = `backups/d1-backup-${date}.json`;
  const content = JSON.stringify(backup, null, 2);

  const getRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${path}`, {
    headers: { Authorization: `Bearer ${githubToken}` }
  });
  const existingData = getRes.ok ? await getRes.json() : null;
  const sha = existingData?.sha;

  const putRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${githubToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `backup: D1 snapshot ${date}`,
      content: toBase64(content),
      ...(sha ? { sha } : {})
    })
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err?.message || `GitHub push failed: ${putRes.status}`);
  }

  const rows = Object.values(backup.tables).reduce((a, t) => a + t.length, 0);
  return { path, rows };
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });

    const secret = req.headers.get("X-BrainForge-Secret") || "";
    if (secret !== SECRET_HEADER) return j({ error: "Unauthorized" }, 401);

    const url = new URL(req.url), path = url.pathname;

    try {
      // D1 stats
      if (path === "/api/stats" && req.method === "GET") {
        const [proj, msg, mem, snap] = await Promise.allSettled([
          env.DB.prepare("SELECT COUNT(*) as n FROM projects").first(),
          env.DB.prepare("SELECT COUNT(*) as n FROM messages").first(),
          env.DB.prepare("SELECT COUNT(*) as n FROM memories").first(),
          env.DB.prepare("SELECT COUNT(*) as n FROM snapshots").first(),
        ]);
        return j({
          projects: proj.value?.n || 0,
          messages: msg.value?.n || 0,
          memories: mem.value?.n || 0,
          snapshots: snap.value?.n || 0
        });
      }

      // Projects
      if (path === "/api/projects" && req.method === "GET") {
        const r = await env.DB.prepare("SELECT * FROM projects ORDER BY updated_at DESC").all();
        return j({ projects: r.results || [] });
      }
      if (path === "/api/projects" && req.method === "POST") {
        const b = await req.json();
        if (!b.name) return j({ error: "Name required" }, 400);
        const id = "proj_" + Date.now();
        await env.DB.prepare("INSERT INTO projects(id,name,template,created_at,updated_at) VALUES(?,?,?,?,?)").bind(id, b.name, b.template || "blank", new Date().toISOString(), new Date().toISOString()).run();
        return j({ success: true, id });
      }

      // Chat messages
      if (path.startsWith("/api/projects/") && path.endsWith("/messages") && req.method === "GET") {
        const projectId = path.split("/")[3];
        const r = await env.DB.prepare("SELECT * FROM messages WHERE project_id=? ORDER BY created_at ASC LIMIT 100").bind(projectId).all();
        return j({ messages: r.results || [] });
      }
      if (path.startsWith("/api/projects/") && path.endsWith("/messages") && req.method === "POST") {
        const projectId = path.split("/")[3];
        const b = await req.json();
        await env.DB.prepare("INSERT INTO messages(project_id,role,content,created_at) VALUES(?,?,?,?)").bind(projectId, b.role, b.content, new Date().toISOString()).run();
        return j({ success: true });
      }

      // D1 Backup to GitHub (manual)
      if (path === "/api/backup" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        const result = await backupToGitHub(env, b.githubToken, b.githubRepo);
        return j({ success: true, ...result });
      }

      // KV list
      if (path === "/api/kv-list" && req.method === "GET") {
        if (!env.KV) return j({ keys: [], count: 0, note: "KV not bound" });
        const list = await env.KV.list({ prefix: "app:" });
        return j({ keys: list.keys || [], count: list.keys?.length || 0 });
      }

      // KV stats
      if (path === "/api/kv-stats" && req.method === "GET") {
        if (!env.KV) return j({ status: "not_bound", count: 0 });
        const list = await env.KV.list({ prefix: "app:" });
        return j({ status: "ok", count: list.keys?.length || 0 });
      }

      // KV get published app
      if (path.startsWith("/p/") && req.method === "GET") {
        if (!env.KV) return new Response("Service unavailable", { status: 503 });
        const slug = path.replace("/p/", "app:");
        const val = await env.KV.get(slug);
        if (!val) return new Response("App not found", { status: 404 });
        return new Response(val, { headers: { "Content-Type": "text/html", "Access-Control-Allow-Origin": "*" } });
      }

      // KV publish app
      if (path.startsWith("/api/kv/") && req.method === "PUT") {
        if (!env.KV) return j({ error: "KV not bound" }, 503);
        const slug = "app:" + path.replace("/api/kv/", "");
        const body = await req.text();
        await env.KV.put(slug, body, { expirationTtl: 60 * 60 * 24 * 365 });
        return j({ success: true, url: `https://brainforge-api.richard-brown-miami.workers.dev/p/${slug.replace("app:", "")}` });
      }

      // Internet search (DuckDuckGo)
      if (path === "/api/search" && req.method === "POST") {
        const b = await req.json();
        if (!b.query) return j({ error: "Query required" }, 400);
        const res = await fetch("https://api.duckduckgo.com/?q=" + encodeURIComponent(b.query) + "&format=json&no_html=1&skip_disambig=1");
        const data = await res.json();
        const results = (data.RelatedTopics || []).slice(0, 5).map((t) => ({ title: t.Text || "", url: t.FirstURL || "" }));
        return j({ results });
      }

      return j({ error: "Not found" }, 404);
    } catch (e) {
      return j({ error: e.message }, 500);
    }
  },

  // Cron: daily D1 backup at 2 AM UTC
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      backupToGitHub(env).catch((e) => console.error("Cron backup failed:", e.message))
    );
  }
};
