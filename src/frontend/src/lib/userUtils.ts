// BrainForge User Utilities -- simple localStorage-based user system

export interface BFUser {
  username: string;
  passwordHash: string;
  email?: string;
  createdAt: string;
  lastActive?: string;
  dailyMessageLimit?: number; // 0 = unlimited
  maxProjects?: number; // 0 = unlimited
}

// ===== Secure Hashing (SHA-256 via Web Crypto) =====
export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** @deprecated Use sha256() for security-critical hashing */
export function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h.toString(16);
}

// ===== Secure Token Generation =====
function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ===== Brute Force Lockout =====
export function getBruteForceStatus(scope: string): { locked: boolean; remaining: number; attempts: number } {
  const key = `bf_bruteforce_${scope}`;
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  const lockoutUntil = data.lockoutUntil || 0;
  const attempts = data.attempts || 0;
  if (Date.now() < lockoutUntil) {
    return { locked: true, remaining: Math.ceil((lockoutUntil - Date.now()) / 60000), attempts };
  }
  return { locked: false, remaining: 0, attempts };
}

export function recordFailedAttempt(scope: string): { locked: boolean; remaining: number; attempts: number } {
  const key = `bf_bruteforce_${scope}`;
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  const attempts = (data.attempts || 0) + 1;
  const LOCK_AFTER = 5;
  const LOCK_MINUTES = 30;
  if (attempts >= LOCK_AFTER) {
    const lockoutUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
    localStorage.setItem(key, JSON.stringify({ attempts, lockoutUntil }));
    return { locked: true, remaining: LOCK_MINUTES, attempts };
  }
  localStorage.setItem(key, JSON.stringify({ attempts, lockoutUntil: data.lockoutUntil || 0 }));
  return { locked: false, remaining: 0, attempts };
}

export function clearBruteForce(scope: string) {
  localStorage.removeItem(`bf_bruteforce_${scope}`);
}

// ===== Quotas =====
export function getTodayMessageCount(username: string): number {
  const key = `bf_msg_count_${username}_${new Date().toDateString()}`;
  return parseInt(localStorage.getItem(key) || "0");
}
export function incrementMessageCount(username: string): number {
  const key = `bf_msg_count_${username}_${new Date().toDateString()}`;
  const count = parseInt(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, String(count));
  return count;
}
export function checkMessageQuota(username: string): { allowed: boolean; count: number; limit: number } {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  const limit = user?.dailyMessageLimit || 0;
  const count = getTodayMessageCount(username);
  if (limit === 0) return { allowed: true, count, limit: 0 };
  return { allowed: count < limit, count, limit };
}

export interface Activity {
  id: string;
  username: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface Feedback {
  id: string;
  username: string;
  type: "suggest" | "feedback" | "issue";
  message: string;
  timestamp: string;
  adminReply?: string;
  adminReplyAt?: string;
  replyRead: boolean;
  status: "open" | "replied" | "closed";
}

export interface SessionRecord {
  username: string;
  token: string;
  deviceInfo: string;
  loginAt: string;
  lastActive: string;
}

export function getDeviceInfo(): string {
  try {
    return `${navigator.userAgent.substring(0, 60)} | ${screen.width}x${screen.height} | ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  } catch { return "Unknown device"; }
}

// ===== Session =====
export function getCurrentUser(): string | null {
  return sessionStorage.getItem("bf_session_user");
}

export function getSessionRecord(username: string): SessionRecord | null {
  try { return JSON.parse(localStorage.getItem(`bf_session_${username}`) || "null"); } catch { return null; }
}

export function setCurrentUser(username: string) {
  const token = generateToken();
  const record: SessionRecord = {
    username,
    token,
    deviceInfo: getDeviceInfo(),
    loginAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
  localStorage.setItem(`bf_session_${username}`, JSON.stringify(record));
  sessionStorage.setItem("bf_session_token", token);
  sessionStorage.setItem("bf_session_user", username);
  updateLastActive(username);
}

export function validateCurrentSession(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  const token = sessionStorage.getItem("bf_session_token");
  const record = getSessionRecord(user);
  if (!record || record.token !== token) return false;
  localStorage.setItem(`bf_session_${user}`, JSON.stringify({ ...record, lastActive: new Date().toISOString() }));
  return true;
}

export function hasActiveSession(username: string): boolean {
  const record = getSessionRecord(username);
  if (!record || record.token === "__force_logged_out__") return false;
  const diff = Date.now() - new Date(record.lastActive).getTime();
  return diff < 24 * 60 * 60 * 1000;
}

export function forceLogoutUser(username: string) {
  const record = getSessionRecord(username);
  if (record) {
    localStorage.setItem(`bf_session_${username}`, JSON.stringify({
      ...record,
      token: "__force_logged_out__",
      lastActive: new Date().toISOString(),
    }));
  }
}

export function logoutUser() {
  const user = getCurrentUser();
  if (user) {
    const record = getSessionRecord(user);
    if (record) {
      localStorage.setItem(`bf_session_${user}`, JSON.stringify({
        ...record,
        token: "__logged_out__",
        lastActive: new Date().toISOString(),
      }));
    }
  }
  sessionStorage.removeItem("bf_session_user");
  sessionStorage.removeItem("bf_session_token");
}

// ===== Users =====
export function getUsers(): BFUser[] {
  return JSON.parse(localStorage.getItem("bf_users") || "[]");
}
export function saveUsers(users: BFUser[]) {
  localStorage.setItem("bf_users", JSON.stringify(users));
}
function updateLastActive(username: string) {
  const users = getUsers();
  const updated = users.map(u => u.username === username ? { ...u, lastActive: new Date().toISOString() } : u);
  saveUsers(updated);
}

// ===== User-scoped storage keys =====
export function projectsKey(): string {
  const user = getCurrentUser();
  return user ? `bf_projects_${user}` : "bf_projects";
}
export function chatKey(projectName: string): string {
  const user = getCurrentUser();
  return user ? `bf_chat_${user}_${projectName}` : `bf_chat_${projectName}`;
}

// ===== Activity =====
export function logActivity(action: string, detail = "") {
  const user = getCurrentUser();
  if (!user) return;
  const log: Activity[] = JSON.parse(localStorage.getItem("bf_activity_log") || "[]");
  log.unshift({ id: Date.now().toString(), username: user, action, detail, timestamp: new Date().toISOString() });
  localStorage.setItem("bf_activity_log", JSON.stringify(log.slice(0, 500)));
}
export function getActivityLog(): Activity[] {
  return JSON.parse(localStorage.getItem("bf_activity_log") || "[]");
}

// ===== Feedback =====
export function getFeedback(): Feedback[] {
  return JSON.parse(localStorage.getItem("bf_feedback") || "[]");
}
export function addFeedback(type: Feedback["type"], message: string) {
  const user = getCurrentUser();
  if (!user || !message.trim()) return;
  const list = getFeedback();
  list.unshift({ id: Date.now().toString(), username: user, type, message: message.trim(),
    timestamp: new Date().toISOString(), replyRead: false, status: "open" });
  localStorage.setItem("bf_feedback", JSON.stringify(list));
}
export function saveFeedback(list: Feedback[]) {
  localStorage.setItem("bf_feedback", JSON.stringify(list));
}

// ===== Notifications =====
export function getUnreadCount(username: string): number {
  return getFeedback().filter(f => f.username === username && f.adminReply && !f.replyRead).length;
}
export function markNotificationsRead(username: string) {
  const list = getFeedback().map(f =>
    f.username === username && f.adminReply ? { ...f, replyRead: true } : f
  );
  saveFeedback(list);
}
