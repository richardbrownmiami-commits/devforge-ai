const ADMIN_PASSWORD = "2200";const MASTER_KEY = "bf-master-kun-2026";const DAY_MS = 86400000;const EVICT_DAYS = 5;

interface KeyEntry { id: string; apiKey: string; label: string; addedAt: number; }
interface HealthEntry { status: "active" | "warming" | "dead" | "expired"; lastCheck: number; consecutiveFailDays: number; lastError: string; lastUsed: number; successCount: number; failCount: number; }
interface GatewayKey { word: string; provider: string; model: string; label: string; createdAt: number; enabled: boolean; usage: number; interface EvictionLog { id: string; provider: string; keyId: string; reason: string; evictedAt: number; }

async function getKeys(provider: string): Promise<KeyEntry[]> {
  const raw = await BF.get("prov:" + provider + ":keys", "json");
  return (raw as any) || [];
}
async function setKeys(provider: string, keys: KeyEntry[]) {
  await BF.put("prov:" + provider + ":keys", JSON.stringify(keys));
}
async function getHealth(provider: string, keyId: string): Promise<HealthEntry> {
  const raw = await BF.get("prov:" + provider + ":health:" + keyId, "json");
  return (raw as any) || { status:"warming", lastCheck:0, consecutiveFailDays:0, lastError:"", lastUsed:0, successCount:0, failCount:0 };
}
async function setHealth(provider: string, keyId: string, h: HealthEntry) {
  await BF.put("prov:" + provider + ":health:" + keyId, JSON.stringify(h));
}
async function getRotation(provider: string): Promise<number> {
  const raw = await BF.get("prov:" + provider + ":rotation");
  return raw ? parseInt(raw) : 0;
}
async function setRotation(provider: string, idx: number) {
  await BF.put("prov:" + provider + ":rotation", idx.toString());
}
async function getGwKey(word: string): Promise<GatewayKey | null> {
  const raw = await BF.get("gw:" + word, "json");
  return (raw as any) || null;
}
async function setGwKey(word: string, gk: GatewayKey) {
  await BF.put("gw:" + word, JSON.stringify(gk));
}
async function getAllGwKeys(): Promise<GatewayKey[]> {
  const list = await BF.list({ prefix: "gw:" });
  const out: GatewayKey[] = [];
  for (const k of list.keys) {
    const v = await BF.get(k.name, "json");
    if (v) out.push(v as any);
  }
  return out;
}
async function incrStat(date: string) {
  const k = "stat:req:" + date;
  const v = await BF.get(k);
  await BF.put(k, v ? (parseInt(v) + 1).toString() : "1");
}
function getToday() { return new Date().toISOString().slice(0,10); }
async function getStat(date: string): Promise<number> {
  const v = await BF.get("stat:req:" + date);
  return v ? parseInt(v) : 0;
}
async function logError(provider: string, keyId: string, error: string, message: string) {
  await BF.put("log:err:" + Date.now(), JSON.stringify({ provider, keyId, error, message, ts: Date.now() }));
}
async function logEviction(provider: string, keyId: string, reason: string) {
  await BF.put("log:evict:" + Date.now(), JSON.stringify({ provider, keyId, reason, evictedAt: Date.now() }));
}
async function getRecentLogs(): Promise<any[]> {
  const list = await BF.list({ prefix: "log:", limit: 100 });
  const out: any[] = [];
  for (const k of list.keys) {
    const v = await BF.get(k.name, "json");
    if (v) out.push(v as any);
  }
  return out.sort((a:any,b:any) => (b.ts||b.evictedAt||0)-(a.ts||a.evictedAt||0));
}
function checkAdmin(req: Request): boolean {
  const c = req.headers.get("Cookie")||"";
  return c.includes("bfadmin="+ADMIN_PASSWORD);
}
function getBearer(req: Request): string|null {
  const m = (req.headers.get("Authorization")||"").match(/^Bearer\s+(.+)$/i);
  return m?m[1]:null;
}async function handleProxy(req: Request): Promise<Response> {try{const key = getBearer(req);if(!key)return new Response(JSON.stringify({error:"missing auth"}),{status:401,headers:{"content-type":"application/json"}});if(key!==MASTER_KEY){const gw=await getGwKey(key);if(!gw||!gw.enabled)return new Response(JSON.stringify({error:"invalid gateway key"}),{status:403,headers:{"content-type":"application/json"}});}const body=await req.json() as any;const model=body.model||"";const{PROVIDERS}=await import("config.ts");const p=PROVIDERS.find((pr:any)=>pr.models.some((m:string)=>model.toLowerCase().includes(m.toLowerCase())||m.toLowerCase().includes(model.toLowerCase().split("/").pop()||"")));if(!p)return new Response(JSON.stringify({error:"unsupported model: "+model}),{status:400,headers:{"content-type":"application/json"}});const keys=await getKeys(p.name);if(!keys.length)return new Response(JSON.stringify({error:"no keys configured for "+p.name}),{status:502,headers:{"content-type":"application/json"}});let idx=await getRotation(p.name);let lastErr=null;for(let i=0;i<keys.length;i++){const ki=(idx+i)%keys.length;const ke=keys[ki];const h=await getHealth(p.name,ke.id);if(h.status==="dead"||h.status==="expired")continue;try{const targetUrl=p.baseUrl+(p.type==="openai"?"/chat/completions":"");const hdrs:any={"Content-Type":"application/json"};if(p.type==="openai"){hdrs["Authorization"]="Bearer "+ke.apiKey;}const resp=await fetch(targetUrl,{method:"POST",headers:hdrs,body:JSON.stringify(body)});if(resp.ok){await setRotation(p.name,(ki+1)%keys.length);h.status="active";h.successCount++;h.lastUsed=Date.now();h.lastCheck=Date.now();await setHealth(p.name,ke.id,h);await incrStat(getToday());return resp;}const txt=await resp.text();if(resp.status===429||resp.status===401||resp.status===403){h.failCount++;h.lastError=resp.status+": "+txt.slice(0,200);h.lastCheck=Date.now();if(resp.status===401||resp.status===403)h.consecutiveFailDays++;await setHealth(p.name,ke.id,h);await logError(p.name,ke.id,"auth",resp.status+": "+txt.slice(0,200));lastErr=resp;continue}lastErr=resp;continue}catch(e:any){h.failCount++;h.lastError=e.message;h.lastCheck=Date.now();await setHealth(p.name,ke.id,h);await logError(p.name,ke.id,"network",e.message);lastErr=e;continue}}const msg=lastErr instanceof Response?"upstream error: "+lastErr.status:"all keys failed: "+lastErr;return new Response(JSON.stringify({error:msg}),{status:502,headers:{"content-type":"application/json"}})}catch(e:any){return new Response(JSON.stringify({error:"gateway error: "+e.message}),{status:500,headers:{"content-type":"application/json"}})}}async function handleModels(): Promise<Response> {const{PROVIDERS}=await import("config.ts");const all:any[]=[];for(const p of PROVIDERS){all.push(...p.models.map((m:string)=>({id:m,provider:p.name,object:"model",created:Date.now(),owned_by:"bifrost"})));}return new Response(JSON.stringify({object:"list",data:all}),{headers:{"content-type":"application/json","access-control-allow-origin":"*"}});}

async function handleAdminApi(req: Request, path: string): Promise<Response> {if(!checkAdmin(req))return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers:{"content-type":"application/json"}});const url=new URL(req.url);const{PROVIDERS}=await import("config.ts");

if(path==="/admin/api/providers"){if(req.method==="GET")return new Response(JSON.stringify(PROVIDERS),{headers:{"content-type":"application/json"}});}

if(path==="/admin/api/keys"){if(req.method==="GET"){const result:any={};for(const p of PROVIDERS){result[p.name]=await getKeys(p.name);}return new Response(JSON.stringify(result),{headers:{"content-type":"application/json"}});}if(req.method==="POST"){const body=await req.json() as any;const{pname,apiKey,label}=body;if(!pname||!apiKey)return new Response(JSON.stringify({error:"provider and apiKey required"}),{status:400,headers:{"content-type":"application/json"}});const keys=await getKeys(pname);const id=Date.now().toString(36);keys.push({id,apiKey,label:label||"key-"+keys.length,addedAt:Date.now()});await setKeys(pname,keys);return new Response(JSON.stringify({ok:true,id}),{headers:{"content-type":"application/json"}});}if(req.method==="DELETE"){const body=await req.json() as any;const{pname,id}=body;if(!pname||!id)return new Response(JSON.stringify({error:"provider and id required"}),{status:400,headers:{"content-type":"application/json"}});let keys=await getKeys(pname);keys=keys.filter((k:any)=>k.id!==id);await setKeys(pname,keys);await logEviction(pname,id,"manual_remove");return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json"}});}}

if(path==="/admin/api/gateway-keys"){if(req.method==="GET"){const gws=await getAllGwKeys();return new Response(JSON.stringify(gws),{headers:{"content-type":"application/json"}});}if(req.method==="POST"){const body=await req.json() as any;if(!body.word||!body.provider)return new Response(JSON.stringify({error:"word and provider required"}),{status:400,headers:{"content-type":"application/json"}});const gw:GatewayKey={word:body.word,provider:body.provider,model:body.model||"",label:body.label||body.word,createdAt:Date.now(),enabled:true,usage:0};await setGwKey(body.word,gw);return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json"}});}if(req.method==="DELETE"){const body=await req.json() as any;if(!body.word)return new Response(JSON.stringify({error:"word required"}),{status:400,headers:{"content-type":"application/json"}});await BF.delete("gw:"+body.word);return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json"}});}if(req.method==="PATCH"){const body=await req.json() as any;if(!body.word)return new Response(JSON.stringify({error:"word required"}),{status:400,headers:{"content-type":"application/json"}});const gw=await getGwKey(body.word);if(!gw)return new Response(JSON.stringify({error:"not found"}),{status:404,headers:{"content-type":"application/json"}});if(body.enabled!==undefined)gw.enabled=body.enabled;if(body.model)gw.model=body.model;if(body.label)gw.label=body.label;await setGwKey(body.word,gw);return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json"}});}}

if(path==="/admin/api/stats"){const today=getToday();const reqsToday=await getStat(today);let totalKeys=0;let activeKeys=0;let deadKeys=0;let warmingKeys=0;let expiredKeys=0;for(const p of PROVIDERS){const keys=await getKeys(p.name);totalKeys+=keys.length;for(const k of keys){const h=await getHealth(p.name,k.id);if(h.status==="active")activeKeys++;else if(h.status==="dead")deadKeys++;else if(h.status==="expired")expiredKeys++;else warmingKeys++;}}return new Response(JSON.stringify({requestsToday:reqsToday,totalKeys,activeKeys,deadKeys,warmingKeys,expiredKeys}),{headers:{"content-type":"application/json"}});}

if(path==="/admin/api/logs"){const logs=await getRecentLogs();return new Response(JSON.stringify(logs),{headers:{"content-type":"application/json"}});}

if(path==="/admin/api/test-key"){const body=await req.json() as any;const{pname,id}=body;if(!pname||!id)return new Response(JSON.stringify({error:"provider and id required"}),{status:400,headers:{"content-type":"application/json"}});const keys=await getKeys(pname);const ke=keys.find((k:any)=>k.id===id);if(!ke)return new Response(JSON.stringify({error:"key not found"}),{status:404,headers:{"content-type":"application/json"}});const p=PROVIDERS.find((pr:any)=>pr.name===pname);if(!p)return new Response(JSON.stringify({error:"provider not found"}),{status:404,headers:{"content-type":"application/json"}});try{const hdrs:any={"Content-Type":"application/json"};if(p.type==="openai")hdrs["Authorization"]="Bearer "+ke.apiKey;const testBody={model:p.models[0],messages:[{role:"user",content:"ping"}],max_tokens:1};const resp=await fetch(p.baseUrl+"/chat/completions",{method:"POST",headers:hdrs,body:JSON.stringify(testBody)});const h=await getHealth(pname,ke.id);if(resp.ok){h.status="active";h.lastCheck=Date.now();h.consecutiveFailDays=0;h.lastError="";await setHealth(pname,ke.id,h);return new Response(JSON.stringify({ok:true,status:resp.status}),{headers:{"content-type":"application/json"}});}else{const txt=await resp.text();h.lastError=resp.status+": "+txt.slice(0,200);h.lastCheck=Date.now();if(resp.status===401||resp.status===403)h.consecutiveFailDays++;await setHealth(pname,ke.id,h);return new Response(JSON.stringify({ok:false,status:resp.status,error:txt.slice(0,200)}),{headers:{"content-type":"application/json"}});}}catch(e:any){return new Response(JSON.stringify({ok:false,error:e.message}),{headers:{"content-type":"application/json"}});}}

return new Response(JSON.stringify({error:"not found"}),{status:404,headers:{"content-type":"application/json"}});}async function handleCron() {const{PROVIDERS}=await import("config.ts");for(const p of PROVIDERS){const keys=await getKeys(p.name);for(const ke of keys){const h=await getHealth(p.name,ke.id);if(h.status==="dead"||h.status==="expired")continue;try{const hdrs:any={"Content-Type":"application/json"};if(p.type==="openai")hdrs["Authorization"]="Bearer "+ke.apiKey;const testBody={model:p.models[0],messages:[{role:"user",content:"ping"}],max_tokens:1};const resp=await fetch(p.baseUrl+"/chat/completions",{method:"POST",headers:hdrs,body:JSON.stringify(testBody)});if(resp.ok){h.status="active";h.lastCheck=Date.now();h.consecutiveFailDays=0;h.lastError="";}else{h.failCount++;if(resp.status===401||resp.status===403){h.consecutiveFailDays++;h.lastError=resp.status+": auth failed";}else{h.lastError=resp.status+": upstream error";}if(h.consecutiveFailDays>=EVICT_DAYS){h.status="expired";await logEviction(p.name,ke.id,"5_day_eviction: "+h.lastError);}}await setHealth(p.name,ke.id,h);}catch(e:any){h.failCount++;h.lastError="network: "+e.message;h.consecutiveFailDays++;if(h.consecutiveFailDays>=EVICT_DAYS){h.status="expired";await logEviction(p.name,ke.id,"5_day_eviction: "+h.lastError);}await setHealth(p.name,ke.id,h);}}}}export default <ExportedHandler>{
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/" || path === "/admin" || (path.startsWith("/admin") && !path.startsWith("/admin/api/"))) {
      if (!checkAdmin(req) && path !== "/admin/login") {
        return new Response(renderLogin(), { status: 200, headers: { "content-type": "text/html;charset=utf-8" } });
      }
      return new Response(renderDashboard(), { status: 200, headers: { "content-type": "text/html;charset=utf-8" } });
    }

    if (path === "/admin/login" && req.method === "POST") {
      const form = await req.formData();
      const pass = form.get("password");
      if (pass === ADMIN_PASSWORD) {
        const redirect = form.get("redirect")?.toString() || "/admin";
        return new Response("", {
          status: 302,
          headers: { Location: redirect, "Set-Cookie": "bfadmin=" + ADMIN_PASSWORD + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400" },
        });
      }
      return new Response(renderLogin("Invalid password"), { status: 200, headers: { "content-type": "text/html;charset=utf-8" } });
    }

    if (path.startsWith("/admin/api/")) {
      return await handleAdminApi(req, path);
    }

    if (path === "/v1/chat/completions" && req.method === "POST") {
      return await handleProxy(req);
    }

    if (path === "/v1/models" && req.method === "GET") {
      return await handleModels();
    }

    return new Response(renderDashboard(), { status: 200, headers: { "content-type": "text/html;charset=utf-8" } });
  },

  async scheduled(event, env, ctx) {
    await handleCron();
  },
};

function renderLogin(error?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Bifrost Admin</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}.login-box{background:#1e293b;padding:2rem;border-radius:12px;width:360px;box-shadow:0 25px 50px rgba(0,0,0,.4)}h1{text-align:center;margin-bottom:1.5rem;color:#38bdf8;font-size:1.5rem}input{width:100%;padding:10px 14px;margin-bottom:12px;border:1px solid #334155;border-radius:8px;background:#0f172a;color:#e2e8f0;font-size:14px}input:focus{outline:none;border-color:#38bdf8}button{width:100%;padding:10px;background:#38bdf8;color:#0f172a;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}button:hover{background:#7dd3fc}.error{color:#f87171;text-align:center;margin-bottom:12px;font-size:13px}</style></head>
<body><div class="login-box"><h1>Bifrost Bridge</h1>${error?`<p class="error">${error}</p>`:""}<form method="post" action="/admin/login"><input type="password" name="password" placeholder="Admin password" required><button type="submit">Enter</button></form></div></body></html>`}
function renderDashboard() {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Bifrost Bridge</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}.nav{background:#1e293b;padding:12px 24px;display:flex;align-items:center;gap:24px;border-bottom:1px solid #334155;position:sticky;top:0;z-index:50}.nav h1{color:#38bdf8;font-size:18px;font-weight:700}.nav a{color:#94a3b8;text-decoration:none;font-size:13px;padding:6px 12px;border-radius:6px;cursor:pointer}.nav a:hover,.nav a.active{color:#e2e8f0;background:#334155}.content{padding:24px;max-width:1200px;margin:0 auto}.tab{display:none}.tab.active{display:block}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}.card{background:#1e293b;padding:20px;border-radius:10px;border:1px solid #334155}.card h3{font-size:12px;text-transform:uppercase;color:#94a3b8;margin-bottom:8px}.card .val{font-size:28px;font-weight:700;color:#38bdf8}.card .val.green{color:#4ade80}.card .val.red{color:#f87171}.card .val.yellow{color:#fbbf24}table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:10px;overflow:hidden;margin-bottom:24px}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #334155;font-size:13px}th{background:#334155;color:#94a3b8;font-weight:600;font-size:11px;text-transform:uppercase}td{color:#e2e8f0}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}.badge.active{background:#166534;color:#4ade80}.badge.dead,.badge.expired{background:#7f1d1d;color:#f87171}.badge.warming{background:#713f12;color:#fbbf24}input[type=text],input[type=password],select{padding:8px 12px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#e2e8f0;font-size:13px;width:100%;margin-bottom:8px}input:focus,select:focus{outline:none;border-color:#38bdf8}button{padding:8px 16px;background:#38bdf8;color:#0f172a;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}button:hover{background:#7dd3fc}button.danger{background:#ef4444;color:#fff}button.danger:hover{background:#f87171}button.small{padding:4px 10px;font-size:11px}.flex{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.mb{margin-bottom:16px}.mt{margin-top:16px}.gap{gap:8px}.w-full{width:100%}.text-right{text-align:right}.toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;color:#fff;font-size:13px;z-index:100;transform:translateY(100px);opacity:0;transition:all .3s}.toast.show{transform:translateY(0);opacity:1}.toast.ok{background:#166534}.toast.err{background:#7f1d1d}.logs-box{background:#1e293b;border-radius:10px;padding:16px;max-height:500px;overflow-y:auto;font-family:monospace;font-size:12px}.logs-box div{padding:6px 0;border-bottom:1px solid #334155;color:#94a3b8}.logs-box .err{color:#f87171}.logs-box .evict{color:#fbbf24}</style></head>
<body>
<div class="nav"><h1>Bifrost</h1><a class="active" onclick="showTab(\'overview\')">Overview</a><a onclick="showTab(\'providers\')">Providers</a><a onclick="showTab(\'gateway\')">Gateway Keys</a><a onclick="showTab(\'logs\')">Logs</a></div>
<div class="content">
<div id="tab-overview" class="tab active"><div class="cards" id="statCards"></div><h3 style="color:#94a3b8;margin-bottom:12px;font-size:13px">Key Health Overview</h3><table><thead><tr><th>Provider</th><th>Key ID</th><th>Status</th><th>Success</th><th>Fail</th><th>Last Used</th><th>Last Error</th><th>Actions</th></tr></thead><tbody id="healthTable"></tbody></table></div>
<div id="tab-providers" class="tab"><div id="providerTabs" class="flex mb"></div><div id="providerContent"></div></div>
<div id="tab-gateway" class="tab"><div class="flex mb"><input type="text" id="gwWord" placeholder="Hindi dialogue word" style="width:200px"><select id="gwProv"><option value="">Select provider...</option></select><input type="text" id="gwModel" placeholder="Model (optional)" style="width:200px"><input type="text" id="gwLabel" placeholder="Label (optional)" style="width:200px"><button onclick="addGwKey()">Add Key</button></div><table><thead><tr><th>Word</th><th>Provider</th><th>Model</th><th>Label</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead><tbody id="gwTable"></tbody></table></div>
<div id="tab-logs" class="tab"><div class="logs-box" id="logBox"><div>Loading logs...</div></div></div>
</div>
<div id="toast" class="toast"></div>
<script>
const API = "/admin/api";
let state = {providers:[],keys:{},health:{},gws:[],stats:{},logs:[]};

async function api(path,opts={}){try{const r=await fetch(API+path,{headers:{"content-type":"application/json"},...opts});return await r.json()}catch(e){showToast(e.message,"err")}}

function showTab(name){document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));document.getElementById("tab-"+name).classList.add("active");document.querySelectorAll(".nav a").forEach(a=>a.classList.remove("active"));document.querySelectorAll(".nav a").forEach(a=>{if(a.textContent.toLowerCase().includes(name))a.classList.add("active")})}
function showToast(msg,type="ok"){const t=document.getElementById("toast");t.textContent=msg;t.className="toast "+type+" show";setTimeout(()=>t.classList.remove("show"),3000)}

async function loadProviders(){state.providers=await api("/providers");renderProviders()}
async function loadKeys(){state.keys=await api("/keys");renderProviders()}
async function loadStats(){state.stats=await api("/stats");renderStats()}
async function loadLogs(){state.logs=await api("/logs");renderLogs()}
async function loadGws(){state.gws=await api("/gateway-keys");renderGws();renderGwSelect()}

function renderStats(){const s=state.stats;document.getElementById("statCards").innerHTML=\`<div class="card"><h3>Requests Today</h3><div class="val">\${s.requestsToday||0}</div></div><div class="card"><h3>Total Keys</h3><div class="val">\${s.totalKeys||0}</div></div><div class="card"><h3>Active</h3><div class="val green">\${s.activeKeys||0}</div></div><div class="card"><h3>Warming</h3><div class="val yellow">\${s.warmingKeys||0}</div></div><div class="card"><h3>Dead/Expired</h3><div class="val red">\${(s.deadKeys||0)+(s.expiredKeys||0)}</div></div>\`}

async function renderProviders(){const provs=state.providers;const keys=state.keys;let tabs="",content="";for(const p of provs){const pkeys=keys[p.name]||[];tabs+=\`<button class="small" onclick="showProv('\${p.name}')">\${p.name}</button>\`;let rows="";for(const k of pkeys){const h=await fetch(\`/admin/api/stats\`);rows+=\`<tr><td>\${k.label}</td><td>\${k.id.slice(0,12)}</td><td><span class="badge warming">unknown</span></td><td></td><td></td><td></td><td><button class="small danger" onclick="deleteKey('\${p.name}','\${k.id}')">Remove</button></td></tr>\`}content+=\`<div id="prov-\${p.name}" class="prov-tab" style="display:none"><div class="flex mb"><input type="password" id="key-\${p.name}" placeholder="Paste API key for \${p.name}" style="width:400px"><input type="text" id="label-\${p.name}" placeholder="Label" style="width:200px"><button onclick="addKey('\${p.name}')">Add Key</button> <a href="\${p.devConsole}" target="_blank" style="color:#38bdf8;font-size:13px">Get key \u2197</a></div><table><thead><tr><th>Label</th><th>ID</th><th>Status</th><th>Success</th><th>Fail</th><th>Last Used</th><th>Actions</th></tr></thead><tbody id="tbl-\${p.name}">\${rows}</tbody></table></div>\`}document.getElementById("providerTabs").innerHTML=tabs;document.getElementById("providerContent").innerHTML=content;if(provs.length)showProv(provs[0].name)}
function showProv(name){document.querySelectorAll(".prov-tab").forEach(t=>t.style.display="none");const el=document.getElementById("prov-"+name);if(el)el.style.display="block";document.querySelectorAll("#providerTabs button").forEach(b=>b.style.background=b.textContent===name?"#38bdf8":"")}
async function addKey(provider){const key=document.getElementById("key-"+provider).value;const label=document.getElementById("label-"+provider).value;if(!key)return showToast("Enter API key","err");await api("/keys",{method:"POST",body:JSON.stringify({pname:provider,apiKey:key,label})});document.getElementById("key-"+provider).value="";await loadKeys();await loadStats();showToast("Key added")}
async function deleteKey(provider,id){if(!confirm("Remove this key?"))return;await api("/keys",{method:"DELETE",body:JSON.stringify({pname:provider,id})});await loadKeys();await loadStats();showToast("Key removed")}

async function renderGws(){const gws=state.gws;let rows="";for(const g of gws){rows+=\`<tr><td>\${g.word}</td><td>\${g.provider}</td><td>\${g.model||"-"}</td><td>\${g.label||g.word}</td><td>\${g.usage||0}</td><td><span class="badge \${g.enabled?"active":"dead"}" onclick="toggleGw('\${g.word}')">\${g.enabled?"ENABLED":"DISABLED"}</span></td><td><button class="small danger" onclick="deleteGw('\${g.word}')">Remove</button></td></tr>\`}document.getElementById("gwTable").innerHTML=rows||"<tr><td colspan=7 style='text-align:center;color:#64748b'>No gateway keys yet</td></tr>"}
function renderGwSelect(){const sel=document.getElementById("gwProv");sel.innerHTML=\`<option value="">Select provider...</option>\${state.providers.map(p=>\`<option value="\${p.name}">\${p.name}</option>\`).join("")}\`}
async function addGwKey(){const word=document.getElementById("gwWord").value;const provider=document.getElementById("gwProv").value;const model=document.getElementById("gwModel").value;const label=document.getElementById("gwLabel").value;if(!word||!provider)return showToast("Word and provider required","err");await api("/gateway-keys",{method:"POST",body:JSON.stringify({word,provider,model,label})});document.getElementById("gwWord").value="";document.getElementById("gwModel").value="";document.getElementById("gwLabel").value="";await loadGws();showToast("Gateway key added")}
async function toggleGw(word){const gw=state.gws.find(g=>g.word===word);if(!gw)return;await api("/gateway-keys",{method:"PATCH",body:JSON.stringify({word,enabled:!gw.enabled})});await loadGws()}
async function deleteGw(word){if(!confirm("Delete gateway key?"))return;await api("/gateway-keys",{method:"DELETE",body:JSON.stringify({word})});await loadGws();showToast("Gateway key deleted")}

function renderLogs(){const logs=state.logs;const box=document.getElementById("logBox");if(!logs.length){box.innerHTML="<div style='color:#64748b'>No logs yet</div>";return}box.innerHTML=logs.map(l=>{
  const cls=l.error?"err":l.reason?"evict":"";
  const text=l.error?\`[\${new Date(l.ts).toLocaleString()}] \${l.provider} \${l.keyId?.slice(0,12)}: \${l.error}\`:l.reason?\`[\${new Date(l.evictedAt).toLocaleString()}] EVICTED \${l.provider} \${l.keyId?.slice(0,12)}: \${l.reason}\`:\`[\${new Date(l.ts).toLocaleString()}] \${l.provider}: \${l.message||""}\`;
  return \`<div class="\${cls}">\${text}</div>\`}).join("")}

async function refreshAll(){await Promise.all([loadProviders(),loadKeys(),loadStats(),loadLogs(),loadGws()]);renderStats()}
setInterval(refreshAll,15000);refreshAll();
</script>
</body></html>`}
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/admin/login" && req.method === "POST") {
      const form = await req.formData();
      const pass = form.get("password");
      if (pass === ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ok:true}), {
          status: 200,
          headers: {"Set-Cookie": "bfadmin=" + ADMIN_PASSWORD + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400", "content-type":"application/json"}
        });
      }
      return new Response(JSON.stringify({error:"invalid password"}), {status:401, headers:{"content-type":"application/json"}});
    }

    if (path.startsWith("/admin/api/")) {
      return await handleAdminApi(req, path, env);
    }

    if (path === "/v1/chat/completions" && req.method === "POST") {
      return await handleProxy(req, env);
    }

    if ((path === "/v1/models" || path === "/v1/models") && req.method === "GET") {
      return await handleModels();
    }

    return new Response(JSON.stringify({service:"bifrost", status:"ok", docs:"https://github.com/richardbrownmiami-commits/devforge-ai/tree/main/bifrost"}), {
      headers: {"content-type":"application/json", "access-control-allow-origin":"*"}
    });
  },

  async scheduled(event: any, env: Env, ctx: any) {
    await handleCron(env);
  },
};