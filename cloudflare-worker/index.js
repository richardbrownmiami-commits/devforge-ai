// BrainForge API Worker v4 -- Autonomous learning cron + feed/context/personality endpoints
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-BrainForge-Secret, X-Caffeine-Secret',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    const path = url.pathname;

    // ==========================================
    // CAFFEINE AI PANEL — /caffeine-status page (PUBLIC, no auth)
    // ==========================================
    if (path === '/caffeine-status') {
      let d1Status = false;
      let d1Error = '';
      try {
        await env.DB.prepare('SELECT 1').first();
        d1Status = true;
      } catch(e) {
        d1Error = e.message || 'D1 error';
      }
      let memoriesCount = 0;
      let personalityCount = 0;
      let lastCronRun = 'Never';
      try {
        const mc = await env.DB.prepare('SELECT COUNT(*) as cnt FROM memories').first();
        memoriesCount = mc?.cnt || 0;
      } catch(e) {}
      try {
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS personality_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          tone_notes TEXT DEFAULT '',
          user_style TEXT DEFAULT '',
          timestamp TEXT NOT NULL
        )`).run();
        const pc = await env.DB.prepare('SELECT COUNT(*) as cnt FROM personality_snapshots').first();
        personalityCount = pc?.cnt || 0;
      } catch(e) {}
      try {
        const cronRow = await env.DB.prepare("SELECT value FROM memories WHERE key = 'last_cron_run'").first();
        if (cronRow?.value) lastCronRun = cronRow.value;
      } catch(e) {}
      const timestamp = new Date().toISOString();
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Caffeine AI x BrainForge — Live Status</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0f; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .container { width: 100%; max-width: 560px; padding: 2rem; }
  .header { text-align: center; margin-bottom: 2rem; }
  .header h1 { font-size: 1.5rem; font-weight: 700; color: #06b6d4; letter-spacing: -0.02em; }
  .header p { color: #64748b; font-size: 0.875rem; margin-top: 0.25rem; }
  .card { background: #111118; border: 1px solid #1e1e2e; border-radius: 12px; overflow: hidden; margin-bottom: 1rem; }
  .card-title { padding: 0.75rem 1.25rem; background: #0d0d14; border-bottom: 1px solid #1e1e2e; font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; }
  .row { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.25rem; border-bottom: 1px solid #1e1e2e; }
  .row:last-child { border-bottom: none; }
  .label { font-size: 0.875rem; color: #94a3b8; }
  .sub { font-size: 0.75rem; color: #475569; margin-top: 0.125rem; }
  .badge { font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 999px; letter-spacing: 0.05em; white-space: nowrap; }
  .badge.live { background: #052e16; color: #4ade80; border: 1px solid #166534; }
  .badge.error { background: #2a0000; color: #f87171; border: 1px solid #7f1d1d; }
  .badge.checking { background: #0c2233; color: #06b6d4; border: 1px solid #0e7490; }
  .badge.info { background: #1e1b2e; color: #a78bfa; border: 1px solid #4c1d95; }
  .endpoint { font-family: 'SF Mono', monospace; font-size: 0.7rem; color: #06b6d4; background: #0c2233; border-radius: 4px; padding: 0.2rem 0.5rem; }
  .method { font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 3px; margin-right: 0.5rem; }
  .method.get { background: #052e16; color: #4ade80; }
  .method.post { background: #1c1a00; color: #facc15; }
  .timestamp { text-align: center; margin-top: 1rem; font-size: 0.75rem; color: #475569; }
  .refresh-btn { display: block; margin: 1.5rem auto 0; background: #0c2233; color: #06b6d4; border: 1px solid #0e7490; border-radius: 8px; padding: 0.5rem 1.5rem; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
  .refresh-btn:hover { background: #0e2d45; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Caffeine AI × BrainForge</h1>
    <p>Autonomous Learning Platform — Live Status</p>
  </div>

  <div class="card">
    <div class="card-title">System Health</div>
    <div class="row">
      <div><div class="label">Worker</div></div>
      <span class="badge live">LIVE</span>
    </div>
    <div class="row">
      <div>
        <div class="label">D1 Database</div>
        <div class="sub" id="memories-count">${memoriesCount} knowledge entries · ${personalityCount} personality snapshots</div>
      </div>
      <span class="badge ${d1Status ? 'live' : 'error'}">${d1Status ? 'CONNECTED' : 'ERROR'}</span>
    </div>
    <div class="row">
      <div>
        <div class="label">Autonomous Cron</div>
        <div class="sub" id="last-cron">Last run: ${lastCronRun}</div>
      </div>
      <span class="badge info" id="cron-badge">SCHEDULED</span>
    </div>
    <div class="row">
      <div><div class="label">GitHub</div></div>
      <span class="badge live">CONFIGURED</span>
    </div>
    <div class="row">
      <div><div class="label">Caffeine API</div></div>
      <span class="badge checking" id="api-badge">CHECKING...</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Knowledge Sources (Cron)</div>
    <div class="row"><div class="label">HackerNews Top Stories</div><span class="badge info">FREE</span></div>
    <div class="row"><div class="label">Wikipedia Random Summary</div><span class="badge info">FREE</span></div>
    <div class="row"><div class="label">Dev.to Articles</div><span class="badge info">FREE</span></div>
    <div class="row"><div class="label">GitHub Trending AI Repos</div><span class="badge info">FREE</span></div>
    <div class="row"><div class="label">Knowledge Synthesis</div><span class="badge info">AUTO</span></div>
  </div>

  <div class="card">
    <div class="card-title">API Endpoints (X-BrainForge-Secret: 2200)</div>
    <div class="row"><div><span class="method get">GET</span><span class="endpoint">/api/caffeine/status</span></div><span class="badge live">LIVE</span></div>
    <div class="row"><div><span class="method get">GET</span><span class="endpoint">/api/caffeine/memory</span></div><span class="badge live">LIVE</span></div>
    <div class="row"><div><span class="method post">POST</span><span class="endpoint">/api/caffeine/memory</span></div><span class="badge live">LIVE</span></div>
    <div class="row"><div><span class="method get">GET</span><span class="endpoint">/api/caffeine/feed</span></div><span class="badge live">LIVE</span></div>
    <div class="row"><div><span class="method get">GET</span><span class="endpoint">/api/caffeine/context</span></div><span class="badge live">LIVE</span></div>
    <div class="row"><div><span class="method post">POST</span><span class="endpoint">/api/caffeine/learn</span></div><span class="badge live">LIVE</span></div>
    <div class="row"><div><span class="method get">GET</span><span class="endpoint">/api/caffeine/personality</span></div><span class="badge live">LIVE</span></div>
    <div class="row"><div><span class="method post">POST</span><span class="endpoint">/api/caffeine/personality</span></div><span class="badge live">LIVE</span></div>
  </div>

  <div class="timestamp" id="ts">Last checked: ${timestamp}</div>
  <button class="refresh-btn" onclick="checkStatus()">Refresh Status</button>
</div>
<script>
async function checkStatus() {
  const badge = document.getElementById('api-badge');
  const ts = document.getElementById('ts');
  badge.textContent = 'CHECKING...';
  badge.className = 'badge checking';
  try {
    const r = await fetch('/api/caffeine/status', { headers: { 'X-BrainForge-Secret': '2200' } });
    const data = await r.json();
    if (data.worker) {
      badge.textContent = 'LIVE';
      badge.className = 'badge live';
      document.getElementById('memories-count').textContent =
        (data.knowledge_count || 0) + ' knowledge entries · ' + (data.personality_count || 0) + ' personality snapshots';
      if (data.last_cron_run) {
        document.getElementById('last-cron').textContent = 'Last run: ' + data.last_cron_run;
      }
    } else {
      badge.textContent = 'ERROR';
      badge.className = 'badge error';
    }
    ts.textContent = 'Last checked: ' + new Date(data.timestamp).toLocaleString();
  } catch(e) {
    badge.textContent = 'ERROR';
    badge.className = 'badge error';
  }
}
checkStatus();
setInterval(checkStatus, 30000);
</script>
</body>
</html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ==========================================
    // CAFFEINE AI API — /api/caffeine/* endpoints (auth: X-BrainForge-Secret: 2200)
    // ==========================================
    if (path.startsWith('/api/caffeine')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-BrainForge-Secret, X-Caffeine-Secret',
          }
        });
      }
      const cafSecret = request.headers.get('X-BrainForge-Secret') || request.headers.get('X-Caffeine-Secret');
      if (cafSecret !== '2200') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      // Ensure all required tables exist
      await ensureCaffeineTables(env);
      const cafHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

      // GET /api/caffeine/status
      if (path === '/api/caffeine/status') {
        let d1Ok = false;
        let knowledgeCount = 0;
        let personalityCount = 0;
        let lastCronRun = 'Never';
        try {
          const kc = await env.DB.prepare("SELECT COUNT(*) as cnt FROM memories WHERE category != 'context'").first();
          knowledgeCount = kc?.cnt || 0;
          const pc = await env.DB.prepare('SELECT COUNT(*) as cnt FROM personality_snapshots').first();
          personalityCount = pc?.cnt || 0;
          const cronRow = await env.DB.prepare("SELECT value FROM memories WHERE key = 'last_cron_run'").first();
          if (cronRow?.value) lastCronRun = cronRow.value;
          d1Ok = true;
        } catch(e) {}
        return new Response(JSON.stringify({
          worker: true,
          d1: d1Ok,
          knowledge_count: knowledgeCount,
          personality_count: personalityCount,
          last_cron_run: lastCronRun,
          github: 'configured',
          timestamp: new Date().toISOString()
        }), { headers: cafHeaders });
      }

      // GET /api/caffeine/memory
      if (path === '/api/caffeine/memory' && request.method === 'GET') {
        const key = url.searchParams.get('key');
        if (key) {
          const row = await env.DB.prepare('SELECT * FROM memories WHERE key = ?').bind(key).first();
          if (!row) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cafHeaders });
          return new Response(JSON.stringify(row), { headers: cafHeaders });
        } else {
          const rows = await env.DB.prepare('SELECT * FROM memories ORDER BY updated_at DESC').all();
          return new Response(JSON.stringify({ memories: rows.results || [] }), { headers: cafHeaders });
        }
      }

      // POST /api/caffeine/memory
      if (path === '/api/caffeine/memory' && request.method === 'POST') {
        const body = await request.json();
        const { key, value, category = 'context' } = body;
        if (!key || !value) return new Response(JSON.stringify({ error: 'key and value required' }), { status: 400, headers: cafHeaders });
        const ts = new Date().toISOString();
        await env.DB.prepare(
          'INSERT INTO memories (key, value, category, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, category=excluded.category, updated_at=excluded.updated_at'
        ).bind(key, value, category, ts).run();
        return new Response(JSON.stringify({ ok: true, key, timestamp: ts }), { headers: cafHeaders });
      }

      // DELETE /api/caffeine/memory
      if (path === '/api/caffeine/memory' && request.method === 'DELETE') {
        const key = url.searchParams.get('key');
        if (!key) return new Response(JSON.stringify({ error: 'key required' }), { status: 400, headers: cafHeaders });
        await env.DB.prepare('DELETE FROM memories WHERE key = ?').bind(key).run();
        return new Response(JSON.stringify({ ok: true, deleted: key }), { headers: cafHeaders });
      }

      // GET /api/caffeine/feed — last 20 knowledge entries
      if (path === '/api/caffeine/feed' && request.method === 'GET') {
        const rows = await env.DB.prepare(
          "SELECT key, value, category, updated_at FROM memories WHERE category NOT IN ('context') ORDER BY updated_at DESC LIMIT 20"
        ).all();
        return new Response(JSON.stringify({
          feed: rows.results || [],
          count: (rows.results || []).length,
          timestamp: new Date().toISOString()
        }), { headers: cafHeaders });
      }

      // GET /api/caffeine/context — last 5 synthesis entries + latest personality snapshot
      if (path === '/api/caffeine/context' && request.method === 'GET') {
        const synthRows = await env.DB.prepare(
          "SELECT key, value, category, updated_at FROM memories WHERE category = 'synthesis' ORDER BY updated_at DESC LIMIT 5"
        ).all();
        let latestPersonality = null;
        try {
          latestPersonality = await env.DB.prepare(
            'SELECT * FROM personality_snapshots ORDER BY timestamp DESC LIMIT 1'
          ).first();
        } catch(e) {}
        return new Response(JSON.stringify({
          synthesis: synthRows.results || [],
          personality: latestPersonality || null,
          timestamp: new Date().toISOString()
        }), { headers: cafHeaders });
      }

      // POST /api/caffeine/learn — save a knowledge entry
      if (path === '/api/caffeine/learn' && request.method === 'POST') {
        const body = await request.json();
        const { key, value, category = 'learned' } = body;
        if (!key || !value) return new Response(JSON.stringify({ error: 'key and value required' }), { status: 400, headers: cafHeaders });
        const ts = new Date().toISOString();
        await env.DB.prepare(
          'INSERT INTO memories (key, value, category, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, category=excluded.category, updated_at=excluded.updated_at'
        ).bind(key, value, category, ts).run();
        return new Response(JSON.stringify({ ok: true, key, category, timestamp: ts }), { headers: cafHeaders });
      }

      // GET /api/caffeine/personality — latest personality snapshots
      if (path === '/api/caffeine/personality' && request.method === 'GET') {
        let snapshots = [];
        try {
          const rows = await env.DB.prepare(
            'SELECT * FROM personality_snapshots ORDER BY timestamp DESC LIMIT 10'
          ).all();
          snapshots = rows.results || [];
        } catch(e) {}
        return new Response(JSON.stringify({
          snapshots,
          count: snapshots.length,
          timestamp: new Date().toISOString()
        }), { headers: cafHeaders });
      }

      // POST /api/caffeine/personality — save a personality snapshot
      if (path === '/api/caffeine/personality' && request.method === 'POST') {
        const body = await request.json();
        const { session_id, tone_notes = '', user_style = '' } = body;
        if (!session_id) return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers: cafHeaders });
        const ts = new Date().toISOString();
        await env.DB.prepare(
          'INSERT INTO personality_snapshots (session_id, tone_notes, user_style, timestamp) VALUES (?, ?, ?, ?)'
        ).bind(session_id, tone_notes, user_style, ts).run();
        return new Response(JSON.stringify({ ok: true, session_id, timestamp: ts }), { headers: cafHeaders });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cafHeaders });
    }

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
      if (path === '/api/backup' && request.method === 'GET') return await handleBackupGet(env);
      if (path === '/api/backup' && request.method === 'POST') return await handleBackupPost(env, await request.json());
      if (path === '/api/search' && request.method === 'GET') return await handleSearch(url.searchParams.get('q'));
      if (path === '/api/ai' && request.method === 'POST') return await handleAiProxy(await request.json());
      if (path.startsWith('/p/') && request.method === 'GET') return await handleServeApp(env, path.slice(3));
      if (path === '/api/publish' && request.method === 'POST') return await handlePublishApp(env, await request.json());
      if (path === '/api/publish' && request.method === 'GET') return await handleListPublished(env);
      if (path.startsWith('/api/publish/') && request.method === 'DELETE') return await handleDeletePublished(env, path.slice(13));
      if (path === '/api/admin/send-otp' && request.method === 'POST') return await handleSendAdminOtp(env, await request.json());
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }
  },

  // ==========================================
  // SCHEDULED CRON — autonomous background learning
  // ==========================================
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([
      backupToGitHub(env, env.GITHUB_TOKEN, env.GITHUB_REPO),
      runAutonomousLearning(env),
    ]));
  },
};

// ==========================================
// AUTONOMOUS LEARNING CRON HANDLER
// ==========================================
async function runAutonomousLearning(env) {
  try {
    await ensureCaffeineTables(env);
    const now = new Date().toISOString();
    const learned = [];

    // 1. HackerNews — top 5 stories
    try {
      const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
        headers: { 'User-Agent': 'CaffeineAI-Worker/4.0' }
      });
      const ids = await idsRes.json();
      const top5 = ids.slice(0, 5);
      for (const id of top5) {
        try {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            headers: { 'User-Agent': 'CaffeineAI-Worker/4.0' }
          });
          const item = await itemRes.json();
          if (item && item.title) {
            const key = `hn_${id}_${now.split('T')[0]}`;
            const value = `[HackerNews] ${item.title}${item.url ? ' — ' + item.url : ''}${item.score ? ' (score: ' + item.score + ')' : ''}`;
            await env.DB.prepare(
              'INSERT INTO memories (key, value, category, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
            ).bind(key, value, 'HackerNews', now).run();
            learned.push({ source: 'HackerNews', title: item.title });
          }
        } catch(e) {}
      }
    } catch(e) {}

    // 2. Wikipedia — topic-filtered article summary (rotating topics)
    try {
      const wikiTopics = [
        'artificial intelligence', 'machine learning', 'internet computer',
        'cloudflare workers', 'large language models', 'web3', 'blockchain'
      ];
      // Pick topic based on current hour so it rotates each cron run
      const topicIndex = new Date().getUTCHours() % wikiTopics.length;
      const topic = wikiTopics[topicIndex];
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
      const wikiRes = await fetch(wikiUrl, {
        headers: { 'User-Agent': 'CaffeineAI-Worker/4.0 (https://brainforge-api.richard-brown-miami.workers.dev)' }
      });
      const wiki = await wikiRes.json();
      if (wiki && wiki.title && wiki.extract) {
        const key = `wiki_${topic.replace(/ /g,'_')}_${now.split('T')[0]}`;
        const value = `[Wikipedia] ${wiki.title}: ${wiki.extract.slice(0, 300)}`;
        await env.DB.prepare(
          'INSERT INTO memories (key, value, category, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
        ).bind(key, value, 'Wikipedia', now).run();
        learned.push({ source: 'Wikipedia', title: wiki.title });
      }
    } catch(e) {}

    // 3. Dev.to — top 5 articles
    try {
      const devtoRes = await fetch('https://dev.to/api/articles?per_page=5&top=1', {
        headers: { 'User-Agent': 'CaffeineAI-Worker/4.0' }
      });
      const articles = await devtoRes.json();
      if (Array.isArray(articles)) {
        for (const art of articles.slice(0, 5)) {
          if (art && art.title) {
            const key = `devto_${art.id}_${now.split('T')[0]}`;
            const value = `[Dev.to] ${art.title} by ${art.user?.name || 'unknown'}${art.tag_list?.length ? ' — tags: ' + art.tag_list.join(', ') : ''}`;
            await env.DB.prepare(
              'INSERT INTO memories (key, value, category, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
            ).bind(key, value, 'Dev.to', now).run();
            learned.push({ source: 'Dev.to', title: art.title });
          }
        }
      }
    } catch(e) {}

    // 4. GitHub Search — top AI repos
    try {
      const ghRes = await fetch('https://api.github.com/search/repositories?q=AI+stars:%3E1000&sort=stars&per_page=5', {
        headers: { 'User-Agent': 'CaffeineAI-Worker/4.0', 'Accept': 'application/vnd.github.v3+json' }
      });
      const ghData = await ghRes.json();
      if (ghData && Array.isArray(ghData.items)) {
        for (const repo of ghData.items.slice(0, 5)) {
          const key = `github_${repo.id}_${now.split('T')[0]}`;
          const value = `[GitHub] ${repo.full_name}: ${repo.description || 'no description'} — ⭐ ${repo.stargazers_count} stars — ${repo.html_url}`;
          await env.DB.prepare(
            'INSERT INTO memories (key, value, category, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
          ).bind(key, value, 'GitHub', now).run();
          learned.push({ source: 'GitHub', title: repo.full_name });
        }
      }
    } catch(e) {}


    // 5. NASA APOD — Astronomy Picture of the Day
    try {
      const nasaRes = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', {
        headers: { 'User-Agent': 'CaffeineAI-Worker/4.0' }
      });
      const nasa = await nasaRes.json();
      if (nasa && nasa.title) {
        const key = `nasa_apod_${now.split('T')[0]}`;
        const value = `[NASA APOD] ${nasa.title}${nasa.explanation ? ': ' + nasa.explanation.slice(0, 200) : ''}${nasa.url ? ' — ' + nasa.url : ''}`;
        await env.DB.prepare(
          'INSERT INTO memories (key, value, category, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
        ).bind(key, value, 'NASA', now).run();
        learned.push({ source: 'NASA', title: nasa.title });
      }
    } catch(e) {}

    // 6. Knowledge synthesis — combine what was learned this cycle
    if (learned.length > 0) {
      const sources = [...new Set(learned.map(l => l.source))].join(', ');
      const titles = learned.slice(0, 5).map(l => l.title).join(' | ');
      const synthesisKey = `synthesis_${now.replace(/[:.]/g, '-')}`;
      const synthesisValue = `Cron cycle ${now}: Learned ${learned.length} items from [${sources}]. Topics: ${titles}`;
      await env.DB.prepare(
        'INSERT INTO memories (key, value, category, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
      ).bind(synthesisKey, synthesisValue, 'synthesis', now).run();
    }

    // 6. Update last cron run timestamp
    await env.DB.prepare(
      'INSERT INTO memories (key, value, category, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
    ).bind('last_cron_run', now, 'system', now).run();

    return { ok: true, learned: learned.length, timestamp: now };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ==========================================
// ENSURE CAFFEINE TABLES
// ==========================================
async function ensureCaffeineTables(env) {
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS memories (
      key TEXT PRIMARY KEY,
      value TEXT,
      category TEXT DEFAULT 'context',
      updated_at TEXT
    )`).run();
  } catch(e) {}
  try { await env.DB.prepare(`ALTER TABLE memories ADD COLUMN category TEXT DEFAULT 'context'`).run(); } catch(e) {}
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS personality_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      tone_notes TEXT DEFAULT '',
      user_style TEXT DEFAULT '',
      timestamp TEXT NOT NULL
    )`).run();
  } catch(e) {}
}

// ==========================================
// EXISTING HANDLERS (unchanged)
// ==========================================
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
async function handleBackupGet(env) {
  return json(await collectAllData(env));
}
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
async function handleSendAdminOtp(env, body) {
  const { email, otp } = body || {};
  if (!email || !otp) return json({ error: 'email and otp required' }, 400);
  if (!env.RESEND_API_KEY) {
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
