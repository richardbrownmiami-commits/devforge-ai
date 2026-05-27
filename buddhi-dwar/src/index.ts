import { PROVIDERS } from './config';

interface Env {
  KV: KVNamespace;
  ADMIN_PASSWORD: string;
}

interface ChatRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  [key: string]: unknown;
}

interface ProviderStatus {
  healthy: boolean;
  lastCheck: number;
  lastError: string;
  errorCount: number;
  consecutiveFailures: number;
  firstDeadTime: number;
}

interface GatewayKey {
  label: string;
  created: number;
  lastUsed: number;
  active: boolean;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function adminAuth(request: Request, env: Env): Promise<boolean> {
  if (!env.ADMIN_PASSWORD) return true;
  const auth = request.headers.get('Authorization') || '';
  const cookie = request.headers.get('Cookie') || '';
  const token = auth.replace('Bearer ', '') || cookie.replace('session=', '');
  return token === env.ADMIN_PASSWORD;
}

async function gatewayAuth(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const word = auth.slice(7).trim();
  if (!word) return null;
  const data = await env.KV.get(`gateway_key:${word}`, 'json') as GatewayKey | null;
  if (!data || !data.active) return null;
  data.lastUsed = Date.now();
  await env.KV.put(`gateway_key:${word}`, JSON.stringify(data));
  return data.label || word;
}

function adminSession(resp: Response, password: string): Response {
  const r = new Response(resp.body, resp);
  r.headers.append('Set-Cookie', `session=${password}; HttpOnly; Path=/admin; Max-Age=86400`);
  return r;
}

async function updateStatus(env: Env, name: string, healthy: boolean, error: string): Promise<void> {
  const now = Date.now();
  const existing = await env.KV.get(`health:${name}`, 'json') as ProviderStatus | null;
  const status: ProviderStatus = {
    healthy,
    lastCheck: now,
    lastError: error,
    errorCount: (existing?.errorCount || 0) + (healthy ? 0 : 1),
    consecutiveFailures: healthy ? 0 : (existing?.consecutiveFailures || 0) + 1,
    firstDeadTime: healthy ? 0 : (existing?.firstDeadTime || now),
  };
  if (healthy) status.firstDeadTime = 0;
  await env.KV.put(`health:${name}`, JSON.stringify(status));
  if (!healthy) {
    await env.KV.put(`dead:${name}`, JSON.stringify({ firstDeadTime: status.firstDeadTime, lastSeen: now }));
  } else {
    await env.KV.delete(`dead:${name}`);
  }
}

async function checkProvider(env: Env, name: string, key: string, config: { baseUrl: string; type: string; models: string[] }): Promise<void> {
  try {
    const testModel = config.type === 'anthropic' ? config.models[0] : config.models[0] || 'gpt-3.5-turbo';
    let resp: Response;
    if (config.type === 'anthropic') {
      resp = await fetch(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: testModel, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
      });
    } else {
      resp = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: testModel, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
      });
    }
    const healthy = resp.status === 200 || resp.status === 400;
    const err = healthy ? '' : (resp.status === 401 ? 'Bad key' : resp.status === 402 ? 'Quota exhausted' : resp.status === 429 ? 'Rate limited' : resp.status >= 500 ? 'Provider down' : `HTTP ${resp.status}`);
    await updateStatus(env, name, healthy, err);
  } catch (err) {
    await updateStatus(env, name, false, String(err));
  }
}

async function cleanupDead(env: Env): Promise<void> {
  const now = Date.now();
  const fiveDays = 432000000;
  const list = await env.KV.list({ prefix: 'dead:' });
  for (const key of list.keys) {
    const data = await env.KV.get(key.name, 'json') as { firstDeadTime: number } | null;
    if (data && now - data.firstDeadTime > fiveDays) {
      const pname = key.name.replace('dead:', '');
      await env.KV.delete(key.name);
      await env.KV.put(`health:${pname}`, JSON.stringify({ healthy: false, lastCheck: now, lastError: 'Removed after 5 days dead', errorCount: 999, consecutiveFailures: 999, firstDeadTime: data.firstDeadTime }));
    }
  }
}

const MODEL_PREFIX_MAP: [string, string][] = [
  ['gpt-', 'openai'], ['o1-', 'openai'], ['o3-', 'openai'],
  ['claude-', 'anthropic'],
  ['llama-', 'groq'], ['mixtral-', 'groq'], ['gemma-', 'groq'],
  ['deepseek-', 'deepseek'], ['mistral-', 'mistral'],
  ['cerebras-', 'cerebras'], ['together-', 'together'],
  ['gemini-', 'google'], ['command-', 'cohere'],
  ['dbrx-', 'databricks'], ['solar-', 'upstage'],
  ['phi-', 'azure'], ['qwen-', 'alibaba'],
  ['yi-', '01ai'], ['jamba-', 'ai21'],
];

function matchProvider(model: string): string | null {
  for (const [prefix, name] of MODEL_PREFIX_MAP) {
    if (model.startsWith(prefix)) return name;
  }
  for (const name of Object.keys(PROVIDERS)) {
    if (model.toLowerCase().includes(name)) return name;
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname;

    // Admin routes
    if (path === '/' || path.startsWith('/admin')) {
      if (path === '/admin/login') {
        if (request.method === 'POST') {
          const form = await request.formData();
          if (form.get('password') === env.ADMIN_PASSWORD) return adminSession(Response.redirect('/', 302), env.ADMIN_PASSWORD);
          return json({ error: 'Wrong password' }, 401);
        }
        return new Response(LOGIN_HTML, { headers: { ...CORS, 'Content-Type': 'text/html;charset=utf-8' } });
      }
      if (!await adminAuth(request, env)) return new Response(LOGIN_HTML, { headers: { ...CORS, 'Content-Type': 'text/html;charset=utf-8' } });

      if (path === '/admin/keys' || path.startsWith('/admin/keys/')) return handleProviderKeys(request, env, path);
      if (path === '/admin/gateway-keys') return handleGatewayKeys(request, env);
      if (path === '/admin/logs') return handleLogs(request, env);
      if (path === '/admin/stats') return handleStats(env);
      if (path === '/admin/health') {
        if (request.method === 'POST') {
          const body = await request.json() as { provider: string };
          const config = PROVIDERS[body.provider];
          if (!config) return json({ error: 'Unknown' }, 400);
          const key = await env.KV.get(`key:${body.provider}`);
          if (!key && config.type !== 'builtin') return json({ error: 'No key' }, 400);
          await checkProvider(env, body.provider, key || '', config);
          return json(await env.KV.get(`health:${body.provider}`, 'json') || { healthy: false });
        }
      }
      return new Response(ADMIN_HTML, { headers: { ...CORS, 'Content-Type': 'text/html;charset=utf-8' } });
    }

    // Gateway API
    const appKey = await gatewayAuth(request, env);
    if (!appKey) return json({ error: 'Unauthorized — use a valid gateway key' }, 401);

    if (path === '/v1/chat/completions') return handleChat(request, env, appKey);
    if (path === '/v1/models') {
      const models = Object.entries(PROVIDERS).flatMap(([n, c]) => (c.models || []).map(m => ({ id: m, provider: n, object: 'model' })));
      return json({ object: 'list', data: models });
    }
    if (path === '/health') return json({ status: 'ok', app: appKey });
    return json({ error: 'Not found' }, 404);
  },

  async scheduled(_ctrl: ScheduledController, env: Env): Promise<void> {
    for (const [name, config] of Object.entries(PROVIDERS)) {
      if (config.type === 'builtin') { await updateStatus(env, name, true, ''); continue; }
      const key = await env.KV.get(`key:${name}`);
      if (!key) await updateStatus(env, name, false, 'No key');
      else await checkProvider(env, name, key, config);
    }
    await cleanupDead(env);
  },
};

async function handleProviderKeys(request: Request, env: Env, path: string): Promise<Response> {
  const provider = path.replace('/admin/keys/', '');
  if (request.method === 'GET') {
    if (provider) return json({ provider, hasKey: !!(await env.KV.get(`key:${provider}`)) });
    const keys: Record<string, boolean> = {};
    for (const name of Object.keys(PROVIDERS)) keys[name] = !!(await env.KV.get(`key:${name}`));
    return json(keys);
  }
  if (request.method === 'PUT' && provider) {
    const body = await request.json() as { key?: string; clear?: boolean };
    if (body.clear) { await env.KV.delete(`key:${provider}`); return json({ ok: true }); }
    if (!body.key) return json({ error: 'Key required' }, 400);
    await env.KV.put(`key:${provider}`, body.key);
    await updateStatus(env, provider, true, '');
    return json({ ok: true });
  }
  if (request.method === 'DELETE' && provider) {
    await env.KV.delete(`key:${provider}`); await env.KV.delete(`health:${provider}`);
    return json({ ok: true });
  }
  return json({ error: 'Not found' }, 404);
}

async function handleGatewayKeys(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    const list = await env.KV.list({ prefix: 'gateway_key:' });
    const keys: Record<string, GatewayKey> = {};
    for (const k of list.keys) {
      const val = await env.KV.get(k.name, 'json') as GatewayKey;
      if (val) keys[k.name.replace('gateway_key:', '')] = val;
    }
    return json(keys);
  }
  if (request.method === 'POST') {
    const body = await request.json() as { word: string; label: string };
    if (!body.word) return json({ error: 'Word required' }, 400);
    if (!body.word || body.word.length > 50) return json({ error: 'Word must be 1-50 characters' }, 400);
    const existing = await env.KV.get(`gateway_key:${body.word}`, 'json');
    if (existing) return json({ error: 'Key word already exists' }, 409);
    const entry: GatewayKey = { label: body.label || body.word, created: Date.now(), lastUsed: 0, active: true };
    await env.KV.put(`gateway_key:${body.word}`, JSON.stringify(entry));
    return json({ ok: true, word: body.word, ...entry });
  }
  if (request.method === 'DELETE') {
    const body = await request.json() as { word: string };
    if (!body.word) return json({ error: 'Word required' }, 400);
    await env.KV.delete(`gateway_key:${body.word}`);
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
}

async function handleLogs(request: Request, env: Env): Promise<Response> {
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 50, 200);
  const logs: unknown[] = [];
  const list = await env.KV.list({ prefix: 'log:', limit });
  for (const key of list.keys.sort().reverse().slice(0, limit)) {
    const val = await env.KV.get(key.name, 'json');
    if (val) logs.push(val);
  }
  return json(logs);
}

async function handleStats(env: Env): Promise<Response> {
  const count = (await env.KV.get('stats:requests', 'json') as number) || 0;
  const providers: Record<string, unknown> = {};
  for (const name of Object.keys(PROVIDERS)) {
    const status = await env.KV.get(`health:${name}`, 'json');
    const key = await env.KV.get(`key:${name}`);
    providers[name] = { hasKey: PROVIDERS[name].type === 'builtin' || !!key, status: status || { healthy: false, lastCheck: 0, lastError: '' } };
  }
  const gwList = await env.KV.list({ prefix: 'gateway_key:' });
  return json({ totalRequests: count, providers, gatewayKeys: gwList.keys.length });
}

async function handleChat(request: Request, env: Env, appKey: string): Promise<Response> {
  const body: ChatRequest = await request.json();
  const providerName = matchProvider(body.model);
  if (!providerName) return json({ error: `No provider for model: ${body.model}` }, 400);

  const config = PROVIDERS[providerName];
  if (config.type === 'builtin') return handleBuiltin(body, env);

  const apiKey = await env.KV.get(`key:${providerName}`);
  if (!apiKey) return json({ error: `No API key configured for ${providerName}` }, 400);

  const status = await env.KV.get(`health:${providerName}`, 'json') as ProviderStatus | null;
  if (status && !status.healthy && status.firstDeadTime && Date.now() - status.firstDeadTime > 432000000) {
    return json({ error: `${providerName} dead 5+ days` }, 503);
  }

  await env.KV.put('stats:requests', JSON.stringify(((await env.KV.get('stats:requests', 'json')) as number || 0) + 1));
  const logEntry = { model: body.model, provider: providerName, app: appKey, timestamp: Date.now(), status: 'pending' };
  const logKey = `log:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  try {
    const result = config.type === 'anthropic' ? await proxyAnthropic(body, apiKey, config.baseUrl) : await proxyOpenAI(body, apiKey, config.baseUrl);
    await env.KV.put(logKey, JSON.stringify({ ...logEntry, status: 'ok' }));
    return result;
  } catch (err) {
    await env.KV.put(logKey, JSON.stringify({ ...logEntry, status: 'error', error: String(err) }));
    return json({ error: String(err) }, 502);
  } finally {
    const all = await env.KV.list({ prefix: 'log:', limit: 100 });
    if (all.keys.length > 1000) {
      const del = all.keys.sort().slice(0, all.keys.length - 500);
      await Promise.all(del.map(k => env.KV.delete(k.name)));
    }
  }
}

async function proxyOpenAI(body: ChatRequest, apiKey: string, baseUrl: string): Promise<Response> {
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const h = new Headers(resp.headers);
  h.set('Access-Control-Allow-Origin', '*');
  return new Response(resp.body, { status: resp.status, headers: h });
}

async function proxyAnthropic(body: ChatRequest, apiKey: string, baseUrl: string): Promise<Response> {
  const systemMsg = body.messages.find(m => m.role === 'system');
  const userMessages = body.messages.filter(m => m.role !== 'system');
  const ab: Record<string, unknown> = {
    model: body.model, max_tokens: body.max_tokens || 4096,
    messages: userMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  };
  if (body.temperature !== undefined) ab.temperature = body.temperature;
  if (systemMsg) ab.system = systemMsg.content;
  if (body.stream) ab.stream = true;

  const resp = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify(ab),
  });

  if (body.stream && resp.body) {
    const { readable, writable } = new TransformStream();
    transformStream(resp.body, writable);
    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' } });
  }
  const result = await resp.json() as Record<string, unknown>;
  return json({
    id: result.id || 'x', object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: body.model,
    choices: [{ index: 0, message: { role: 'assistant', content: ((result.content as Array<{ text: string }>)?.[0]?.text) || '' }, finish_reason: 'stop' }],
    usage: result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }, resp.status);
}

function transformStream(upstream: ReadableStream, writable: WritableStream): void {
  const decoder = new TextDecoder(), encoder = new TextEncoder();
  const reader = upstream.getReader(), writer = writable.getWriter();
  let buffer = '';
  async function process() {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { await writer.write(encoder.encode('data: [DONE]\n\n')); await writer.close(); break; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
            if (data.type === 'content_block_delta' && (data.delta as Record<string, string>)?.text) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ id: 'x', object: 'chat.completion.chunk', created: Date.now(), model: '', choices: [{ index: 0, delta: { content: (data.delta as Record<string, string>).text }, finish_reason: null }] })}\n\n`));
            }
          } catch {}
        }
      }
    } catch { await writer.close(); }
  }
  process();
}

async function handleBuiltin(body: ChatRequest, env: Env): Promise<Response> {
  const ai = new (env as unknown as Record<string, unknown>).AI as { run: (m: string, i: Record<string, unknown>) => Promise<ReadableStream | Record<string, unknown>> };
  const model = body.model || '@cf/meta/llama-3.1-8b-instruct';
  if (body.stream) {
    const stream = await ai.run(model, { messages: body.messages, stream: true });
    return new Response(stream as ReadableStream, { headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' } });
  }
  const result = await ai.run(model, { messages: body.messages }) as Record<string, unknown>;
  return json({
    id: 'builtin-' + Date.now(), object: 'chat.completion', created: Math.floor(Date.now() / 1000), model,
    choices: [{ index: 0, message: { role: 'assistant', content: result.response || '' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Buddhi-Dwar</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#e0e0e0;min-height:100vh}
header{background:#12121a;border-bottom:1px solid #2a2a3a;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
header h1{font-size:20px;color:#7c3aed}
header h1 span{color:#e0e0e0;font-weight:400}
nav{display:flex;gap:4px;background:#12121a;border-bottom:1px solid #2a2a3a;padding:0 24px;overflow-x:auto}
nav button{background:none;border:none;color:#888;padding:12px 20px;cursor:pointer;font-size:14px;border-bottom:2px solid transparent;white-space:nowrap}
nav button.active{color:#7c3aed;border-bottom-color:#7c3aed}
nav button:hover{color:#e0e0e0}
main{padding:24px;max-width:1200px;margin:0 auto}
.s{display:none}.s.active{display:block}
.card{background:#16161f;border:1px solid #2a2a3a;border-radius:8px;padding:20px;margin-bottom:16px}
.card h2{font-size:16px;margin-bottom:12px;color:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.pc{background:#1e1e2a;border:1px solid #2a2a3a;border-radius:8px;padding:16px}
.pc .nm{font-weight:600;font-size:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
.st{font-size:12px;padding:2px 8px;border-radius:4px}
.sok{background:#065f46;color:#6ee7b7}
.sdead{background:#7f1d1d;color:#fca5a5}
.sunk{background:#1e3a5f;color:#93c5fd}
.pc input{width:100%;padding:8px;background:#0a0a0f;border:1px solid #2a2a3a;border-radius:4px;color:#e0e0e0;font-size:13px;margin-top:8px}
.pc input:focus{outline:none;border-color:#7c3aed}
.pc .ac{display:flex;gap:8px;margin-top:8px}
.pc button{padding:6px 12px;border:none;border-radius:4px;cursor:pointer;font-size:12px}
.bs{background:#7c3aed;color:#fff}.bt{background:#1e3a5f;color:#93c5fd}.br{background:#7f1d1d;color:#fca5a5}
.sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px}
.sc{background:#1e1e2a;border:1px solid #2a2a3a;border-radius:8px;padding:16px;text-align:center}
.sc .v{font-size:28px;font-weight:700;color:#7c3aed}
.sc .l{font-size:12px;color:#888;margin-top:4px}
#loginO{position:fixed;top:0;left:0;right:0;bottom:0;background:#0a0a0f;display:flex;align-items:center;justify-content:center;z-index:999}
#loginB{background:#16161f;border:1px solid #2a2a3a;border-radius:12px;padding:40px;width:360px;text-align:center}
#loginB h2{color:#7c3aed;margin-bottom:8px}
#loginB p{color:#888;font-size:14px;margin-bottom:24px}
#loginB input{width:100%;padding:12px;background:#0a0a0f;border:1px solid #2a2a3a;border-radius:6px;color:#e0e0e0;font-size:16px;margin-bottom:16px}
#loginB input:focus{border-color:#7c3aed;outline:none}
#loginB button{width:100%;padding:12px;background:#7c3aed;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer}
#lErr{color:#fca5a5;display:none;margin-top:8px;font-size:13px}
.gk-box{background:#0a0a0f;border:1px solid #2a2a3a;border-radius:6px;padding:12px;font-family:monospace;font-size:14px;margin-top:8px;word-break:break-all}
pre{background:#0a0a0f;padding:12px;border-radius:6px;font-size:13px;overflow-x:auto;margin-top:8px;color:#93c5fd}
.gw-row{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#1e1e2a;border:1px solid #2a2a3a;border-radius:6px;margin-bottom:8px}
.gw-row .gww{font-family:monospace;font-size:14px;color:#7c3aed;font-weight:600}
.gw-row .gwl{font-size:13px;color:#888}
.gw-row .gwt{font-size:11px;color:#555}
.inline-input{display:flex;gap:8px;margin-bottom:12px}
.inline-input input{flex:1;padding:8px;background:#0a0a0f;border:1px solid #2a2a3a;border-radius:4px;color:#e0e0e0;font-size:13px}
.msg{font-size:13px;padding:8px 12px;border-radius:4px;margin-top:8px;display:none}
.msg-ok{background:#065f46;color:#6ee7b7;display:block}
.msg-err{background:#7f1d1d;color:#fca5a5;display:block}
</style></head>
<body>
<div id="loginO"><div id="loginB"><h2>Buddhi-Dwar</h2><p>Admin Login</p><input type="password" id="ap" placeholder="Password" onkeydown="if(event.key==='Enter')login()"><button onclick="login()">Login</button><div id="lErr">Wrong password</div></div></div>
<header><h1>Buddhi-<span>Dwar</span></h1><span style="font-size:13px;color:#888" id="hs"></span></header>
<nav><button class="active" onclick="showTab('ov')">Overview</button><button onclick="showTab('prov')">Providers</button><button onclick="showTab('keys')">चाबियां</button><button onclick="showTab('logs')">Logs</button><button onclick="showTab('set')">Setup</button></nav>
<main>
<div id="s-ov" class="s active">
<div class="sg"><div class="sc"><div class="v" id="sr">-</div><div class="l">Requests</div></div><div class="sc"><div class="v" id="sk">-</div><div class="l">Provider Keys</div></div><div class="sc"><div class="v" id="sgk">-</div><div class="l">App Keys</div></div><div class="sc"><div class="v" id="sh">-</div><div class="l">Healthy</div></div></div>
<div class="card"><h2>Provider Status</h2><div id="ovd">Loading...</div></div></div>
<div id="s-prov" class="s"><div class="grid" id="pg"><div class="card" style="text-align:center;color:#888">Loading...</div></div></div>
<div id="s-keys" class="s">
<div class="card"><h2>App Key (चाबी) बनाएं</h2><p style="font-size:13px;color:#888;margin-bottom:12px">हर ऐप के लिए एक डायलॉग — "कोई दिल माँगे मोर, कोई आज खुशी की रात" — आप तय करो!</p>
<div class="inline-input"><input id="gwWord" placeholder="डायलॉग (e.g. yeh dil maange more, poore paisa vasool)"><input id="gwLabel" placeholder="किसके लिए? (e.g. Website, Blog, APK)"><button class="bs" onclick="createGWKey()">बनाएं</button></div>
<div id="gwMsg"></div></div>
<div class="card"><h2>आपकी चाबियां</h2><div id="gwList">Loading...</div></div></div>
<div id="s-logs" class="s"><div class="card"><h2>Recent Requests</h2><div id="lc">Loading...</div></div></div>
<div id="s-set" class="s">
<div class="card"><h2>How Apps Connect</h2>
<pre>
from openai import OpenAI
client = OpenAI(
    base_url="<span id="bu">https://buddhi-dwar.workers.dev</span>",
    api_key="<span id="gkShow">your-app-key-word</span>"
)
r = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role":"user","content":"hi"}]
)</pre></div>
<div class="card"><h2>Supported Providers</h2><div id="provList" style="font-size:13px;color:#888">Loading...</div></div></div>
</main>
<script>
let tok=document.cookie.replace(/(?:^|.*;\\s*)session\\s*=\\s*([^;]*).*$/,'$1')
if(tok)document.getElementById('loginO').style.display='none'
async function login(){const p=document.getElementById('ap').value;const f=new FormData();f.append('password',p);const r=await fetch('/admin/login',{method:'POST',body:f});if(r.ok){document.getElementById('loginO').style.display='none';tok=p;loadAll()}else document.getElementById('lErr').style.display='block'}
function showTab(n){document.querySelectorAll('.s').forEach(s=>s.classList.remove('active'));document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));document.getElementById('s-'+n).classList.add('active');document.querySelectorAll('nav button')[{ov:0,prov:1,keys:2,logs:3,set:4}[n]].classList.add('active');if(n==='prov')loadProv();if(n==='keys')loadGW();if(n==='logs')loadLogs();if(n==='ov')loadStats()}
async function api(path,opts={}){opts.headers={...opts.headers,Authorization:'Bearer '+tok};const r=await fetch(path,opts);if(r.status===401){document.getElementById('loginO').style.display='flex';return null}return r.json()}
async function loadAll(){loadStats();loadProv();loadGW();loadLogs();document.getElementById('bu').textContent=window.location.origin;loadProvList()}
async function loadProvList(){const d=await api('/admin/stats');if(!d)return;let h='';for(const n of Object.keys(d.providers||{}))h+=n+', ';document.getElementById('provList').textContent=h.replace(/,\s*$/,'')}
async function loadStats(){const d=await api('/admin/stats');if(!d)return;document.getElementById('sr').textContent=d.totalRequests||0;const ks=Object.values(d.providers||{}).filter(p=>p.hasKey).length;document.getElementById('sk').textContent=ks;document.getElementById('sgk').textContent=d.gatewayKeys||0;const hh=Object.values(d.providers||{}).filter(p=>p.status?.healthy).length;document.getElementById('sh').textContent=hh;document.getElementById('hs').textContent=ks+' provider keys | '+hh+' healthy';let h='';for(const[n,p]of Object.entries(d.providers||{})){const s=p.status;const c=s?.healthy?'sok':'sdead';const t=s?.healthy?'OK':(s?.lastError||'No key');h+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1a1a2a;font-size:13px"><span>'+n+'</span><span><span class="st '+c+'">'+t+'</span></span></div>'}document.getElementById('ovd').innerHTML=h}
async function loadProv(){const d=await api('/admin/stats');if(!d)return;let h='';for(const[n,p]of Object.entries(d.providers||{})){const s=p.status||{healthy:false,lastError:''};const c=s.healthy?'sok':(s.lastCheck?'sdead':'sunk');const t=s.healthy?'Healthy':(s.lastError||'Unknown');h+='<div class="pc"><div class="nm"><span>'+n+'</span><span class="st '+c+'">'+t+'</span></div><input type="password" id="k-'+n+'" placeholder="Paste API key"'+(p.hasKey?' value="••••••••"':'')+'><div class="ac"><button class="bs" onclick="savePK(\''+n+'\')">Save</button><button class="bt" onclick="testPK(\''+n+'\')">Test</button>'+(p.hasKey?'<button class="br" onclick="rmPK(\''+n+'\')">Remove</button>':'')+'</div></div>'}document.getElementById('pg').innerHTML=h}
async function loadGW(){const d=await api('/admin/gateway-keys');if(!d||d.error){document.getElementById('gwList').innerHTML='<div style="color:#888;font-size:13px">No app keys yet</div>';return}const e=Object.entries(d);if(!e.length){document.getElementById('gwList').innerHTML='<div style="color:#888;font-size:13px">No app keys yet. Create one above.</div>';return}let h='';for(const[w,v]of e){const last=v.lastUsed?new Date(v.lastUsed).toLocaleString():'Never';h+='<div class="gw-row"><div><div class="gww">'+w+'</div><div class="gwl">'+v.label+'</div><div class="gwt">Created: '+new Date(v.created).toLocaleString()+' | Last used: '+last+'</div></div><button class="br" onclick="rmGW(\''+w+'\')">Revoke</button></div>'}document.getElementById('gwList').innerHTML=h}
async function loadLogs(){const d=await api('/admin/logs?limit=50');if(!d)return;if(!d.length){document.getElementById('lc').innerHTML='<div style="color:#888;font-size:13px">No logs yet</div>';return}let h='<table style="width:100%;font-size:13px;border-collapse:collapse"><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #2a2a3a;color:#888">Time</th><th style="text-align:left;padding:8px;border-bottom:1px solid #2a2a3a;color:#888">App</th><th style="text-align:left;padding:8px;border-bottom:1px solid #2a2a3a;color:#888">Model</th><th style="text-align:left;padding:8px;border-bottom:1px solid #2a2a3a;color:#888">Status</th></tr>';for(const l of d){h+='<tr><td style="padding:8px;border-bottom:1px solid #1a1a2a">'+new Date(l.timestamp).toLocaleString()+'</td><td style="padding:8px;border-bottom:1px solid #1a1a2a">'+(l.app||'-')+'</td><td style="padding:8px;border-bottom:1px solid #1a1a2a">'+l.model+'</td><td style="padding:8px;border-bottom:1px solid #1a1a2a;color:'+(l.status==='ok'?'#6ee7b7':'#fca5a5')+'">'+l.status+(l.error?' ('+l.error+')':'')+'</td></tr>'}h+='</table>';document.getElementById('lc').innerHTML=h}
async function savePK(n){const v=document.getElementById('k-'+n).value;if(!v||v==='••••••••')return;const r=await api('/admin/keys/'+n,{method:'PUT',body:JSON.stringify({key:v})});if(r?.ok){document.getElementById('k-'+n).value='••••••••';loadStats();loadProv()}}
async function rmPK(n){if(!confirm('Remove key for '+n+'?'))return;const r=await api('/admin/keys/'+n,{method:'DELETE'});if(r?.ok){document.getElementById('k-'+n).value='';loadStats();loadProv()}}
async function testPK(n){await api('/admin/health',{method:'POST',body:JSON.stringify({provider:n})});loadProv();loadStats()}
async function createGWKey(){const w=document.getElementById('gwWord').value.trim();const l=document.getElementById('gwLabel').value.trim();if(!w){document.getElementById('gwMsg').innerHTML='<div class="msg msg-err">Enter a word</div>';return}const r=await api('/admin/gateway-keys',{method:'POST',body:JSON.stringify({word:w,label:l||w})});if(r?.ok){document.getElementById('gwMsg').innerHTML='<div class="msg msg-ok">Key "'+w+'" created! Give this word to your app.</div>';document.getElementById('gwWord').value='';document.getElementById('gwLabel').value='';loadGW();loadStats()}else{document.getElementById('gwMsg').innerHTML='<div class="msg msg-err">'+(r?.error||'Error')+'</div>'}}
async function rmGW(w){if(!confirm('Revoke key "'+w+'"?'))return;const r=await api('/admin/gateway-keys',{method:'DELETE',body:JSON.stringify({word:w})});if(r?.ok){loadGW();loadStats()}}
if(tok)loadAll()
</script></body></html>`;

const LOGIN_HTML = `function redirectLogin(){var p=document.getElementById('lp').value;fetch('/admin/login',{method:'POST',body:new URLSearchParams({password:p})}).then(function(r){if(r.ok)window.location='/';else alert('Wrong password')})} `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Buddhi-Dwar</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0a0a0f;color:#e0e0e0;display:flex;align-items:center;justify-content:center;min-height:100vh}#lb{background:#16161f;border:1px solid #2a2a3a;border-radius:12px;padding:40px;width:360px;text-align:center}#lb h2{color:#7c3aed;margin-bottom:8px}#lb p{color:#888;font-size:14px;margin-bottom:24px}#lb input{width:100%;padding:12px;background:#0a0a0f;border:1px solid #2a2a3a;border-radius:6px;color:#e0e0e0;font-size:16px;margin-bottom:16px;outline:none}#lb input:focus{border-color:#7c3aed}#lb button{width:100%;padding:12px;background:#7c3aed;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer}</style></head><body><div id="lb"><h2>Buddhi-Dwar</h2><p>बुद्धि-द्वार — Admin Login</p><input type="password" id="lp" placeholder="Password" onkeydown="if(event.keyCode===13)redirectLogin()"><button onclick="redirectLogin()">Login</button><script>function redirectLogin(){var p=document.getElementById("lp").value;fetch("/admin/login",{method:"POST",body:new URLSearchParams({password:p})}).then(function(r){if(r.ok)window.location="/";else alert("Wrong password")})}</script></div></body></html>`;
