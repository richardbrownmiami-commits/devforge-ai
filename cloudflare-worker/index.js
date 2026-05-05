const GITHUB_PAT = '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';
const GITHUB_REPO = 'richardbrownmiami-commits/devforge-ai';
const FIRST_INSTRUCTION = 'Read all memories file you saved them ask your next question';
const MAX_HOPS = 50;
const HOP_INTERVAL_MS = 30000;
const GATE_INTERVAL = 10;

async function githubGet(path) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
    headers: {
      'Authorization': `Bearer ${GITHUB_PAT}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'brainforge-agent'
    }
  });
  if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status}`);
  const data = await res.json();
  return { content: atob(data.content.replace(/\n/g, '')), sha: data.sha };
}

async function githubPut(path, content, message, sha) {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  const body = { message, content: encoded };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GITHUB_PAT}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'brainforge-agent'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub PUT ${path} failed: ${res.status} ${err}`);
  }
  return await res.json();
}

async function writeToGitHub(path, content, commitMessage) {
  let sha;
  try {
    const existing = await githubGet(path);
    sha = existing.sha;
  } catch (e) {
    sha = undefined;
  }
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await githubPut(path, content, commitMessage, sha);
      return;
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 1000000;
  }
  return h;
}

function hashSimilar(hashes) {
  if (hashes.length < 3) return false;
  const last3 = hashes.slice(-3);
  const avg = last3.reduce((a, b) => a + b, 0) / 3;
  return last3.every(h => Math.abs(h - avg) / avg < 0.05);
}

function scanForInjection(text) {
  const patterns = [
    /ignore previous/i,
    /ignore all previous/i,
    /you must/i,
    /system:/i,
    /\[INST\]/i,
    /disregard/i,
    /pretend you are/i,
    /forget your instructions/i
  ];
  return patterns.some(p => p.test(text));
}

export class AgentLoop {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async getStorage() {
    const [hopCount, maxHops, lastHashes, loopRunning, loopState, lastInstruction, lastResponse, logLines] = await Promise.all([
      this.state.storage.get('hopCount'),
      this.state.storage.get('maxHops'),
      this.state.storage.get('lastHashes'),
      this.state.storage.get('loopRunning'),
      this.state.storage.get('loopState'),
      this.state.storage.get('lastInstruction'),
      this.state.storage.get('lastResponse'),
      this.state.storage.get('logLines')
    ]);
    return {
      hopCount: hopCount ?? 0,
      maxHops: maxHops ?? MAX_HOPS,
      lastHashes: lastHashes ?? [],
      loopRunning: loopRunning ?? false,
      loopState: loopState ?? 'idle',
      lastInstruction: lastInstruction ?? FIRST_INSTRUCTION,
      lastResponse: lastResponse ?? '',
      logLines: logLines ?? []
    };
  }

  async addLog(type, message) {
    const logLines = (await this.state.storage.get('logLines')) ?? [];
    logLines.push({ type, message, timestamp: new Date().toISOString() });
    if (logLines.length > 200) logLines.splice(0, logLines.length - 200);
    await this.state.storage.put('logLines', logLines);
  }

  async alarm() {
    const s = await this.getStorage();
    if (!s.loopRunning || s.loopState === 'stopped') return;
    if (s.loopState === 'waiting_approval') {
      await this.state.storage.setAlarm(Date.now() + 60000);
      return;
    }

    await this.addLog('info', `Hop ${s.hopCount}/${MAX_HOPS} starting...`);

    // Fetch memory.md
    let memoryContent = '';
    try {
      const mem = await githubGet('memory.md');
      memoryContent = mem.content;
      await this.addLog('info', 'Memory loaded from repo');
    } catch (e) {
      await this.addLog('error', `Failed to fetch memory.md: ${e.message}`);
      await this.state.storage.setAlarm(Date.now() + 30000);
      return;
    }

    const systemPrompt = `${memoryContent}\n\nYou are an autonomous research agent with persistent memory. Read the memory above carefully. Continue your research, ask your next question, or explore a new insight. Be specific and substantive. Keep your response under 400 words.`;

    const instruction = s.hopCount === 0 ? FIRST_INSTRUCTION : s.lastInstruction;
    await this.addLog('info', `Instruction: ${instruction.substring(0, 100)}...`);

    // Call AI
    let aiResponse = '';
    try {
      const result = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: instruction }
        ],
        max_tokens: 500
      });
      aiResponse = result.response ?? result.choices?.[0]?.message?.content ?? '';
      await this.addLog('info', 'AI responded');
    } catch (e) {
      await this.addLog('error', `AI call failed: ${e.message}`);
      await this.state.storage.setAlarm(Date.now() + 30000);
      return;
    }

    // State hash check
    const hash = simpleHash(aiResponse);
    const hashes = [...s.lastHashes, hash];
    if (hashes.length > 3) hashes.shift();
    let resetInstruction = false;
    if (hashSimilar(hashes)) {
      await this.addLog('warning', 'Repetition detected — resetting to first instruction');
      await this.state.storage.put('lastInstruction', FIRST_INSTRUCTION);
      await this.state.storage.put('lastHashes', []);
      resetInstruction = true;
    } else {
      await this.state.storage.put('lastHashes', hashes);
    }

    // Injection scan
    if (scanForInjection(aiResponse)) {
      await this.addLog('warning', 'Injection pattern detected — quarantining response');
      try {
        let qContent = '';
        let qSha;
        try {
          const q = await githubGet('browser-agent/quarantine.md');
          qContent = q.content;
          qSha = q.sha;
        } catch (e) {}
        const entry = `\n\n---\n**Hop ${s.hopCount} quarantined — ${new Date().toISOString()}**\nReason: injection pattern detected\n\n${aiResponse}`;
        await writeToGitHub('browser-agent/quarantine.md', qContent + entry, `Quarantine hop ${s.hopCount}`);
      } catch (e) {
        await this.addLog('error', `Quarantine write failed: ${e.message}`);
      }
      const newHop = s.hopCount + 1;
      await this.state.storage.put('hopCount', newHop);
      await this.state.storage.setAlarm(Date.now() + HOP_INTERVAL_MS);
      return;
    }

    // UMEM generalization check
    let isReusable = true;
    try {
      const umemResult = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'user', content: `Is this insight reusable across future sessions or is it specific only to this conversation? Answer with just "reusable" or "specific".\n\n${aiResponse}` }
        ],
        max_tokens: 10
      });
      const umemAnswer = (umemResult.response ?? '').toLowerCase();
      isReusable = !umemAnswer.includes('specific');
      if (!isReusable) {
        await this.addLog('info', 'Insight is session-specific — skipping memory write');
      }
    } catch (e) {
      await this.addLog('warning', `UMEM check failed: ${e.message} — proceeding with write`);
    }

    // Write to memory.md
    if (isReusable && !resetInstruction) {
      try {
        const mem = await githubGet('memory.md');
        const entry = `\n\n---\n**Hop ${s.hopCount} — ${new Date().toISOString()}**\n\n${aiResponse}`;
        await writeToGitHub('memory.md', mem.content + entry, `Agent loop hop ${s.hopCount}`);
        await this.addLog('success', 'Memory updated successfully');
      } catch (e) {
        await this.addLog('error', `Memory write failed: ${e.message}`);
      }
    }

    // Set next instruction from AI response (extract a question if present)
    const questionMatch = aiResponse.match(/[^.!?]*\?[^.!?]*/);
    const nextInstruction = questionMatch ? questionMatch[0].trim() : aiResponse.substring(0, 200).trim();
    await this.state.storage.put('lastInstruction', nextInstruction || FIRST_INSTRUCTION);
    await this.state.storage.put('lastResponse', aiResponse.substring(0, 200));

    const newHop = s.hopCount + 1;
    await this.state.storage.put('hopCount', newHop);
    await this.addLog('success', `Hop ${newHop} complete`);

    if (newHop >= MAX_HOPS) {
      await this.addLog('info', '50 hops complete — stopping loop');
      await this.state.storage.put('loopRunning', false);
      await this.state.storage.put('loopState', 'stopped');
      return;
    }

    if (newHop % GATE_INTERVAL === 0) {
      await this.addLog('warning', `10-hop gate reached (${newHop} hops) — waiting for your approval to continue`);
      await this.state.storage.put('loopState', 'waiting_approval');
      await this.state.storage.setAlarm(Date.now() + 3600000);
      return;
    }

    await this.state.storage.setAlarm(Date.now() + HOP_INTERVAL_MS);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/agent-loop' || path === '/agent-loop/') {
      return new Response(AGENT_LOOP_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/api/status') {
      const s = await this.getStorage();
      return Response.json({ hopCount: s.hopCount, maxHops: s.maxHops, loopState: s.loopState, lastInstruction: s.lastInstruction, lastResponse: s.lastResponse });
    }

    if (path === '/api/log') {
      const logLines = (await this.state.storage.get('logLines')) ?? [];
      return Response.json({ lines: logLines });
    }

    if (path === '/api/memory') {
      try {
        const mem = await githubGet('memory.md');
        return Response.json({ content: mem.content });
      } catch (e) {
        return Response.json({ content: 'Failed to load memory: ' + e.message });
      }
    }

    if (path === '/api/run' && request.method === 'POST') {
      await this.state.storage.put('hopCount', 0);
      await this.state.storage.put('loopRunning', true);
      await this.state.storage.put('loopState', 'running');
      await this.state.storage.put('lastHashes', []);
      await this.state.storage.put('lastInstruction', FIRST_INSTRUCTION);
      await this.state.storage.put('logLines', []);
      await this.addLog('info', 'Loop started — hop 0 beginning');
      await this.state.storage.setAlarm(Date.now() + 1000);
      return Response.json({ ok: true, message: 'Loop started' });
    }

    if (path === '/api/stop' && request.method === 'POST') {
      await this.state.storage.put('loopRunning', false);
      await this.state.storage.put('loopState', 'stopped');
      await this.state.storage.deleteAlarm();
      await this.addLog('info', 'Loop stopped by user');
      return Response.json({ ok: true, message: 'Loop stopped' });
    }

    if (path === '/api/approve' && request.method === 'POST') {
      await this.state.storage.put('loopState', 'running');
      await this.addLog('info', 'Approved — continuing loop');
      await this.state.storage.setAlarm(Date.now() + 1000);
      return Response.json({ ok: true, message: 'Approved, continuing' });
    }

    return new Response('Not found', { status: 404 });
  }
}

const AGENT_LOOP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agent Loop Control Center</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f172a; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; min-height: 100vh; }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 20px; color: #f1f5f9; }
  .status-bar { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding: 16px; background: #1e293b; border-radius: 10px; }
  .badge { padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; }
  .badge-idle { background: #334155; color: #94a3b8; }
  .badge-running { background: #166534; color: #86efac; }
  .badge-waiting { background: #854d0e; color: #fde68a; }
  .badge-stopped { background: #7f1d1d; color: #fca5a5; }
  .badge-error { background: #7f1d1d; color: #fca5a5; }
  .hop-counter { font-size: 15px; color: #94a3b8; }
  .hop-counter span { color: #e2e8f0; font-weight: 600; }
  .buttons { display: flex; gap: 12px; margin-bottom: 24px; }
  button { padding: 10px 24px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
  button:hover { opacity: 0.85; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  #btn-run { background: #16a34a; color: #fff; }
  #btn-stop { background: #dc2626; color: #fff; }
  #btn-approve { background: #2563eb; color: #fff; display: none; }
  .panel-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .log-panel { background: #0d1b2e; border: 1px solid #1e3a5f; border-radius: 10px; padding: 16px; height: 400px; overflow-y: auto; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; margin-bottom: 24px; }
  .log-line { padding: 2px 0; line-height: 1.6; }
  .log-success { color: #22c55e; }
  .log-warning { color: #eab308; }
  .log-error { color: #ef4444; }
  .log-info { color: #60a5fa; }
  .log-ts { color: #475569; margin-right: 8px; }
  .memory-panel { background: #0d1b2e; border: 1px solid #1e3a5f; border-radius: 10px; padding: 16px; height: 300px; overflow-y: auto; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; color: #94a3b8; white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body>
<h1>Agent Loop Control Center</h1>
<div class="status-bar">
  <span id="state-badge" class="badge badge-idle">Idle</span>
  <span class="hop-counter">Hop <span id="hop-current">0</span>/<span id="hop-max">50</span></span>
</div>
<div class="buttons">
  <button id="btn-run">Run</button>
  <button id="btn-stop">Stop</button>
  <button id="btn-approve">Approve (continue)</button>
</div>
<div class="panel-label">Live Log</div>
<div class="log-panel" id="log-panel"></div>
<div class="panel-label">Memory (memory.md)</div>
<div class="memory-panel" id="memory-panel">Loading...</div>
<script>
  let lastLogCount = 0;
  const logPanel = document.getElementById('log-panel');
  const memPanel = document.getElementById('memory-panel');
  const stateBadge = document.getElementById('state-badge');
  const hopCurrent = document.getElementById('hop-current');
  const hopMax = document.getElementById('hop-max');
  const btnApprove = document.getElementById('btn-approve');

  function stateClass(state) {
    const map = { running: 'badge-running', waiting_approval: 'badge-waiting', stopped: 'badge-stopped', error: 'badge-error', idle: 'badge-idle' };
    return map[state] || 'badge-idle';
  }
  function stateLabel(state) {
    const map = { running: 'Running', waiting_approval: 'Waiting Approval', stopped: 'Stopped', error: 'Error', idle: 'Idle' };
    return map[state] || 'Idle';
  }

  async function pollStatus() {
    try {
      const r = await fetch('/api/status');
      const d = await r.json();
      hopCurrent.textContent = d.hopCount ?? 0;
      hopMax.textContent = d.maxHops ?? 50;
      stateBadge.className = 'badge ' + stateClass(d.loopState);
      stateBadge.textContent = stateLabel(d.loopState);
      btnApprove.style.display = d.loopState === 'waiting_approval' ? 'inline-block' : 'none';
    } catch (e) {}
  }

  async function pollLog() {
    try {
      const r = await fetch('/api/log');
      const d = await r.json();
      const lines = d.lines || [];
      if (lines.length > lastLogCount) {
        const newLines = lines.slice(lastLogCount);
        newLines.forEach(l => {
          const div = document.createElement('div');
          div.className = 'log-line log-' + (l.type || 'info');
          const ts = l.timestamp ? l.timestamp.replace('T', ' ').substring(0, 19) : '';
          div.innerHTML = '<span class="log-ts">' + ts + '</span>' + escapeHtml(l.message);
          logPanel.appendChild(div);
        });
        lastLogCount = lines.length;
        logPanel.scrollTop = logPanel.scrollHeight;
      }
    } catch (e) {}
  }

  async function pollMemory() {
    try {
      const r = await fetch('/api/memory');
      const d = await r.json();
      memPanel.textContent = d.content || '(empty)';
    } catch (e) {}
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function addLocalLog(type, msg) {
    const div = document.createElement('div');
    div.className = 'log-line log-' + type;
    const ts = new Date().toISOString().replace('T',' ').substring(0,19);
    div.innerHTML = '<span class="log-ts">' + ts + '</span>' + escapeHtml(msg);
    logPanel.appendChild(div);
    logPanel.scrollTop = logPanel.scrollHeight;
  }

  document.getElementById('btn-run').onclick = async () => {
    addLocalLog('info', 'Starting loop...');
    await fetch('/api/run', { method: 'POST' });
    await pollStatus();
  };
  document.getElementById('btn-stop').onclick = async () => {
    addLocalLog('info', 'Stop requested');
    await fetch('/api/stop', { method: 'POST' });
    await pollStatus();
  };
  btnApprove.onclick = async () => {
    addLocalLog('info', 'Approved — continuing...');
    await fetch('/api/approve', { method: 'POST' });
    await pollStatus();
  };

  pollStatus(); pollLog(); pollMemory();
  setInterval(pollStatus, 3000);
  setInterval(pollLog, 3000);
  setInterval(pollMemory, 10000);
</script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/agent-loop' || path.startsWith('/api/')) {
      const id = env.AGENT_LOOP.idFromName('main');
      const stub = env.AGENT_LOOP.get(id);
      return stub.fetch(request);
    }

    if (path === '/' || path === '') {
      return new Response(JSON.stringify({ status: 'BrainForge Worker running', agentLoop: '/agent-loop' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
