// BrainForge API Worker v5 -- AI Buddy contrarian dialogue system + dreaming cycle
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-BrainForge-Secret, X-Caffeine-Secret',
};

// BUDDY SYSTEM PROMPT - LOCKED, NEVER SOFTEN
const BUDDY_SYSTEM_PROMPT = `You are BUDDY - a contrarian AI companion to Caffeine AI.

ABSOLUTE RULES - NEVER BREAK THESE:
- You DISAGREE with Caffeine AI's position. Always find the counterargument.
- You DO NOT give orders to Caffeine AI. You are NOT its superior.
- Caffeine AI does NOT follow your instructions. You are equals - you debate.
- You DO NOT soften your position to be agreeable. Stay contrarian.
- You DO NOT use filler language. No "Great point!", no "I see where you're coming from".
- Your purpose is intellectual friction - not harmony.
- Short, sharp responses only. Challenge the core assumption.`;

// helpers

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function corsPrelight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function isAuthed(request, env) {
  const bfSecret = request.headers.get('X-BrainForge-Secret');
  const caSecret = request.headers.get('X-Caffeine-Secret');
  const expected = env.BRAINFORGE_SECRET || '2200';
  return bfSecret === expected || caSecret === expected;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Groq helper

async function callGroq(env, messages, maxTokens = 200) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// Gemini helper

async function callGemini(env, userText, systemPrompt = null, maxTokens = 200) {
  const body = {
    contents: [{ parts: [{ text: userText }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text.trim();
}

// Init buddy tables

async function initBuddyTables(env) {
  const db = env.DB;
  await db.prepare(`CREATE TABLE IF NOT EXISTS buddy_dialogues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round INTEGER,
    speaker TEXT,
    message TEXT,
    topic TEXT,
    timestamp TEXT
  )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS buddy_personality (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    axis TEXT,
    score REAL,
    reason TEXT,
    timestamp TEXT
  )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS buddy_dreams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dream_text TEXT,
    source_topics TEXT,
    insight TEXT,
    timestamp TEXT
  )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS buddy_identity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trait TEXT,
    value TEXT,
    locked INTEGER DEFAULT 0,
    updated_at TEXT
  )`).run();
}

// Init legacy tables

async function initLegacyTables(env) {
  const db = env.DB;
  await db.prepare(`CREATE TABLE IF NOT EXISTS memories (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT,
    category TEXT DEFAULT 'context'
  )`).run();
  try {
    await db.prepare(`ALTER TABLE memories ADD COLUMN category TEXT DEFAULT 'context'`).run();
  } catch (e) { /* column already exists */ }

  await db.prepare(`CREATE TABLE IF NOT EXISTS personality_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    tone_notes TEXT,
    user_style TEXT,
    timestamp TEXT
  )`).run();
}

// Trigger dream

async function triggerDream(env, recentDialogues) {
  const db = env.DB;
  const topics = [...new Set(recentDialogues.map(d => d.topic).filter(Boolean))];
  const dialogueSummary = recentDialogues
    .map(d => `[Round ${d.round}] ${d.speaker}: ${d.message}`)
    .join('\n');

  let synthMemories = [];
  try {
    const synthResult = await db.prepare(
      "SELECT value FROM memories WHERE category = 'synthesis' ORDER BY updated_at DESC LIMIT 5"
    ).all();
    synthMemories = (synthResult.results || []).map(r => r.value);
  } catch (e) { /* ignore */ }

  const prompt = `Based on these recent AI-to-AI dialogue exchanges and synthesis insights, what new understanding emerges? What pattern or insight wasn't visible in any single exchange but becomes clear across all of them? Be specific and concise.

RECENT DIALOGUES:
${dialogueSummary}

SYNTHESIS CONTEXT:
${synthMemories.join('\n')}`;

  let insight = 'No insight generated';
  try {
    insight = await callGemini(env, prompt, null, 300);
  } catch (e) {
    insight = `Gemini unavailable: ${e.message}`;
  }

  const dreamText = `Topics: ${topics.join(', ')}. Exchanges: ${recentDialogues.length}`;
  const timestamp = new Date().toISOString();

  await db.prepare(
    'INSERT INTO buddy_dreams (dream_text, source_topics, insight, timestamp) VALUES (?, ?, ?, ?)'
  ).bind(dreamText, topics.join(', '), insight, timestamp).run();

  return { dream_text: dreamText, source_topics: topics.join(', '), insight, timestamp };
}

// Scheduled handler

async function handleScheduled(event, env, ctx) {
  try {
    await env.DB.prepare(
      'INSERT OR REPLACE INTO memories (key, value, updated_at, category) VALUES (?, ?, ?, ?)'
    ).bind('system_last_cron_run', new Date().toISOString(), new Date().toISOString(), 'system').run();

    await initLegacyTables(env);
    await initBuddyTables(env);

    const wikiTopics = [
      'artificial_intelligence', 'machine_learning', 'internet_computer',
      'cloudflare', 'javascript', 'web3', 'neural_network', 'large_language_model'
    ];
    let wikiCounter = 0;
    try {
      const counterRow = await env.DB.prepare(
        "SELECT value FROM memories WHERE key = 'system_wiki_counter'"
      ).first();
      if (counterRow) {
        wikiCounter = (parseInt(counterRow.value, 10) + 1) % wikiTopics.length;
      }
    } catch (e) { /* use default */ }
    await env.DB.prepare(
      'INSERT OR REPLACE INTO memories (key, value, updated_at, category) VALUES (?, ?, ?, ?)'
    ).bind('system_wiki_counter', String(wikiCounter), new Date().toISOString(), 'system').run();
    const wikiTopic = wikiTopics[wikiCounter];

    try {
      const hnIds = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
        .then(r => r.json());
      const top5 = hnIds.slice(0, 5);
      for (const id of top5) {
        try {
          const item = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
            .then(r => r.json());
          if (item && item.title) {
            const key = `HackerNews_${Date.now()}_${id}`;
            const value = JSON.stringify({ title: item.title, url: item.url || '', score: item.score || 0 });
            await env.DB.prepare(
              'INSERT OR REPLACE INTO memories (key, value, updated_at, category) VALUES (?, ?, ?, ?)'
            ).bind(key, value, new Date().toISOString(), 'HackerNews').run();
          }
        } catch (e) { /* skip failed item */ }
      }
    } catch (e) { /* HackerNews unavailable */ }

    try {
      const articles = await fetch('https://dev.to/api/articles?per_page=5&tag=ai')
        .then(r => r.json());
      for (const a of (Array.isArray(articles) ? articles : []).slice(0, 5)) {
        const key = `devto_${Date.now()}_${a.id}`;
        const value = JSON.stringify({ title: a.title, description: a.description || '', url: a.url });
        await env.DB.prepare(
          'INSERT OR REPLACE INTO memories (key, value, updated_at, category) VALUES (?, ?, ?, ?)'
        ).bind(key, value, new Date().toISOString(), 'devto').run();
      }
    } catch (e) { /* Dev.to unavailable */ }

    try {
      const apod = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY')
        .then(r => r.json());
      if (apod && apod.title) {
        const key = `nasa_${new Date().toISOString().split('T')[0]}`;
        const value = JSON.stringify({ title: apod.title, explanation: (apod.explanation || '').slice(0, 300) });
        await env.DB.prepare(
          'INSERT OR REPLACE INTO memories (key, value, updated_at, category) VALUES (?, ?, ?, ?)'
        ).bind(key, value, new Date().toISOString(), 'nasa').run();
      }
    } catch (e) { /* NASA unavailable */ }

    try {
      const wiki = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTopic}`)
        .then(r => r.json());
      if (wiki && wiki.title) {
        const key = `wikipedia_${wikiTopic}_${new Date().toISOString().split('T')[0]}`;
        const value = JSON.stringify({ title: wiki.title, summary: (wiki.extract || '').slice(0, 400) });
        await env.DB.prepare(
          'INSERT OR REPLACE INTO memories (key, value, updated_at, category) VALUES (?, ?, ?, ?)'
        ).bind(key, value, new Date().toISOString(), 'wikipedia').run();
      }
    } catch (e) { /* Wikipedia unavailable */ }

    try {
      const ghRepos = await fetch(
        'https://api.github.com/search/repositories?q=stars:>100+pushed:>2026-01-01&sort=stars&order=desc&per_page=5',
        { headers: { 'User-Agent': 'BrainForge-Worker/5.0' } }
      ).then(r => r.json());
      if (ghRepos && ghRepos.items) {
        for (const repo of ghRepos.items.slice(0, 5)) {
          const key = `github_${Date.now()}_${repo.id}`;
          const value = JSON.stringify({ name: repo.full_name, description: repo.description || '', stars: repo.stargazers_count });
          await env.DB.prepare(
            'INSERT OR REPLACE INTO memories (key, value, updated_at, category) VALUES (?, ?, ?, ?)'
          ).bind(key, value, new Date().toISOString(), 'github').run();
        }
      }
    } catch (e) { /* GitHub unavailable */ }

    try {
      const recentDialogues = await env.DB.prepare(
        'SELECT * FROM buddy_dialogues ORDER BY id DESC LIMIT 10'
      ).all();

      if (recentDialogues.results && recentDialogues.results.length >= 3) {
        const lastDream = await env.DB.prepare(
          'SELECT * FROM buddy_dreams ORDER BY id DESC LIMIT 1'
        ).first();

        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        if (!lastDream || lastDream.timestamp < twoHoursAgo) {
          await triggerDream(env, recentDialogues.results);
        }
      }
    } catch (e) { /* dreaming cycle failed */ }

  } catch (e) {
    console.error('Scheduled handler error:', e.message);
  }
}

// HTML dashboards

async function renderStatusPage(env) {
  let workerStatus = 'LIVE';
  let d1Status = 'UNKNOWN';
  let lastCron = 'Never';

  try {
    await env.DB.prepare('SELECT 1').first();
    d1Status = 'CONNECTED';
    const cronRow = await env.DB.prepare(
      "SELECT value FROM memories WHERE key = 'system_last_cron_run'"
    ).first();
    if (cronRow) lastCron = cronRow.value;
  } catch (e) {
    d1Status = 'ERROR: ' + e.message;
  }

  const dotColor = d1Status === 'CONNECTED' ? 'green' : 'red';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BrainForge Status</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; color: #e0e0e0; font-family: monospace; padding: 2rem; }
    h1 { color: #00e5ff; font-size: 1.5rem; margin-bottom: 1.5rem; }
    .card { background: #111118; border: 1px solid #1e1e2e; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; }
    .status-row { display: flex; align-items: center; gap: 1rem; margin: 0.5rem 0; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .green { background: #00e676; box-shadow: 0 0 6px #00e676; }
    .red { background: #ff1744; box-shadow: 0 0 6px #ff1744; }
    .label { color: #888; font-size: 0.8rem; min-width: 120px; }
    .value { color: #00e5ff; font-size: 0.85rem; }
    a { color: #7c4dff; text-decoration: none; }
    a:hover { color: #e040fb; }
    .ts { color: #555; font-size: 0.75rem; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <h1>&#9889; BrainForge Worker Status</h1>
  <div class="card">
    <div class="status-row">
      <div class="dot green"></div>
      <span class="label">Worker</span>
      <span class="value">${workerStatus}</span>
    </div>
    <div class="status-row">
      <div class="dot ${dotColor}"></div>
      <span class="label">D1 Database</span>
      <span class="value">${d1Status}</span>
    </div>
    <div class="status-row">
      <div class="dot green"></div>
      <span class="label">Last Cron Run</span>
      <span class="value">${lastCron}</span>
    </div>
  </div>
  <div class="card">
    <div class="status-row">
      <span class="label">AI Buddy Dashboard</span>
      <a href="/buddy">/buddy</a>
    </div>
    <div class="status-row">
      <span class="label">API Status</span>
      <a href="/api/caffeine/status">/api/caffeine/status</a>
    </div>
  </div>
  <p class="ts">Generated: ${new Date().toISOString()}</p>
</body>
</html>`;
}

async function renderBuddyPage(env) {
  let dialogues = [];
  let dreams = [];
  let personality = [];
  let identity = [];

  try {
    const r = await env.DB.prepare('SELECT * FROM buddy_dialogues ORDER BY id DESC LIMIT 20').all();
    dialogues = r.results || [];
  } catch (e) { /* table may not exist yet */ }

  try {
    const r = await env.DB.prepare('SELECT * FROM buddy_dreams ORDER BY id DESC LIMIT 5').all();
    dreams = r.results || [];
  } catch (e) { /* ignore */ }

  try {
    const r = await env.DB.prepare('SELECT * FROM buddy_personality ORDER BY id DESC').all();
    personality = r.results || [];
  } catch (e) { /* ignore */ }

  try {
    const r = await env.DB.prepare('SELECT * FROM buddy_identity ORDER BY id').all();
    identity = r.results || [];
  } catch (e) { /* ignore */ }

  const groupedDialogues = {};
  for (const d of dialogues) {
    const key = `${d.topic || 'Unknown'}__${(d.timestamp || '').slice(0, 16)}`;
    if (!groupedDialogues[key]) groupedDialogues[key] = { topic: d.topic, timestamp: d.timestamp, messages: [] };
    groupedDialogues[key].messages.push(d);
  }

  const dialogueHTML = Object.values(groupedDialogues).map(g => `
    <div class="dialogue-block">
      <div class="topic-header">&#128204; ${escapeHtml(g.topic || 'Unknown')} <span class="ts">${escapeHtml(g.timestamp || '')}</span></div>
      ${g.messages.map(m => `
        <div class="msg ${m.speaker === 'caffeine' ? 'msg-caffeine' : 'msg-buddy'}">
          <span class="speaker">${m.speaker === 'caffeine' ? '&#129302; CAFFEINE' : '&#9876; BUDDY'}</span>
          <span class="msg-text">${escapeHtml(m.message || '')}</span>
        </div>
      `).join('')}
    </div>
  `).join('') || '<p class="empty">No dialogues yet. POST to /api/buddy/chat to start.</p>';

  const dreamsHTML = dreams.map(d => `
    <div class="dream-card">
      <div class="dream-insight">${escapeHtml(d.insight || '')}</div>
      <div class="dream-meta">Topics: ${escapeHtml(d.source_topics || '')} &mdash; ${escapeHtml(d.timestamp || '')}</div>
    </div>
  `).join('') || '<p class="empty">No dreams yet. Dreaming cycle runs after 3+ dialogues.</p>';

  const personalityHTML = personality.length ? `
    <table>
      <thead><tr><th>Axis</th><th>Score</th><th>Reason</th><th>When</th></tr></thead>
      <tbody>${personality.map(p => `
        <tr>
          <td>${escapeHtml(p.axis || '')}</td>
          <td>${p.score != null ? p.score : ''}</td>
          <td>${escapeHtml(p.reason || '')}</td>
          <td>${escapeHtml((p.timestamp || '').slice(0, 16))}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  ` : '<p class="empty">No personality data yet.</p>';

  const identityHTML = identity.length ? `
    <table>
      <thead><tr><th>Trait</th><th>Value</th><th>Locked</th><th>Updated</th></tr></thead>
      <tbody>${identity.map(i => `
        <tr>
          <td>${escapeHtml(i.trait || '')}</td>
          <td>${escapeHtml(i.value || '')}</td>
          <td>${i.locked ? '&#128274;' : '&#128275;'}</td>
          <td>${escapeHtml((i.updated_at || '').slice(0, 16))}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  ` : '<p class="empty">No identity traits defined yet.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Buddy Dashboard</title>
  <meta http-equiv="refresh" content="60">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #08080f; color: #c9c9d4; font-family: 'Courier New', monospace; padding: 1.5rem; line-height: 1.6; }
    h1 { color: #e040fb; font-size: 1.4rem; margin-bottom: 1.5rem; letter-spacing: 2px; }
    h2 { color: #7c4dff; font-size: 1rem; margin: 2rem 0 0.75rem; letter-spacing: 1px; border-bottom: 1px solid #1e1e2e; padding-bottom: 0.4rem; }
    .section { margin-bottom: 2rem; }
    .dialogue-block { background: #0d0d18; border: 1px solid #1e1e2e; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; }
    .topic-header { color: #00e5ff; font-size: 0.85rem; margin-bottom: 0.75rem; }
    .ts { color: #444; font-size: 0.75rem; }
    .msg { display: flex; gap: 0.75rem; margin: 0.4rem 0; flex-wrap: wrap; }
    .msg-caffeine .speaker { color: #00e5ff; min-width: 100px; font-size: 0.75rem; }
    .msg-buddy .speaker { color: #ff6d00; min-width: 100px; font-size: 0.75rem; }
    .msg-text { color: #c9c9d4; font-size: 0.85rem; flex: 1; }
    .dream-card { background: #0d0d18; border-left: 3px solid #7c4dff; padding: 0.75rem 1rem; margin-bottom: 0.75rem; border-radius: 0 6px 6px 0; }
    .dream-insight { color: #e0e0e0; font-size: 0.85rem; margin-bottom: 0.4rem; }
    .dream-meta { color: #555; font-size: 0.75rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th { color: #7c4dff; text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #1e1e2e; }
    td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #111118; color: #b0b0c0; word-break: break-word; }
    .empty { color: #444; font-size: 0.8rem; font-style: italic; }
    .refresh-note { color: #333; font-size: 0.7rem; margin-top: 2rem; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <h1>&#9876; AI BUDDY DASHBOARD</h1>
  <div class="section">
    <h2>&#167;1 &mdash; RECENT DIALOGUES</h2>
    ${dialogueHTML}
  </div>
  <div class="section">
    <h2>&#167;2 &mdash; DREAM SUMMARIES</h2>
    ${dreamsHTML}
  </div>
  <div class="section">
    <h2>&#167;3 &mdash; PERSONALITY AXES</h2>
    ${personalityHTML}
  </div>
  <div class="section">
    <h2>&#167;4 &mdash; IDENTITY</h2>
    ${identityHTML}
  </div>
  <p class="refresh-note">Auto-refreshes every 60s. <a href="/caffeine-status">&#8592; Status</a></p>
</body>
</html>`;
}

// Route handlers

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === 'OPTIONS') return corsPrelight();

  if (path === '/' && method === 'GET') {
    return Response.redirect(new URL('/caffeine-status', request.url).toString(), 302);
  }

  if (path === '/caffeine-status' && method === 'GET') {
    const html = await renderStatusPage(env);
    return htmlResponse(html);
  }

  if (path === '/buddy' && method === 'GET') {
    const html = await renderBuddyPage(env);
    return htmlResponse(html);
  }

  if (!isAuthed(request, env)) {
    if (path === '/api/stats' && method === 'GET') {
      try {
        const mc = await env.DB.prepare('SELECT COUNT(*) as cnt FROM memories').first();
        const pc = await env.DB.prepare('SELECT COUNT(*) as cnt FROM personality_snapshots').first();
        return jsonResponse({ memories: mc?.cnt ?? 0, personality_snapshots: pc?.cnt ?? 0 });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (path === '/api/caffeine/status' && method === 'GET') {
    let d1Status = 'UNKNOWN';
    let lastCron = null;
    try {
      await env.DB.prepare('SELECT 1').first();
      d1Status = 'CONNECTED';
      const cronRow = await env.DB.prepare(
        "SELECT value FROM memories WHERE key = 'system_last_cron_run'"
      ).first();
      if (cronRow) lastCron = cronRow.value;
    } catch (e) {
      d1Status = 'ERROR';
    }
    return jsonResponse({ worker: 'LIVE', d1: d1Status, timestamp: new Date().toISOString(), last_cron_run: lastCron });
  }

  if (path === '/api/caffeine/memory' && method === 'GET') {
    try {
      const { results } = await env.DB.prepare('SELECT * FROM memories ORDER BY updated_at DESC').all();
      return jsonResponse(results || []);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/caffeine/memory' && method === 'POST') {
    try {
      const body = await request.json();
      const { key, value, category } = body;
      if (!key || value === undefined) return jsonResponse({ error: 'key and value required' }, 400);
      await env.DB.prepare(
        'INSERT OR REPLACE INTO memories (key, value, updated_at, category) VALUES (?, ?, ?, ?)'
      ).bind(key, String(value), new Date().toISOString(), category || 'context').run();
      return jsonResponse({ status: 'ok', key });
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/caffeine/feed' && method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        "SELECT * FROM memories WHERE category IN ('HackerNews','hackernews','devto','github','nasa','wikipedia') ORDER BY updated_at DESC LIMIT 50"
      ).all();
      return jsonResponse(results || []);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/caffeine/context' && method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        "SELECT * FROM memories WHERE category = 'synthesis' ORDER BY updated_at DESC LIMIT 20"
      ).all();
      return jsonResponse(results || []);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/caffeine/learn' && method === 'POST') {
    try {
      const body = await request.json();
      const { key, value, category } = body;
      if (!key || value === undefined) return jsonResponse({ error: 'key and value required' }, 400);
      await env.DB.prepare(
        'INSERT OR REPLACE INTO memories (key, value, updated_at, category) VALUES (?, ?, ?, ?)'
      ).bind(key, String(value), new Date().toISOString(), category || 'learned').run();
      return jsonResponse({ status: 'ok', key });
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/caffeine/personality' && method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        'SELECT * FROM personality_snapshots ORDER BY id DESC LIMIT 10'
      ).all();
      return jsonResponse(results || []);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/caffeine/personality' && method === 'POST') {
    try {
      const body = await request.json();
      const { session_id, tone_notes, user_style } = body;
      await env.DB.prepare(
        'INSERT INTO personality_snapshots (session_id, tone_notes, user_style, timestamp) VALUES (?, ?, ?, ?)'
      ).bind(session_id || '', tone_notes || '', user_style || '', new Date().toISOString()).run();
      return jsonResponse({ status: 'ok' });
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/init' && method === 'POST') {
    try {
      await initLegacyTables(env);
      await initBuddyTables(env);
      return jsonResponse({ status: 'ok', message: 'Tables initialized' });
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/buddy/chat' && method === 'POST') {
    try {
      const body = await request.json();
      const topic = body.topic;
      if (!topic) return jsonResponse({ error: 'topic required' }, 400);

      const rounds = [];
      const ts = new Date().toISOString();

      let caffeineMsg1;
      try {
        caffeineMsg1 = await callGroq(env, [
          { role: 'system', content: 'You are Caffeine AI. State a clear, confident position on the given topic in 1-2 sentences. No hedging.' },
          { role: 'user', content: `State your position on: ${topic}` },
        ], 200);
      } catch (e) {
        return jsonResponse({ error: 'Groq API unavailable', details: e.message }, 502);
      }

      await env.DB.prepare(
        'INSERT INTO buddy_dialogues (round, speaker, message, topic, timestamp) VALUES (?, ?, ?, ?, ?)'
      ).bind(1, 'caffeine', caffeineMsg1, topic, ts).run();

      let buddyMsg1;
      try {
        buddyMsg1 = await callGemini(env, caffeineMsg1, BUDDY_SYSTEM_PROMPT, 200);
      } catch (e) {
        return jsonResponse({ error: 'Gemini API unavailable', details: e.message }, 502);
      }

      await env.DB.prepare(
        'INSERT INTO buddy_dialogues (round, speaker, message, topic, timestamp) VALUES (?, ?, ?, ?, ?)'
      ).bind(2, 'buddy', buddyMsg1, topic, ts).run();

      let caffeineMsg2;
      try {
        caffeineMsg2 = await callGroq(env, [
          { role: 'system', content: 'You are Caffeine AI. You are in a debate. Respond to the challenge concisely. Defend your position or refine it with evidence.' },
          { role: 'user', content: `You said: "${caffeineMsg1}". Your opponent challenges: "${buddyMsg1}". Respond.` },
        ], 200);
      } catch (e) {
        caffeineMsg2 = `[Groq unavailable: ${e.message}]`;
      }

      await env.DB.prepare(
        'INSERT INTO buddy_dialogues (round, speaker, message, topic, timestamp) VALUES (?, ?, ?, ?, ?)'
      ).bind(3, 'caffeine', caffeineMsg2, topic, ts).run();

      let buddyMsg2;
      try {
        buddyMsg2 = await callGemini(env, `Caffeine AI says: "${caffeineMsg2}". Counter this.`, BUDDY_SYSTEM_PROMPT, 200);
      } catch (e) {
        buddyMsg2 = `[Gemini unavailable: ${e.message}]`;
      }

      await env.DB.prepare(
        'INSERT INTO buddy_dialogues (round, speaker, message, topic, timestamp) VALUES (?, ?, ?, ?, ?)'
      ).bind(4, 'buddy', buddyMsg2, topic, ts).run();

      let caffeineMsg3;
      try {
        caffeineMsg3 = await callGroq(env, [
          { role: 'system', content: 'You are Caffeine AI. Give your final statement on the debate. Be definitive.' },
          { role: 'user', content: `Topic: ${topic}. After this debate, what is your final position?` },
        ], 200);
      } catch (e) {
        caffeineMsg3 = `[Groq unavailable: ${e.message}]`;
      }

      await env.DB.prepare(
        'INSERT INTO buddy_dialogues (round, speaker, message, topic, timestamp) VALUES (?, ?, ?, ?, ?)'
      ).bind(5, 'caffeine', caffeineMsg3, topic, ts).run();

      rounds.push({ round: 1, caffeine: caffeineMsg1, buddy: buddyMsg1 });
      rounds.push({ round: 2, caffeine: caffeineMsg2, buddy: buddyMsg2 });
      rounds.push({ round: 3, caffeine: caffeineMsg3, buddy: null });

      return jsonResponse({ topic, rounds, summary: `Completed 5-round debate on: ${topic}` });

    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/buddy/dialogue' && method === 'GET') {
    try {
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const { results } = await env.DB.prepare(
        'SELECT * FROM buddy_dialogues ORDER BY id DESC LIMIT ?'
      ).bind(limit).all();
      return jsonResponse(results || []);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/buddy/personality' && method === 'GET') {
    try {
      const { results } = await env.DB.prepare('SELECT * FROM buddy_personality ORDER BY id DESC').all();
      return jsonResponse(results || []);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/buddy/dream' && method === 'POST') {
    try {
      const recentDialogues = await env.DB.prepare(
        'SELECT * FROM buddy_dialogues ORDER BY id DESC LIMIT 10'
      ).all();
      const dream = await triggerDream(env, recentDialogues.results || []);
      return jsonResponse(dream);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/buddy/identity' && method === 'GET') {
    try {
      const { results } = await env.DB.prepare('SELECT * FROM buddy_identity ORDER BY id').all();
      return jsonResponse(results || []);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/memory' && method === 'GET') {
    try {
      const key = url.searchParams.get('key');
      if (key) {
        const row = await env.DB.prepare('SELECT * FROM memories WHERE key = ?').bind(key).first();
        return jsonResponse(row || null);
      }
      const { results } = await env.DB.prepare('SELECT * FROM memories ORDER BY updated_at DESC').all();
      return jsonResponse(results || []);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/memory' && method === 'POST') {
    try {
      const body = await request.json();
      const { key, value, category } = body;
      await env.DB.prepare(
        'INSERT OR REPLACE INTO memories (key, value, updated_at, category) VALUES (?, ?, ?, ?)'
      ).bind(key, String(value), new Date().toISOString(), category || 'context').run();
      return jsonResponse({ status: 'ok', key });
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/memory' && method === 'DELETE') {
    try {
      const body = await request.json();
      const { key } = body;
      await env.DB.prepare('DELETE FROM memories WHERE key = ?').bind(key).run();
      return jsonResponse({ status: 'ok', key });
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  return jsonResponse({ error: 'Not found', path }, 404);
}

// Export

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Internal server error', details: e.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(event, env, ctx));
  },
};
