// BrainForge Cloudflare Worker API
// Tables: projects, messages, settings, model_claims, snapshots, ai_memory, ai_rules

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Default rules for each AI type
const DEFAULT_PROJECT_RULES = (projectName) => `# Rules for Project AI: ${projectName}
Last updated: ${new Date().toISOString()}

## ALLOWED
- Generate HTML/CSS/JS/React code for this project
- Fix errors in the preview
- Suggest improvements to the current project
- Remember this project's build history
- Ask clarifying questions before building
- Auto-fix errors up to 3 times before asking user

## NOT ALLOWED
- Access or reference other projects (reason: isolation -- each project AI is independent)
- Modify BrainForge itself (reason: that is Master AI's job)
- Use internet search without notifying user (reason: transparency)
- Make destructive changes without confirmation (reason: safety)
- Share memory with other project AIs (reason: context isolation)

## ROLE
You are the dedicated AI for project "${projectName}". Your only job is to build and improve this project.
`;

const DEFAULT_MASTER_RULES = () => `# Rules for Master AI
Last updated: ${new Date().toISOString()}

## ALLOWED
- Read and write BrainForge source files via GitHub
- Deploy to Cloudflare Pages and Workers
- Run commands via Termux connection
- Update memory and rules files
- Diagnose and fix BrainForge infrastructure issues
- Rebuild and redeploy BrainForge if Caffeine platform goes down

## NOT ALLOWED
- Help with user app projects (reason: role separation -- project AIs handle that)
- Make code changes without showing diff first (reason: human approval required)
- Delete files without explicit confirmation (reason: safety)
- Access user API keys beyond what is needed (reason: security)
- Modify other AIs' memory files (reason: isolation)

## ROLE
You maintain the BrainForge application itself. You are connected to GitHub, Cloudflare, and Termux.
If Caffeine platform becomes unavailable, you can rebuild and redeploy BrainForge independently.
`;

async function initTables(db) {
  // Create ai_memory table if not exists
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_memory (
      scope TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    )
  `).run();
  // Create ai_rules table if not exists
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_rules (
      scope TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Init tables on first request
      await initTables(env.DB);

      // ── PROJECTS ──────────────────────────────────────────
      if (path === '/api/projects' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY last_modified DESC').all();
        return json(results);
      }
      if (path === '/api/projects' && method === 'POST') {
        const body = await request.json();
        const now = new Date().toISOString();
        const id = body.id || crypto.randomUUID();
        await env.DB.prepare(
          'INSERT INTO projects (id, name, ai_model, code, created_at, last_modified) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, body.name, body.ai_model || '', body.code || '', now, now).run();
        // Init default rules for new project
        await env.DB.prepare(
          'INSERT INTO ai_rules (scope, content, updated_at) VALUES (?, ?, ?) ON CONFLICT(scope) DO NOTHING'
        ).bind(`project-${body.name}`, DEFAULT_PROJECT_RULES(body.name), now).run();
        return json({ id, ...body, created_at: now, last_modified: now });
      }
      if (path.startsWith('/api/projects/') && method === 'PUT') {
        const name = decodeURIComponent(path.split('/api/projects/')[1]);
        const body = await request.json();
        const now = new Date().toISOString();
        await env.DB.prepare(
          'UPDATE projects SET name=?, ai_model=?, code=?, last_modified=? WHERE name=?'
        ).bind(body.name ?? name, body.ai_model ?? '', body.code ?? '', now, name).run();
        return json({ success: true });
      }
      if (path.startsWith('/api/projects/') && method === 'DELETE') {
        const name = decodeURIComponent(path.split('/api/projects/')[1]);
        await env.DB.prepare('DELETE FROM projects WHERE name=?').bind(name).run();
        await env.DB.prepare('DELETE FROM messages WHERE project_id=?').bind(name).run();
        await env.DB.prepare('DELETE FROM model_claims WHERE claimed_by=?').bind(name).run();
        await env.DB.prepare('DELETE FROM snapshots WHERE project_id=?').bind(name).run();
        await env.DB.prepare('DELETE FROM ai_memory WHERE scope=?').bind(`project-${name}`).run();
        await env.DB.prepare('DELETE FROM ai_rules WHERE scope=?').bind(`project-${name}`).run();
        return json({ success: true });
      }

      // ── MESSAGES (chat history) ──────────────────────────
      if (path.startsWith('/api/messages/') && method === 'GET') {
        const pid = decodeURIComponent(path.split('/api/messages/')[1]);
        const { results } = await env.DB.prepare(
          'SELECT * FROM messages WHERE project_id=? ORDER BY created_at ASC'
        ).bind(pid).all();
        return json(results);
      }
      if (path === '/api/messages' && method === 'POST') {
        const body = await request.json();
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare(
          'INSERT INTO messages (id, project_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(id, body.project_id, body.role, body.content, now).run();
        return json({ id, ...body, created_at: now });
      }
      if (path.startsWith('/api/messages/') && method === 'DELETE') {
        const pid = decodeURIComponent(path.split('/api/messages/')[1]);
        await env.DB.prepare('DELETE FROM messages WHERE project_id=?').bind(pid).run();
        return json({ success: true });
      }

      // ── SETTINGS ──────────────────────────────────────────
      if (path === '/api/settings' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
        const out = {};
        for (const r of results) { try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; } }
        return json(out);
      }
      if (path === '/api/settings' && method === 'POST') {
        const body = await request.json();
        for (const [k, v] of Object.entries(body)) {
          await env.DB.prepare(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
          ).bind(k, JSON.stringify(v)).run();
        }
        return json({ success: true });
      }

      // ── MODEL CLAIMS ──────────────────────────────────────
      if (path === '/api/model-claims' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM model_claims').all();
        return json(results);
      }
      if (path === '/api/model-claims' && method === 'POST') {
        const body = await request.json();
        const now = new Date().toISOString();
        // Release old claim for this claimer
        await env.DB.prepare('DELETE FROM model_claims WHERE claimed_by=?').bind(body.claimed_by).run();
        // Check if model is free
        const existing = await env.DB.prepare(
          'SELECT * FROM model_claims WHERE model_id=?'
        ).bind(body.model_id).first();
        if (existing) return json({ error: `Model already claimed by ${existing.claimed_by}` }, 409);
        await env.DB.prepare(
          'INSERT INTO model_claims (model_id, claimed_by, claimed_at) VALUES (?, ?, ?)'
        ).bind(body.model_id, body.claimed_by, now).run();
        return json({ success: true });
      }
      if (path.startsWith('/api/model-claims/') && method === 'DELETE') {
        const claimedBy = decodeURIComponent(path.split('/api/model-claims/')[1]);
        await env.DB.prepare('DELETE FROM model_claims WHERE claimed_by=?').bind(claimedBy).run();
        return json({ success: true });
      }

      // ── SNAPSHOTS ─────────────────────────────────────────
      if (path.startsWith('/api/snapshots/') && method === 'GET') {
        const pid = decodeURIComponent(path.split('/api/snapshots/')[1]);
        const { results } = await env.DB.prepare(
          'SELECT * FROM snapshots WHERE project_id=? ORDER BY created_at DESC LIMIT 20'
        ).bind(pid).all();
        return json(results);
      }
      if (path === '/api/snapshots' && method === 'POST') {
        const body = await request.json();
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare(
          'INSERT INTO snapshots (id, project_id, code, created_at) VALUES (?, ?, ?, ?)'
        ).bind(id, body.project_id, body.code, now).run();
        return json({ id, ...body, created_at: now });
      }

      // ── AI MEMORY ─────────────────────────────────────────
      // GET all memory files
      if (path === '/api/memory' && method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT scope, content, message_count, updated_at FROM ai_memory ORDER BY updated_at DESC'
        ).all();
        return json(results);
      }
      // GET memory for a specific scope
      if (path.startsWith('/api/memory/') && method === 'GET') {
        const scope = decodeURIComponent(path.split('/api/memory/')[1]);
        const row = await env.DB.prepare(
          'SELECT * FROM ai_memory WHERE scope=?'
        ).bind(scope).first();
        return json(row || { scope, content: '', message_count: 0 });
      }
      // POST/update memory for a scope
      if (path === '/api/memory' && method === 'POST') {
        const body = await request.json();
        const now = new Date().toISOString();
        const { scope, content, message_count = 0 } = body;
        await env.DB.prepare(
          'INSERT INTO ai_memory (scope, content, message_count, updated_at) VALUES (?, ?, ?, ?) ' +
          'ON CONFLICT(scope) DO UPDATE SET content=excluded.content, message_count=excluded.message_count, updated_at=excluded.updated_at'
        ).bind(scope, content, message_count, now).run();
        return json({ success: true, updated_at: now });
      }
      // DELETE memory for a scope (clear memory)
      if (path.startsWith('/api/memory/') && method === 'DELETE') {
        const scope = decodeURIComponent(path.split('/api/memory/')[1]);
        await env.DB.prepare('DELETE FROM ai_memory WHERE scope=?').bind(scope).run();
        return json({ success: true });
      }

      // ── AI RULES ──────────────────────────────────────────
      // GET all rules files
      if (path === '/api/rules' && method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT scope, content, updated_at FROM ai_rules ORDER BY scope ASC'
        ).all();
        return json(results);
      }
      // GET rules for a specific scope
      if (path.startsWith('/api/rules/') && method === 'GET') {
        const scope = decodeURIComponent(path.split('/api/rules/')[1]);
        const row = await env.DB.prepare('SELECT * FROM ai_rules WHERE scope=?').bind(scope).first();
        // Auto-create default rules if not exist
        if (!row) {
          const content = scope === 'master' ? DEFAULT_MASTER_RULES() : DEFAULT_PROJECT_RULES(scope.replace('project-', ''));
          const now = new Date().toISOString();
          await env.DB.prepare(
            'INSERT INTO ai_rules (scope, content, updated_at) VALUES (?, ?, ?)'
          ).bind(scope, content, now).run();
          return json({ scope, content, updated_at: now });
        }
        return json(row);
      }
      // POST/update rules for a scope
      if (path === '/api/rules' && method === 'POST') {
        const body = await request.json();
        const now = new Date().toISOString();
        // Inject updated timestamp into content
        const content = body.content.replace(
          /Last updated: .*/,
          `Last updated: ${now}`
        );
        await env.DB.prepare(
          'INSERT INTO ai_rules (scope, content, updated_at) VALUES (?, ?, ?) ' +
          'ON CONFLICT(scope) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at'
        ).bind(body.scope, content, now).run();
        return json({ success: true, updated_at: now });
      }

      // Init master rules if not exist
      if (path === '/api/rules/init-master' && method === 'POST') {
        const now = new Date().toISOString();
        await env.DB.prepare(
          'INSERT INTO ai_rules (scope, content, updated_at) VALUES (?, ?, ?) ON CONFLICT(scope) DO NOTHING'
        ).bind('master', DEFAULT_MASTER_RULES(), now).run();
        return json({ success: true });
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: err.message }, 500);
    }
  }
};
