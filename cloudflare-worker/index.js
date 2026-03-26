// BrainForge API Worker v3 -- AI proxy + backup POST fix
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-BrainForge-Secret',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    // Public routes -- no auth needed
    if (path.startsWith('/p/') && request.method === 'GET') {
      try { return await handleServeApp(env, path.slice(3)); }
      catch (err) { return new Response('Not found', { status: 404 }); }
    }
    const secret = request.headers.get('X-BrainForge-Secret');
    if (!env.BRAINFORGE_SECRET || secret !== env.BRAINFORGE_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    try {
      if (path === '/api/stats' && request.method === 'GET') return await handleStats(env);
      if (path === '/api/projects' && request.method === 'GET') return await handleGetProjects(env);
      if (path === '/api/projects' && request.method === 'POST') return await handleSaveProject(env, await request.json());
      if (path.startsWith('/api/projects/') && request.method === 'DELETE') return await handleDeleteProject(env, path.split('/').pop());
      if (path === '/api/chat' && request.method === 'GET') return await handleGetChat(env, url.searchParams.get('projectId'));
      if (path === '/api/chat' && request.method === 'POST') return await handleSaveChat(env, await request.json());
      if (path === '/api/memory' && request.method === 'GET') return await handleGetMemory(env, url.searchParams.get('key'));
      if (path === '/api/memory' && request.method === 'POST') return await handleSaveMemory(env, await request.json());
      // Backup: GET returns data, POST pushes to GitHub
      if (path === '/api/backup' && request.method === 'GET') return await handleBackupGet(env);
      if (path === '/api/backup' && request.method === 'POST') return await handleBackupPost(env, await request.json());
      if (path === '/api/search' && request.method === 'GET') return await handleSearch(url.searchParams.get('q'));
      // AI Proxy -- route AI calls through Worker (keys sent from client, adds one layer of indirection)
      if (path === '/api/ai' && request.method === 'POST') return await handleAiProxy(await request.json());
      // Inbuilt Publish -- KV storage (no auth required for GET /p/)
      if (path.startsWith('/p/') && request.method === 'GET') return await handleServeApp(env, path.slice(3));
      if (path === '/api/publish' && request.method === 'POST') return await handlePublishApp(env, await request.json());
      if (path === '/api/publish' && request.method === 'GET') return await handleListPublished(env);
      if (path.startsWith('/api/publish/') && request.method === 'DELETE') return await handleDeletePublished(env, path.slice(13));
      // Admin OTP send (email recovery)
      if (path === '/api/admin/send-otp' && request.method === 'POST') return await handleSendAdminOtp(env, await request.json());
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(backupToGitHub(env, env.GITHUB_TOKEN, env.GITHUB_REPO));
  },
};

async function handleStats(env) {
  await ensureTables(env);
  const projects = await env.DB.prepare('SELECT COUNT(*) as count FROM projects').first();
  const chats = await env.DB.prepare('SELECT COUNT(*) as count FROM chats').first();
  const memories = await env.DB.prepare('SELECT COUNT(*) as count FROM memories').first();
  return json({ projects: projects?.count ?? 0, chats: chats?.count ?? 0, memories: memories?.count ?? 0 });
}
async function handleGetProjects(env) {
  await ensureTables(env);
  const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  return json(results);
}
async function handleSaveProject(env, body) {
  await ensureTables(env);
  const { id, name, description, code, template, deployUrl, updatedAt } = body;
  await env.DB.prepare(`INSERT INTO projects (id, name, description, code, template, deploy_url, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, code=excluded.code, template=excluded.template, deploy_url=excluded.deploy_url, updated_at=excluded.updated_at`).bind(id, name, description || '', JSON.stringify(code || {}), template || 'blank', deployUrl || '', updatedAt || new Date().toISOString()).run();
  return json({ ok: true });
}
async function handleDeleteProject(env, id) {
  await env.DB.prepare('DELETE FROM projects WHERE id = ?1').bind(id).run();
  await env.DB.prepare('DELETE FROM chats WHERE project_id = ?1').bind(id).run();
  return json({ ok: true });
}
async function handleGetChat(env, projectId) {
  await ensureTables(env);
  if (!projectId) return json([]);
  const { results } = await env.DB.prepare('SELECT * FROM chats WHERE project_id = ?1 ORDER BY created_at ASC').bind(projectId).all();
  return json(results);
}
async function handleSaveChat(env, body) {
  await ensureTables(env);
  const { id, projectId, role, content, createdAt } = body;
  await env.DB.prepare(`INSERT OR REPLACE INTO chats (id, project_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)`).bind(id, projectId, role, content, createdAt || new Date().toISOString()).run();
  return json({ ok: true });
}
async function handleGetMemory(env, key) {
  await ensureTables(env);
  if (!key) return json(null);
  const row = await env.DB.prepare('SELECT value FROM memories WHERE key = ?1').bind(key).first();
  return json(row ? row.value : null);
}
async function handleSaveMemory(env, body) {
  await ensureTables(env);
  const { key, value } = body;
  await env.DB.prepare(`INSERT OR REPLACE INTO memories (key, value, updated_at) VALUES (?1, ?2, ?3)`).bind(key, value, new Date().toISOString()).run();
  return json({ ok: true });
}

// GET backup -- returns raw D1 data
async function handleBackupGet(env) {
  return json(await collectAllData(env));
}

// POST backup -- pushes D1 snapshot to GitHub using token from request body
async function handleBackupPost(env, body) {
  const { githubToken, githubRepo } = body || {};
  const token = githubToken || env.GITHUB_TOKEN;
  const repo = githubRepo || env.GITHUB_REPO;
  if (!token || !repo) {
    return new Response(JSON.stringify({ error: 'GitHub token and repo required' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
  try {
    const result = await backupToGitHub(env, token, repo);
    return json(result);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

async function handleSearch(query) {
  if (!query) return json([]);
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
    const data = await res.json();
    return json((data.RelatedTopics || []).slice(0, 5).map(t => ({ title: t.Text || '', url: t.FirstURL || '' })));
  } catch { return json([]); }
}

// AI Proxy -- routes AI requests through Worker to reduce direct browser exposure
async function handleAiProxy(body) {
  const { provider, model, messages, apiKey, systemPrompt } = body || {};
  if (!provider || !model || !messages || !apiKey) {
    return new Response(JSON.stringify({ error: 'Missing required fields: provider, model, messages, apiKey' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
  let reply = '';
  if (provider === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://brainforge-7xn.pages.dev', 'X-Title': 'BrainForge' },
      body: JSON.stringify({ model, messages: systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const d = await res.json();
    reply = d.choices?.[0]?.message?.content || '';
  } else if (provider === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const d = await res.json();
    reply = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const d = await res.json();
    reply = d.choices?.[0]?.message?.content || '';
  } else if (provider === 'github') {
    const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages }),
    });
    if (!res.ok) throw new Error(`GitHub Models ${res.status}`);
    const d = await res.json();
    reply = d.choices?.[0]?.message?.content || '';
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return json({ reply });
}

// ===== KV Inbuilt Publish =====
async function handlePublishApp(env, body) {
  if (!env.APPS_KV) return json({ error: 'KV not configured' }, 500);
  const { html, slug, projectName } = body || {};
  if (!html) return new Response(JSON.stringify({ error: 'html required' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  const id = slug || (projectName || 'app').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 7);
  const meta = { id, projectName: projectName || id, publishedAt: new Date().toISOString(), size: html.length };
  await env.APPS_KV.put(`app:${id}`, html, { metadata: meta });
  await env.APPS_KV.put(`meta:${id}`, JSON.stringify(meta));
  return json({ ok: true, id, url: `/p/${id}` });
}

async function handleServeApp(env, id) {
  if (!env.APPS_KV || !id) return new Response('Not found', { status: 404 });
  const html = await env.APPS_KV.get(`app:${id}`);
  if (!html) return new Response('App not found', { status: 404 });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

async function handleListPublished(env) {
  if (!env.APPS_KV) return json([]);
  const list = await env.APPS_KV.list({ prefix: 'meta:' });
  const apps = await Promise.all(list.keys.map(async k => {
    const v = await env.APPS_KV.get(k.name);
    try { return JSON.parse(v || '{}'); } catch { return null; }
  }));
  return json(apps.filter(Boolean).sort((a, b) => b.publishedAt?.localeCompare(a.publishedAt)));
}

async function handleDeletePublished(env, id) {
  if (!env.APPS_KV || !id) return json({ error: 'invalid' }, 400);
  await env.APPS_KV.delete(`app:${id}`);
  await env.APPS_KV.delete(`meta:${id}`);
  return json({ ok: true });
}


// ===== Admin OTP Email =====
async function handleSendAdminOtp(env, body) {
  const { email, otp } = body || {};
  if (!email || !otp) return json({ error: 'email and otp required' }, 400);
  if (!env.RESEND_API_KEY) {
    // No email service configured -- return success anyway (OTP shown in frontend console)
    return json({ ok: true, warning: 'RESEND_API_KEY not set, OTP not sent' });
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'BrainForge Admin <noreply@brainforge.app>',
      to: [email],
      subject: 'BrainForge Admin - Password Recovery OTP',
      html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
        <h2 style="color:#7c3aed;">BrainForge Admin Recovery</h2>
        <p>Tumhara 6-digit OTP:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#7c3aed;padding:20px;background:#f3f0ff;border-radius:8px;text-align:center;">${otp}</div>
        <p style="color:#666;font-size:12px;margin-top:20px;">Yeh OTP 10 minute ke liye valid hai. Agar tumne yeh request nahi ki toh ignore karo.</p>
      </div>`,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Email send failed');
  }
  return json({ ok: true });
}


async function backupToGitHub(env, token, repo) {
  const data = await collectAllData(env);
  const rows = (data.projects?.length || 0) + (data.chats?.length || 0) + (data.memories?.length || 0);
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const path = `backup/d1-backup-${new Date().toISOString().split('T')[0]}.json`;
  let sha = '';
  try {
    const check = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `token ${token}`, 'User-Agent': 'BrainForge-Worker' }
    });
    if (check.ok) { sha = (await check.json()).sha || ''; }
  } catch {}
  const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'BrainForge-Worker' },
    body: JSON.stringify({ message: `D1 backup ${new Date().toISOString()}`, content, ...(sha ? { sha } : {}) }),
  });
  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || `GitHub push failed: ${putRes.status}`);
  }
  return { ok: true, path, rows };
}

async function collectAllData(env) {
  await ensureTables(env);
  const { results: projects } = await env.DB.prepare('SELECT * FROM projects').all();
  const { results: chats } = await env.DB.prepare('SELECT * FROM chats').all();
  const { results: memories } = await env.DB.prepare('SELECT * FROM memories').all();
  return { exportedAt: new Date().toISOString(), projects, chats, memories };
}
async function ensureTables(env) {
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', code TEXT DEFAULT '{}', template TEXT DEFAULT 'blank', deploy_url TEXT DEFAULT '', updated_at TEXT);
    CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT);
    CREATE TABLE IF NOT EXISTS memories (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT);
  `);
}
function json(data) {
  return new Response(JSON.stringify(data), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}
