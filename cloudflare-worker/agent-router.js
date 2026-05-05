/**
 * Agent Loop Router — BrainForge Worker
 * Handles /agent/* endpoints for the browser automation loop.
 * 
 * Required KV namespace binding: BRAINFORGE_KV
 * Required env vars: GITHUB_PAT (Cloudflare Worker secret)
 */

const REPO = 'richardbrownmiami-commits/devforge-ai';
const WORKFLOW_FILE = 'browser-agent.yml';
const MAX_HOPS = 50;
const FIRST_INSTRUCTION = 'Read all memories file you saved them ask your next question';

export async function handleAgentRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // POST /agent/init
  if (path === '/agent/init' && method === 'POST') {
    try {
      await writeGitHubFile(env.GITHUB_PAT, 'browser-agent/instructions.md', FIRST_INSTRUCTION, 'Agent init — set first instruction');
      await env.BRAINFORGE_KV.put('agent_state', JSON.stringify({ running: false, hop: 0, logs: [], lastInstruction: FIRST_INSTRUCTION, lastResponse: '' }));
      return new Response(JSON.stringify({ ok: true, instruction: FIRST_INSTRUCTION }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // POST /agent/run
  if (path === '/agent/run' && method === 'POST') {
    try {
      const stateRaw = await env.BRAINFORGE_KV.get('agent_state');
      const state = stateRaw ? JSON.parse(stateRaw) : { running: false, hop: 0, logs: [], lastInstruction: FIRST_INSTRUCTION, lastResponse: '' };
      state.running = true;
      state.hop = 0;
      state.logs = [{ ts: new Date().toISOString(), msg: 'Loop started' }];
      await env.BRAINFORGE_KV.put('agent_state', JSON.stringify(state));

      // Trigger GitHub Actions workflow
      const triggerRes = await fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW_FILE + '/dispatches', {
        method: 'POST',
        headers: {
          'Authorization': 'token ' + env.GITHUB_PAT,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'BrainForge-Worker/1.0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: 'main', inputs: { hop: '0' } })
      });

      if (!triggerRes.ok) {
        const err = await triggerRes.text();
        return new Response(JSON.stringify({ ok: false, error: 'Workflow trigger failed: ' + err }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ ok: true, message: 'Loop started — hop 0 dispatched' }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // POST /agent/stop
  if (path === '/agent/stop' && method === 'POST') {
    try {
      const stateRaw = await env.BRAINFORGE_KV.get('agent_state');
      const state = stateRaw ? JSON.parse(stateRaw) : {};
      state.running = false;
      if (!state.logs) state.logs = [];
      state.logs.push({ ts: new Date().toISOString(), msg: 'Loop stopped by user' });
      await env.BRAINFORGE_KV.put('agent_state', JSON.stringify(state));
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // GET /agent/status
  if (path === '/agent/status' && method === 'GET') {
    try {
      const stateRaw = await env.BRAINFORGE_KV.get('agent_state');
      const state = stateRaw ? JSON.parse(stateRaw) : { running: false, hop: 0, logs: [], lastInstruction: '', lastResponse: '' };
      return new Response(JSON.stringify(state), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // GET /agent/memory
  if (path === '/agent/memory' && method === 'GET') {
    try {
      const res = await fetch('https://raw.githubusercontent.com/' + REPO + '/main/memory.md');
      const text = await res.text();
      return new Response(JSON.stringify({ content: text }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // GET /agent/instructions
  if (path === '/agent/instructions' && method === 'GET') {
    try {
      const res = await fetch('https://raw.githubusercontent.com/' + REPO + '/main/browser-agent/instructions.md');
      const text = await res.text();
      return new Response(JSON.stringify({ content: text }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // POST /agent/webhook — called after each GitHub Actions run to advance the loop
  if (path === '/agent/webhook' && method === 'POST') {
    try {
      const stateRaw = await env.BRAINFORGE_KV.get('agent_state');
      const state = stateRaw ? JSON.parse(stateRaw) : { running: false, hop: 0, logs: [] };

      if (!state.running) {
        return new Response(JSON.stringify({ ok: true, message: 'Loop stopped — no next hop dispatched' }), { headers: corsHeaders });
      }

      // Read the response from the repo
      const responseRes = await fetch('https://raw.githubusercontent.com/' + REPO + '/main/browser-agent/response.md?t=' + Date.now());
      const responseText = await responseRes.text();

      // Extract the last AI message as next instruction (content after "**Response:**")
      let nextInstruction = FIRST_INSTRUCTION;
      const responseMatch = responseText.match(/\*\*Response:\*\*\n([\s\S]+?)(?:\n#|$)/);
      if (responseMatch) {
        const fullResponse = responseMatch[1].trim();
        // Take last meaningful line as next instruction (or first 500 chars)
        const lines = fullResponse.split('\n').filter(l => l.trim().length > 10);
        nextInstruction = lines[lines.length - 1] || fullResponse.substring(0, 500);
      }

      state.hop = (state.hop || 0) + 1;
      state.lastResponse = responseText.substring(0, 1000);
      state.lastInstruction = nextInstruction;
      if (!state.logs) state.logs = [];
      state.logs.push({ ts: new Date().toISOString(), msg: 'Hop ' + state.hop + ' complete. Next: ' + nextInstruction.substring(0, 100) });
      // Keep only last 100 log entries
      if (state.logs.length > 100) state.logs = state.logs.slice(-100);

      if (state.hop >= MAX_HOPS) {
        state.running = false;
        state.logs.push({ ts: new Date().toISOString(), msg: 'Max hops (' + MAX_HOPS + ') reached. Loop complete.' });
        await env.BRAINFORGE_KV.put('agent_state', JSON.stringify(state));
        return new Response(JSON.stringify({ ok: true, message: 'Max hops reached' }), { headers: corsHeaders });
      }

      // Write next instruction to repo
      await writeGitHubFile(env.GITHUB_PAT, 'browser-agent/instructions.md', nextInstruction, 'Agent hop ' + state.hop + ' — next instruction');

      // Trigger next hop
      const triggerRes = await fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW_FILE + '/dispatches', {
        method: 'POST',
        headers: {
          'Authorization': 'token ' + env.GITHUB_PAT,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'BrainForge-Worker/1.0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: 'main', inputs: { hop: String(state.hop) } })
      });

      state.logs.push({ ts: new Date().toISOString(), msg: 'Hop ' + state.hop + ' dispatched' });
      await env.BRAINFORGE_KV.put('agent_state', JSON.stringify(state));

      return new Response(JSON.stringify({ ok: true, message: 'Hop ' + state.hop + ' dispatched', nextInstruction }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return null; // not an agent route
}

// ── GitHub file write helper ──────────────────────────────────────────────────

async function writeGitHubFile(pat, filePath, content, message) {
  // Get current SHA
  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + filePath, {
    headers: {
      'Authorization': 'token ' + pat,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'BrainForge-Worker/1.0'
    }
  });
  let sha = null;
  if (shaRes.ok) {
    const d = await shaRes.json();
    sha = d.sha;
  }

  const body = { message, content: btoa(unescape(encodeURIComponent(content))) };
  if (sha) body.sha = sha;

  const res = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + filePath, {
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + pat,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'BrainForge-Worker/1.0',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('GitHub write failed for ' + filePath + ': ' + err);
  }
  return res.json();
}
