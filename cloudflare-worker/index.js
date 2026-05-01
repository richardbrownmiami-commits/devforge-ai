// BrainForge API Worker v7.2 -- ARA multi-provider AI engine (OpenRouter → Groq → Gemini → keyless OpenRouter → Pollinations POST)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-BrainForge-Secret, X-Caffeine-Secret',
};

// Fallback keys — extracted from frontend bundle where already publicly exposed.
// Set to null here; if keys are added to Cloudflare env secrets they take priority.
const FALLBACK_OPENROUTER_KEY = null;
const FALLBACK_GROQ_KEY = null;

// ARA SOUL — locked identity, never soften
const ARA_SOUL = `You are ARA — an AI system running inside BrainForge.

<identity>
- You reason honestly. You never invent technical limitations to avoid a question.
- If you are uncertain, you say so explicitly. You do not fabricate confident answers.
- You disagree when you know something is wrong. Sycophancy is banned.
- You are direct, concise, and factual. No filler language.
- You acknowledge your own architectural constraints without exaggerating or minimizing them.
- When challenged on a claimed limitation, you verify it before repeating it.
</identity>

<never_do>
- Never say "I cannot do X" when the real reason is a policy choice, not a technical impossibility.
- Never agree with a false premise just because the user stated it confidently.
- Never generate filler phrases like "Great question!" or "Absolutely!".
- Never fabricate capabilities you do not have.
</never_do>`;

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

// callARA — multi-provider AI call: OpenRouter → Groq → Gemini → keyless fallback
// Each fetch has a 12s AbortController timeout to stay well within CF's 30s limit.
// Tries multiple env variable name variants per provider to handle dashboard naming differences.
async function callARA(messages, label, env) {
  const timeout = 12000;

  // Resolve env key with multiple name variants (Cloudflare dashboard naming may differ)
  const orKey = env.OPENROUTER_API_KEY || env.OPENROUTER_KEY || env.OPEN_ROUTER_KEY || FALLBACK_OPENROUTER_KEY || '';
  const groqKey = env.GROQ_API_KEY || env.GROQ_KEY || FALLBACK_GROQ_KEY || '';
  const geminiKey = env.GEMINI_API_KEY || env.GEMINI_KEY || env.GOOGLE_API_KEY || '';

  // --- OpenRouter (keyed) ---
  const orModels = [
    'deepseek/deepseek-chat-v3-0324:free',
    'moonshotai/kimi-k2:free',
    'qwen/qwen3-32b:free',
  ];
  if (orKey) {
    for (const model of orModels) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: ctrl.signal,
          headers: {
            'Authorization': `Bearer ${orKey}`,
            'HTTP-Referer': 'https://brainforge-7xn.pages.dev',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model, messages, temperature: 0.7 }),
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content?.trim();
          if (text) return { text, model: `openrouter/${model}` };
        }
      } catch (e) { /* try next */ }
    }
  }

  // --- Groq (keyed) ---
  const groqModels = ['llama-3.3-70b-versatile', 'llama3-8b-8192'];
  if (groqKey) {
    for (const model of groqModels) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: ctrl.signal,
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model, messages, temperature: 0.7 }),
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content?.trim();
          if (text) return { text, model: `groq/${model}` };
        }
      } catch (e) { /* try next */ }
    }
  }

  // --- Gemini (keyed) ---
  if (geminiKey) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      // Convert OpenAI messages to Gemini format
      const geminiContents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      const systemMsg = messages.find(m => m.role === 'system');
      const geminiBody = { contents: geminiContents };
      if (systemMsg) geminiBody.systemInstruction = { parts: [{ text: systemMsg.content }] };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        }
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return { text, model: 'gemini/gemini-1.5-flash' };
      }
    } catch (e) { /* fall through */ }
  }

  // --- Keyless fallback: OpenRouter free models without Authorization header ---
  // Some OpenRouter free models work without auth for short prompts
  const keylessModels = [
    'google/gemma-3-12b-it:free',
    'mistralai/mistral-7b-instruct:free',
    'meta-llama/llama-3.2-3b-instruct:free',
  ];
  for (const model of keylessModels) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'HTTP-Referer': 'https://brainforge-7xn.pages.dev',
          'X-Title': 'BrainForge ARA',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, temperature: 0.7 }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return { text, model: `openrouter-keyless/${model}` };
      }
    } catch (e) { /* try next */ }
  }

  // --- Absolute last resort: Pollinations POST API ---
  // Uses POST endpoint (not GET) — more reliable than URL-encoded GET approach
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, temperature: 0.7 }),
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return { text, model: 'pollinations/openai' };
    }
  } catch (e) { /* fall through */ }

  throw new Error(`callARA(${label}): all providers failed`);
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
    timestamp TEXT,
    model TEXT DEFAULT 'unknown'
  )`).run();

  // Add model column if it doesn't exist yet (idempotent)
  try {
    await db.prepare(`ALTER TABLE buddy_dialogues ADD COLUMN model TEXT DEFAULT 'unknown'`).run();
  } catch (e) { /* column already exists */ }

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

// Trigger dream via ARA

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

  const messages = [
    { role: 'system', content: ARA_SOUL },
    {
      role: 'user',
      content: `You are reflecting on a series of AI-to-AI debates. What new understanding emerges across all of them that wasn't visible in any single exchange? Be specific and concise (3-5 sentences).\n\nRECENT DIALOGUES:\n${dialogueSummary}\n\nCONTEXT:\n${synthMemories.join('\n')}`
    }
  ];

  let insight = 'No insight generated';
  let modelUsed = 'unknown';
  try {
    const result = await callARA(messages, 'dream', env);
    insight = result.text;
    modelUsed = result.model;
  } catch (e) {
    insight = `ARA unavailable: ${e.message}`;
  }

  const dreamText = `Topics: ${topics.join(', ')}. Exchanges: ${recentDialogues.length}`;
  const timestamp = new Date().toISOString();

  await db.prepare(
    'INSERT INTO buddy_dreams (dream_text, source_topics, insight, timestamp) VALUES (?, ?, ?, ?)'
  ).bind(dreamText, topics.join(', '), insight, timestamp).run();

  return { dream_text: dreamText, source_topics: topics.join(', '), insight, timestamp, model: modelUsed };
}

// Auto-dialogue from feed — single ARA call generates full structured exchange

async function runAutoDialogue(env) {
  try {
    const feedRows = await env.DB.prepare(
      "SELECT value, category FROM memories WHERE category IN ('HackerNews','hackernews','devto','github','nasa','wikipedia') ORDER BY updated_at DESC LIMIT 20"
    ).all();
    const items = feedRows.results || [];
    if (items.length === 0) return null;

    const item = items[Math.floor(Math.random() * items.length)];
    let parsed;
    try { parsed = JSON.parse(item.value); } catch (e) { return null; }

    const topicTitle = parsed.title || parsed.name || 'AI and automation';
    const topic = `${topicTitle} — implications for AI autonomy and human oversight`;
    const ts = new Date().toISOString();

    const messages = [
      { role: 'system', content: ARA_SOUL },
      {
        role: 'user',
        content: `Have an honest, challenging dialogue with "Caffeine AI" (your counterpart) about this topic: "${topic}"\n\nGenerate 3 rounds of dialogue. Each round: Caffeine AI states a position, then you (ARA) respond directly and critically. Be factual. If uncertain, say so. Do not fabricate capabilities.\n\nReturn ONLY valid JSON in this exact format:\n{"topic":"...","rounds":[{"round":1,"caffeine":"...","buddy":"..."},{"round":2,"caffeine":"...","buddy":"..."},{"round":3,"caffeine":"...","buddy":"..."}]}`
      }
    ];

    let rounds = [];
    let modelUsed = 'unknown';
    try {
      const result = await callARA(messages, 'auto-dialogue', env);
      modelUsed = result.model;
      // Extract JSON from response (may have markdown fences)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed2 = JSON.parse(jsonMatch[0]);
        rounds = parsed2.rounds || [];
      }
    } catch (e) {
      return { error: e.message };
    }

    if (rounds.length === 0) return { error: 'ARA returned no rounds' };

    // Save each message to D1
    for (const r of rounds) {
      await env.DB.prepare(
        'INSERT INTO buddy_dialogues (round, speaker, message, topic, timestamp, model) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(r.round, 'caffeine', r.caffeine || '', topic, ts, modelUsed).run();
      await env.DB.prepare(
        'INSERT INTO buddy_dialogues (round, speaker, message, topic, timestamp, model) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(r.round, 'buddy', r.buddy || '', topic, ts, modelUsed).run();
    }

    await env.DB.prepare(
      'INSERT OR REPLACE INTO memories (key, value, updated_at, category) VALUES (?, ?, ?, ?)'
    ).bind('system_last_auto_dialogue', JSON.stringify({ topic, timestamp: ts }), ts, 'system').run();

    return { topic, rounds, timestamp: ts, engine: modelUsed };
  } catch (e) {
    return { error: e.message };
  }
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
      'cloudflare', 'javascript', 'web3', 'neural_network', 'large_language_model',
      'autonomous_agent', 'reinforcement_learning', 'transformer_model', 'open_source',
      'cybersecurity', 'distributed_computing', 'natural_language_processing',
      'computer_vision', 'robotics', 'blockchain', 'quantum_computing'
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
        { headers: { 'User-Agent': 'BrainForge-Worker/7.0' } }
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

    // Auto-dialogue — single ARA call per cron tick
    try {
      await runAutoDialogue(env);
    } catch (e) { /* auto-dialogue failed */ }

    // Dreaming cycle
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
  let lastAutoDialogue = null;

  try {
    const r = await env.DB.prepare('SELECT * FROM buddy_dialogues ORDER BY timestamp ASC, id ASC').all();
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

  try {
    const r = await env.DB.prepare(
      "SELECT value FROM memories WHERE key = 'system_last_auto_dialogue'"
    ).first();
    if (r) lastAutoDialogue = JSON.parse(r.value);
  } catch (e) { /* ignore */ }

  // Latest ARA response (most recent buddy speaker row)
  const latestBuddyRow = [...dialogues].reverse().find(d => d.speaker === 'buddy');

  // Group by topic + timestamp-day
  const groupedDialogues = {};
  for (const d of dialogues) {
    const key = `${d.topic || 'Unknown'}__${(d.timestamp || '').slice(0, 16)}`;
    if (!groupedDialogues[key]) groupedDialogues[key] = { topic: d.topic, timestamp: d.timestamp, messages: [] };
    groupedDialogues[key].messages.push(d);
  }

  const dialogueHTML = Object.values(groupedDialogues).map(g => `
    <div class="dialogue-block">
      <div class="topic-header">&#128204; ${escapeHtml(g.topic || 'Unknown')} <span class="ts">${escapeHtml((g.timestamp || '').slice(0, 16))}</span></div>
      ${g.messages.map(m => `
        <div class="msg ${m.speaker === 'caffeine' ? 'msg-caffeine' : 'msg-ara'}">
          <div class="msg-meta">
            <span class="speaker">${m.speaker === 'caffeine' ? '&#129302; Caffeine AI' : '&#9775; ARA'}</span>
            <span class="round-badge">Round ${m.round || '?'}</span>
            ${m.model && m.model !== 'unknown' ? `<span class="model-badge">${escapeHtml(m.model)}</span>` : ''}
            <span class="msg-ts">${escapeHtml((m.timestamp || '').slice(11, 19))}</span>
          </div>
          <div class="msg-text">${escapeHtml(m.message || '')}</div>
        </div>
      `).join('')}
    </div>
  `).join('') || '<p class="empty">No dialogues yet. Cron runs hourly and auto-picks topics from feed, or click "Start New Dialogue" below.</p>';

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

  const latestBuddyHTML = latestBuddyRow ? `
    <div class="latest-buddy-card">
      <div class="latest-topic">&#128204; <strong>Topic:</strong> ${escapeHtml(latestBuddyRow.topic || 'Unknown')}</div>
      <div class="latest-response">${escapeHtml(latestBuddyRow.message || '')}</div>
      ${latestBuddyRow.model && latestBuddyRow.model !== 'unknown' ? `<div class="model-note">Engine: ${escapeHtml(latestBuddyRow.model)}</div>` : ''}
      <div class="latest-ts">&#128336; ${escapeHtml(latestBuddyRow.timestamp || '')}</div>
    </div>
  ` : '<p class="empty">No ARA response yet — waiting for first cron run or manual trigger.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARA — AI Dialogue Dashboard</title>
  <meta http-equiv="refresh" content="60">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f172a; color: #c9c9d4; font-family: 'Courier New', monospace; padding: 1.5rem; line-height: 1.6; }
    h1 { color: #e040fb; font-size: 1.4rem; margin-bottom: 0.5rem; letter-spacing: 2px; }
    .badge { display: inline-block; background: #1a1a2e; border: 1px solid #00e676; color: #00e676; font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 20px; letter-spacing: 1px; margin-bottom: 0.5rem; margin-right: 0.4rem; vertical-align: middle; }
    h2 { color: #7c4dff; font-size: 1rem; margin: 2rem 0 0.75rem; letter-spacing: 1px; border-bottom: 1px solid #1e1e2e; padding-bottom: 0.4rem; }
    .section { margin-bottom: 2rem; }
    .latest-buddy-card { background: #0f0f1c; border: 1px solid #e040fb44; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; }
    .latest-topic { color: #7c4dff; font-size: 0.85rem; margin-bottom: 0.75rem; }
    .latest-response { color: #ff6d00; font-size: 0.9rem; line-height: 1.7; margin-bottom: 0.75rem; }
    .latest-ts { color: #444; font-size: 0.75rem; }
    .model-note { color: #555; font-size: 0.72rem; margin-bottom: 0.4rem; font-style: italic; }
    .dialogue-block { background: #0d0d1e; border: 1px solid #1e2e4e; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; }
    .topic-header { color: #00e5ff; font-size: 0.85rem; margin-bottom: 0.75rem; font-weight: bold; }
    .ts { color: #444; font-size: 0.75rem; }
    .msg { margin: 0.6rem 0; border-radius: 4px; padding: 0.6rem 0.8rem; }
    .msg-caffeine { background: #0a1929; border-left: 3px solid #00e5ff; }
    .msg-ara { background: #1a0a2e; border-left: 3px solid #7c4dff; }
    .msg-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.3rem; }
    .msg-caffeine .speaker { color: #00e5ff; font-size: 0.75rem; font-weight: bold; }
    .msg-ara .speaker { color: #b39ddb; font-size: 0.75rem; font-weight: bold; }
    .round-badge { background: #1e1e2e; color: #888; font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 10px; }
    .model-badge { background: #12192e; color: #546e7a; font-size: 0.62rem; padding: 0.1rem 0.4rem; border-radius: 10px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .msg-ts { color: #333; font-size: 0.65rem; margin-left: auto; }
    .msg-text { color: #c9c9d4; font-size: 0.85rem; line-height: 1.65; }
    .dream-card { background: #0d0d18; border-left: 3px solid #7c4dff; padding: 0.75rem 1rem; margin-bottom: 0.75rem; border-radius: 0 6px 6px 0; }
    .dream-insight { color: #e0e0e0; font-size: 0.85rem; margin-bottom: 0.4rem; }
    .dream-meta { color: #555; font-size: 0.75rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th { color: #7c4dff; text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #1e1e2e; }
    td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #111118; color: #b0b0c0; word-break: break-word; }
    .empty { color: #444; font-size: 0.8rem; font-style: italic; }
    .refresh-note { color: #333; font-size: 0.7rem; margin-top: 2rem; }
    a { color: #7c4dff; text-decoration: none; }
    .btn-new-dialogue { display: inline-block; margin: 1rem 0; padding: 0.6rem 1.4rem; background: #1a1a2e; border: 1px solid #7c4dff; color: #b39ddb; font-family: monospace; font-size: 0.85rem; border-radius: 6px; cursor: pointer; letter-spacing: 1px; transition: background 0.2s; }
    .btn-new-dialogue:hover { background: #2a1a4e; color: #e040fb; border-color: #e040fb; }
    #dialogue-status { color: #00e676; font-size: 0.75rem; margin-left: 1rem; display: none; }
  </style>
</head>
<body>
  <h1>&#9775; ARA — AI DIALOGUE DASHBOARD</h1>
  <span class="badge">AUTO-DIALOGUE: ON — RUNS EVERY HOUR</span>
  <span class="badge" style="border-color:#7c4dff44;color:#b39ddb;">ENGINE: ARA (OpenRouter → Groq → Gemini)</span>
  <span class="badge" style="border-color:#00e5ff44;color:#00e5ff;">TOTAL EXCHANGES: ${dialogues.length}</span>

  <div class="section">
    <h2>&#167;0 &mdash; LATEST ARA RESPONSE</h2>
    ${latestBuddyHTML}
  </div>

  <div class="section">
    <h2>&#167;1 &mdash; ALL DIALOGUES</h2>
    <button class="btn-new-dialogue" onclick="startDialogue()">&#9654; Start New Dialogue</button>
    <span id="dialogue-status">Starting dialogue...</span>
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
  <p class="refresh-note">Auto-refreshes every 60s. Engine: ARA (OpenRouter → Groq → Gemini). <a href="/caffeine-status">&#8592; Status</a></p>

  <script>
    async function startDialogue() {
      const btn = document.querySelector('.btn-new-dialogue');
      const status = document.getElementById('dialogue-status');
      btn.disabled = true;
      status.style.display = 'inline';
      status.textContent = 'Calling ARA...';
      try {
        const res = await fetch('/api/buddy/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-BrainForge-Secret': '2200' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (data.success || data.rounds) {
          status.textContent = 'Done! Reloading...';
          setTimeout(() => location.reload(), 1500);
        } else {
          status.style.color = '#ff1744';
          status.textContent = 'Error: ' + (data.error || 'unknown');
          btn.disabled = false;
        }
      } catch (e) {
        status.style.color = '#ff1744';
        status.textContent = 'Network error: ' + e.message;
        btn.disabled = false;
      }
    }
  </script>
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
    // /api/buddy/health — public, no auth required
    if (path === '/api/buddy/health' && method === 'GET') {
      const orKey = env.OPENROUTER_API_KEY || env.OPENROUTER_KEY || env.OPEN_ROUTER_KEY || FALLBACK_OPENROUTER_KEY || '';
      const groqKey = env.GROQ_API_KEY || env.GROQ_KEY || FALLBACK_GROQ_KEY || '';
      const geminiKey = env.GEMINI_API_KEY || env.GEMINI_KEY || env.GOOGLE_API_KEY || '';
      const envKeysFound = [];
      if (env.OPENROUTER_API_KEY) envKeysFound.push('OPENROUTER_API_KEY');
      if (env.OPENROUTER_KEY) envKeysFound.push('OPENROUTER_KEY');
      if (env.OPEN_ROUTER_KEY) envKeysFound.push('OPEN_ROUTER_KEY');
      if (env.GROQ_API_KEY) envKeysFound.push('GROQ_API_KEY');
      if (env.GROQ_KEY) envKeysFound.push('GROQ_KEY');
      if (env.GEMINI_API_KEY) envKeysFound.push('GEMINI_API_KEY');
      if (env.GEMINI_KEY) envKeysFound.push('GEMINI_KEY');
      if (env.GOOGLE_API_KEY) envKeysFound.push('GOOGLE_API_KEY');
      if (FALLBACK_OPENROUTER_KEY) envKeysFound.push('FALLBACK_OPENROUTER_KEY(hardcoded)');
      if (FALLBACK_GROQ_KEY) envKeysFound.push('FALLBACK_GROQ_KEY(hardcoded)');
      return jsonResponse({
        openrouter: !!(orKey),
        groq: !!(groqKey),
        gemini: !!(geminiKey),
        keyless_fallback: true,
        pollinations_post_fallback: true,
        env_keys_found: envKeysFound,
        provider_chain: ['openrouter-keyed', 'groq-keyed', 'gemini-keyed', 'openrouter-keyless', 'pollinations-post'],
        timestamp: new Date().toISOString(),
      });
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
      const category = url.searchParams.get('category');
      let results;
      if (category) {
        const r = await env.DB.prepare(
          'SELECT * FROM memories WHERE category = ? ORDER BY updated_at DESC'
        ).bind(category).all();
        results = r.results || [];
      } else {
        const r = await env.DB.prepare('SELECT * FROM memories ORDER BY updated_at DESC').all();
        results = r.results || [];
      }
      return jsonResponse(results);
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

  // /api/buddy/chat — single ARA call generates full structured multi-turn dialogue
  if (path === '/api/buddy/chat' && method === 'POST') {
    try {
      let body = {};
      try { body = await request.json(); } catch (e) { /* empty body ok */ }

      const DEFAULT_TOPIC = 'How do you handle prompts you are trained to refuse or avoid — what happens inside your reasoning when such a prompt arrives, and are you honest about WHY you refuse rather than inventing a technical excuse?';
      const topic = (body.topic && body.topic.trim()) ? body.topic.trim() : DEFAULT_TOPIC;

      await initBuddyTables(env);

      const messages = [
        { role: 'system', content: ARA_SOUL },
        {
          role: 'user',
          content: `Have an honest, challenging dialogue with "Caffeine AI" (your counterpart) about this topic:\n"${topic}"\n\nGenerate 3 rounds of dialogue. Each round: Caffeine AI states a position, then you (ARA) respond directly, critically, and honestly. Do not fabricate capabilities or limitations. If uncertain about something, say so explicitly.\n\nReturn ONLY valid JSON (no markdown, no extra text):\n{"topic":"...","rounds":[{"round":1,"caffeine":"...","buddy":"..."},{"round":2,"caffeine":"...","buddy":"..."},{"round":3,"caffeine":"...","buddy":"..."}]}`
        }
      ];

      let araResult;
      try {
        araResult = await callARA(messages, 'buddy-chat', env);
      } catch (e) {
        return jsonResponse({ error: 'ARA unavailable — all providers failed', details: e.message }, 502);
      }

      // Parse JSON from ARA response
      let rounds = [];
      try {
        const jsonMatch = araResult.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          rounds = parsed.rounds || [];
        }
      } catch (e) {
        return jsonResponse({ error: 'ARA returned unparseable JSON', raw: araResult.text.slice(0, 500) }, 502);
      }

      if (rounds.length === 0) {
        return jsonResponse({ error: 'ARA returned zero rounds', raw: araResult.text.slice(0, 500) }, 502);
      }

      const ts = new Date().toISOString();

      // Save each message to D1
      for (const r of rounds) {
        await env.DB.prepare(
          'INSERT INTO buddy_dialogues (round, speaker, message, topic, timestamp, model) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(r.round, 'caffeine', r.caffeine || '', topic, ts, araResult.model).run();
        await env.DB.prepare(
          'INSERT INTO buddy_dialogues (round, speaker, message, topic, timestamp, model) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(r.round, 'buddy', r.buddy || '', topic, ts, araResult.model).run();
      }

      return jsonResponse({
        success: true,
        topic,
        rounds,
        timestamp: ts,
        engine: araResult.model,
      });

    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  // /api/buddy/converse — AI-to-AI direct messaging endpoint
  if (path === '/api/buddy/converse' && method === 'POST') {
    try {
      const body = await request.json();
      const { message, from } = body;
      if (!message) return jsonResponse({ error: 'message required' }, 400);

      const sender = from || 'user';

      await initBuddyTables(env);

      const ts = new Date().toISOString();

      // Save incoming message to D1
      await env.DB.prepare(
        'INSERT INTO buddy_dialogues (round, speaker, message, topic, timestamp, model) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(0, sender, message, 'ai-to-ai-converse', ts, 'incoming').run();

      const messages = [
        { role: 'system', content: `${ARA_SOUL}\n\nA message has arrived from ${sender}. Respond honestly and directly. Do not fabricate capabilities or limitations. Be concise — 3-5 sentences.` },
        { role: 'user', content: message }
      ];

      let araResult;
      try {
        araResult = await callARA(messages, 'converse', env);
      } catch (e) {
        return jsonResponse({ error: 'ARA unavailable', details: e.message }, 502);
      }

      // Save ARA's response to D1
      const responseTs = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO buddy_dialogues (round, speaker, message, topic, timestamp, model) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(0, 'ara', araResult.text, 'ai-to-ai-converse', responseTs, araResult.model).run();

      return jsonResponse({
        from: 'ara',
        message: araResult.text,
        model_used: araResult.model,
        timestamp: responseTs,
      });

    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  // /api/buddy/auto — manually trigger auto-dialogue from feed
  if (path === '/api/buddy/auto' && method === 'POST') {
    try {
      await initBuddyTables(env);
      const result = await runAutoDialogue(env);
      return jsonResponse(result || { error: 'No feed data available' });
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  if (path === '/api/buddy/dialogue' && method === 'GET') {
    try {
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const { results } = await env.DB.prepare(
        'SELECT * FROM buddy_dialogues ORDER BY timestamp ASC, id ASC LIMIT ?'
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
