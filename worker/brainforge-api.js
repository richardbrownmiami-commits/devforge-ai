// BrainForge API Worker
// Account: 913f3a2576a358054eba9a58a9573949
// Worker name: brainforge-api
// Worker URL: https://brainforge-api.richard-brown-miami.workers.dev
// Secret: BRAINFORGE_SECRET=2200
// Env secrets needed: GITHUB_TOKEN, GITHUB_REPO (for cron backup)

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

// ---- D1 Backup to GitHub ----
async function backupToGitHub(env, token, repo) {
  const githubToken = token || env.GITHUB_TOKEN || "";
  const githubRepo = repo || env.GITHUB_REPO || "";
  if (!githubToken || !githubRepo) throw new Error("GitHub token and repo required for backup");

  const tables = ["projects", "messages"];
  const backup = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  for (const table of tables) {
    try {
      const r = await env.DB.prepare(`SELECT * FROM ${table} LIMIT 1000`).all();
      backup.tables[table] = r.results || [];
    } catch {
      backup.tables[table] = [];
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const path = `backups/d1-backup-${date}.json`;
  const content = JSON.stringify(backup, null, 2);

  // Check existing file SHA
  const getRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${path}`, {
    headers: { Authorization: `Bearer ${githubToken}` }
  });
  const sha = getRes.ok ? (await getRes.json()).sha : undefined;

  const putRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${githubToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `backup: D1 snapshot ${date}`,
      content: btoa(unescape(encodeURIComponent(content))),
      ...(sha ? { sha } : {})
    })
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err?.message || `GitHub push failed: ${putRes.status}`);
  }

  return { path, rows: Object.values(backup.tables).reduce((a, t) => a + t.length, 0) };
}

export default {
  // ---- HTTP fetch handler ----
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });

    const secret = req.headers.get("X-BrainForge-Secret") || "";
    if (secret !== SECRET_HEADER) return j({ error: "Unauthorized" }, 401);

    const url = new URL(req.url), path = url.pathname;

    try {
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

      // D1 Backup to GitHub (manual trigger from app)
      if (path === "/api/backup" && req.method === "POST") {
        const b = await req.json();
        const result = await backupToGitHub(env, b.githubToken, b.githubRepo);
        return j({ success: true, ...result });
      }

      // Internet search (DuckDuckGo)
      if (path === "/api/search" && req.method === "POST") {
        const b = await req.json();
        if (!b.query) return j({ error: "Query required" }, 400);
        const res = await fetch("https://api.duckduckgo.com/?q=" + encodeURIComponent(b.query) + "&format=json&no_html=1&skip_disambig=1");
        const data = await res.json();
        const results = (data.RelatedTopics || []).slice(0, 5).map((t) => ({
          title: t.Text || "", url: t.FirstURL || ""
        }));
        return j({ results });
      }

      return j({ error: "Not found" }, 404);
    } catch (e) {
      return j({ error: e.message }, 500);
    }
  },

  // ---- Scheduled cron handler (daily D1 backup) ----
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      backupToGitHub(env).catch((e) => console.error("Backup failed:", e.message))
    );
  }
};
