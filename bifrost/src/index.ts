const ADMIN_PASSWORD = "2200";
const MASTER_KEY = "bf-master-kun-2026";
const DAY_MS = 86400000;
const EVICT_DAYS = 5;

interface KeyEntry { id: string; apiKey: string; label: string; addedAt: number; }
interface HealthEntry { status: "active" | "warming" | "dead" | "expired"; lastCheck: number; consecutiveFailDays: number; lastError: string; lastUsed: number; successCount: number; failCount: number; }
interface GatewayKey { word: string; provider: string; model: string; label: string; createdAt: number; enabled: boolean; usage: number; }
interface RequestLog { id: string; model: string; provider: string; status: number; ts: number; duration: number; }
interface EvictionLog { id: string; provider: string; keyId: string; reason: string; evictedAt: number; }

// ── KV Helpers ──

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
async function getStat(date: string): Promise<number> {
  const v = await BF.get("stat:req:" + date);
  return v ? parseInt(v) : 0;
}
async function logError(provider: string, keyId: string, error: string, message: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  await BF.put("log:err:" + provider + ":" + keyId + ":" + id, JSON.stringify({ provider, keyId, error, message, ts: Date.now() }));
}
async function logEviction(provider: string, keyId: string, reason: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  await BF.put("log:evict:" + id, JSON.stringify({ provider, keyId, reason, evictedAt: Date.now() }));
}
async function getRecentLogs(): Promise<any[]> {
  const list = await BF.list({ prefix: "log:", limit: 100 });
  const out: any[] = [];
  for (const k of list.keys) {
    const v = await BF.get(k.name, "json");
    if (v) out.push(v as any);
  }
  return out.sort((a: any, b: any) => (b.ts || b.evictedAt || 0) - (a.ts || a.evictedAt || 0)).slice(0, 50);
}

// ── Auth ──

function checkAuth(req: Request): boolean {
  const auth = req.headers.get("Authorization") || "";
  const cookie = req.headers.get("Cookie") || "";
  if (auth === "Bearer " + MASTER_KEY || auth === "Bearer " + ADMIN_PASSWORD) return true;
  if (cookie.includes("bfadmin=" + ADMIN_PASSWORD)) return true;
  return false;
}
function getBearer(req: Request): string | null {
  const auth = req.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}