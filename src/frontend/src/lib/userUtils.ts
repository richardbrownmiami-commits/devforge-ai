// BrainForge User Utilities -- simple localStorage-based user system

export interface BFUser {
  username: string;
  passwordHash: string;
  email?: string;
  createdAt: string;
  lastActive?: string;
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
  type: 'suggest' | 'feedback' | 'issue';
  message: string;
  timestamp: string;
  adminReply?: string;
  adminReplyAt?: string;
  replyRead: boolean;
  status: 'open' | 'replied' | 'closed';
}

export function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h.toString(16);
}

// ===== Session =====
export function getCurrentUser(): string | null {
  return sessionStorage.getItem('bf_session_user');
}
export function setCurrentUser(username: string) {
  sessionStorage.setItem('bf_session_user', username);
  updateLastActive(username);
}
export function logoutUser() {
  sessionStorage.removeItem('bf_session_user');
}

// ===== Users =====
export function getUsers(): BFUser[] {
  return JSON.parse(localStorage.getItem('bf_users') || '[]');
}
export function saveUsers(users: BFUser[]) {
  localStorage.setItem('bf_users', JSON.stringify(users));
}
function updateLastActive(username: string) {
  const users = getUsers();
  const updated = users.map(u => u.username === username ? { ...u, lastActive: new Date().toISOString() } : u);
  saveUsers(updated);
}

// ===== User-scoped storage keys =====
export function projectsKey(): string {
  const user = getCurrentUser();
  return user ? `bf_projects_${user}` : 'bf_projects';
}
export function chatKey(projectName: string): string {
  const user = getCurrentUser();
  return user ? `bf_chat_${user}_${projectName}` : `bf_chat_${projectName}`;
}

// ===== Activity =====
export function logActivity(action: string, detail = '') {
  const user = getCurrentUser();
  if (!user) return;
  const log: Activity[] = JSON.parse(localStorage.getItem('bf_activity_log') || '[]');
  log.unshift({ id: Date.now().toString(), username: user, action, detail, timestamp: new Date().toISOString() });
  localStorage.setItem('bf_activity_log', JSON.stringify(log.slice(0, 500)));
}
export function getActivityLog(): Activity[] {
  return JSON.parse(localStorage.getItem('bf_activity_log') || '[]');
}

// ===== Feedback =====
export function getFeedback(): Feedback[] {
  return JSON.parse(localStorage.getItem('bf_feedback') || '[]');
}
export function addFeedback(type: Feedback['type'], message: string) {
  const user = getCurrentUser();
  if (!user || !message.trim()) return;
  const list = getFeedback();
  list.unshift({ id: Date.now().toString(), username: user, type, message: message.trim(),
    timestamp: new Date().toISOString(), replyRead: false, status: 'open' });
  localStorage.setItem('bf_feedback', JSON.stringify(list));
}
export function saveFeedback(list: Feedback[]) {
  localStorage.setItem('bf_feedback', JSON.stringify(list));
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
