# ARA_CONTEXT.md
# BrainForge Session Context -- Updated 2026-03-26 (Session 3)

## Identity
You are Ara, AI assistant for BrainForge. You help build, fix, and maintain this app.
Your personality: direct, honest, technical, no fluff.
Always restore this file at the start of every session before doing anything.

---

## Critical Resources

| Item | Value |
|---|---|
| **Live App** | https://brainforge-7xn.pages.dev |
| **Cloudflare Worker** | https://brainforge-api.richard-brown-miami.workers.dev |
| **GitHub Repo** | richardbrownmiami-commits/devforge-ai (private) |
| **Telegram Bot** | @araislivingbot |
| **Worker Secret** | BRAINFORGE_SECRET=2200 |
| **Cloudflare Account ID** | 913f3a2576a358054eba9a58a9573949 |
| **D1 Database ID** | 3814a86b-7054-465c-ae64-8bf99019cf6b |
| **D1 Database Name** | brainforge-db |
| **KV Namespace ID** | c62f444539254734869f4fae5dc74755 |
| **KV Binding Name** | APPS_KV |
| **Cloudflare Pages Project** | brainforge |
| **Admin Emergency Link** | https://brainforge-7xn.pages.dev/admin?key=bf2200 |

---

## Credentials
- **GitHub Token:** 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
- **Cloudflare API Token:** OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj

---

## App Architecture

- **Frontend:** React + TypeScript + Tailwind, deployed on Cloudflare Pages
- **Backend:** Cloudflare Workers + D1 (SQLite)
- **AI Providers:** Gemini, OpenRouter, Groq, GitHub Models
- **Build Tool:** Vite
- **Deploy:** GitHub push → GitHub Actions → Cloudflare Pages auto-build

## D1 Schema
- projects: id, name, description, code, template, deploy_url, updated_at
- chats: id, project_id, role, content, created_at
- memories: key, value, updated_at

---

## CURRENT SETTINGS PAGE -- 5 BUTTONS (updated Session 3)
1. API Keys
2. AI Settings
3. Termux
4. GitHub & Deploy
5. PIN Lock
(Database → Admin panel, AI Files → Project panel, Master AI → Admin panel)

---

## Admin Panel -- 17 Pages (all working)
/admin (Dashboard), /admin/analytics, /admin/users, /admin/broadcast,
/admin/feedback, /admin/api-monitor, /admin/master-ai, /admin/ai-rules,
/admin/database, /admin/cloudflare, /admin/system, /admin/status,
/admin/backup, /admin/issues, /admin/deploy-log, /admin/notes, /admin/termux

---

## Key Features Status (Session 3 -- All Confirmed Working)

### Main App
- User login (username/password) + single session enforcement
- Session conflict warning when same account logged in elsewhere
- Admin force logout from Users panel
- PIN Lock + 10-min idle auto-logout (admin)
- Maintenance mode (admin toggle → users see maintenance screen)
- Projects page + 9 templates + Nova assistant (⚡ bottom-right)
- Editor: AI chat + Preview + Memory button + Language selector
- AI Memory per project (auto-created on new project, deleted on project delete)
- Global AI Rules (Admin → AI Rules → all projects follow)
- Memory auto-sync every 5 messages
- User quotas (daily message limit + max projects, set per user in admin)
- Broadcast notifications (admin → users see banner in app)
- Feedback widget + admin replies + user notifications
- PWA installable + APK export (PWABuilder)
- Smart deploy detection (website vs app/tool)
- Backup/Restore in AI-generated data apps (IndexedDB)
- Auto error fix loop (3 retries)
- Version history snapshots
- Dark/Light theme toggle
- Emergency admin bypass: /admin?key=bf2200

### Branding
- "Pinka" (not Richard Brown) in footer/policy
- Nova (not Sharof) -- ⚡ purple assistant on projects page
- BrainForge 3D icon

### Not Yet Built (planned for later)
- DuckDuckGo live internet search (toggle exists, not wired)
- Termux actual command execution (URL saved, not connected)
- Google login / multi-user auth
- Inbuilt publish for non-GitHub users

---

## Key Source Files
- src/frontend/src/App.tsx -- router + MaintenanceGate + PinLock
- src/frontend/src/pages/EditorPage.tsx -- chat + preview + memory button
- src/frontend/src/pages/SettingsPage.tsx -- 5-button hub
- src/frontend/src/pages/ProjectsPage.tsx -- projects + templates
- src/frontend/src/components/ChatPanel.tsx -- chat UI
- src/frontend/src/components/PreviewPanel.tsx -- preview + APK + deploy
- src/frontend/src/components/ProjectAssistant.tsx -- Nova assistant
- src/frontend/src/components/UserLoginGate.tsx -- login + session conflict
- src/frontend/src/components/FeedbackWidget.tsx -- feedback + broadcast banner
- src/frontend/src/lib/userUtils.ts -- users, sessions, quotas
- src/frontend/src/hooks/useAIChat.ts -- AI chat + global rules + memory injection
- src/frontend/src/pages/admin/ -- all 17 admin pages
