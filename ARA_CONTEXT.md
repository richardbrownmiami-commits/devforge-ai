# ARA_CONTEXT.md
# BrainForge Session Context -- Updated 2026-03-27

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
| **Cloudflare Pages Project** | brainforge |
| **Admin Panel** | https://brainforge-7xn.pages.dev/admin |
| **Admin Emergency Bypass** | https://brainforge-7xn.pages.dev/admin?key=bf2200 |
| **Portrait Image** | https://i.imgur.com/jLXabP8.png |

---

## Credentials (ask user to confirm each session)
- **GitHub Token:** user provides each session (last known: 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)
- **Cloudflare API Token:** user provides each session (last known: OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj)

---

## App Architecture

- **Frontend:** React + TypeScript + Tailwind, deployed on Cloudflare Pages
- **Backend:** Cloudflare Workers + D1 (SQLite)
- **Local Storage:** IndexedDB (50MB quota) via localForage
- **AI Providers:** Gemini, OpenRouter, Groq, GitHub Models (GPT-4o)
- **Build Tool:** Vite
- **Deploy:** GitHub push → Cloudflare Pages auto-build

## D1 Schema (actual tables)
- projects: id, name, description, code, template, deploy_url, updated_at
- chats: id, project_id, role, content, created_at
- memories: key, value, updated_at
- users: id, username, password_hash, email, recovery_key, quotas, created_at
- sessions: id, user_id, token, device_info, last_active, created_at
- feedback: id, user_id, type, message, status, admin_reply, created_at
- announcements: id, message, type, created_at, expires_at

---

## LOCKED SCREEN RULES -- NEVER CHANGE WITHOUT EXPLICIT INSTRUCTION

1. **Chat screen** = full screen, auto-grow textarea, horizontal scroll for code blocks
2. **Preview** = full-screen overlay (fixed inset-0 z-50), opens on button click -- NOT split view
3. **Settings** = 5-button hub: API Keys, AI Settings, Termux, GitHub & Deploy, PIN Lock
4. **Sidebar** = dark/light toggle, project list, navigation, logout button (for logged-in users)
5. **Master AI** = strict FILE: format responses only -- controlled ONLY from Admin panel
6. **Nova** = floating ⚡ button on Projects page (replaced Sharof)
7. **Admin Panel** = /admin route, separate from main app

---

## Key Source Files

- src/frontend/src/App.tsx -- PIN lock wrapper + router + user login check
- src/frontend/src/pages/EditorPage.tsx -- chat + preview overlay + memory button
- src/frontend/src/pages/SettingsPage.tsx -- 5-button hub + all settings pages
- src/frontend/src/pages/ProjectsPage.tsx -- project cards + template picker + Nova
- src/frontend/src/pages/AdminPage.tsx -- full admin panel (17 sub-pages)
- src/frontend/src/components/ChatPanel.tsx -- chat UI
- src/frontend/src/components/PreviewPanel.tsx -- preview + code folder + APK export
- src/frontend/src/components/Sidebar.tsx -- navigation + theme toggle + logout
- src/frontend/src/components/FeedbackWidget.tsx -- user feedback floating button
- src/frontend/src/components/UserNotifications.tsx -- bell icon for admin replies
- src/frontend/src/components/BroadcastBanner.tsx -- admin announcements banner
- cloudflare-worker/index.js -- Worker v3 (deployed)
- docs/BrainForge-Handbook.md -- full setup handbook

---

## Branding

- **App Name:** BrainForge
- **Made by:** Pinka (previously Richard Brown)
- **AI Assistant (Projects page):** Nova ⚡ -- sharp, direct, Hinglish, space-themed
- **Master AI:** Ara (admin-only, BrainForge maintenance)
- **Footer/Settings:** "Made with love by Pinka & Claude (Ara)"

---

## Features Confirmed Working (as of 2026-03-27)

### Core App
- Chat full screen + horizontal scroll, auto-grow textarea
- Preview full-screen overlay with Code folder
- Cross-origin fix permanent (window.parent/window.top override in iframe)
- Settings 5-button hub -- API Keys, AI Settings, Termux, GitHub & Deploy, PIN Lock
- Dark/Light theme toggle in sidebar
- Template picker after project creation
- Version history snapshots with timestamps + one-click restore
- Matrix overlay animation when AI is generating
- Auto error fix loop (3 retries before asking user)
- ZIP export of project files
- Deploy button in preview overlay
- IndexedDB 50MB storage (localForage)
- GitHub session auto-save per project
- Worker secret header (2200) enforced on all API calls
- D1 Worker fully deployed and protected
- Daily D1 backup to GitHub (cron at 2am UTC)
- Manual D1 backup button in Admin → Database
- AI proxy endpoint in Worker (/api/ai)
- PWA -- installable on Android/iOS home screen
- APK Export button in Preview (PWABuilder)
- Smart Deploy Detection (website vs app)
- Backup/Restore for AI-generated apps (IndexedDB)
- Screenshot-to-code (image upload in chat)
- 10 language support (HTML, React, React+TW, TS, Python, SQL, Markdown, p5.js, Three.js, Chart.js)
- Auto language detection (single AI call)
- Onboarding wizard (3-step: Welcome, API Key, Ready)
- Legal Policy Page
- 3D BrainForge icon

### User Login System
- Login screen on app open (username + password)
- Per-user data isolation (bf_projects_username prefix)
- Single session enforcement (one device at a time)
- Session conflict warning with "Continue" or "Go Back" options
- Sidebar logout button
- Daily message quota enforcement per user
- User feedback widget (⚡ floating button, 3 types: Suggestion/Feedback/Issue)
- User notifications bell (admin replies)
- Broadcast banner (admin announcements, auto-dismiss)

### Project Editor
- Memory button near Preview button (🧠)
- Memory panel slides in from right
- Auto memory sync (every 5 messages)
- New project = auto blank memory template
- Project delete = memory file deleted
- Global AI Rules from Admin (all projects follow)

### Admin Panel (/admin)
- Admin login: PIN + Username/Password + Recovery Key
- Emergency bypass: /admin?key=bf2200
- Auto-logout after 10 min idle (2 min warning)
- Dashboard (overview stats)
- Analytics (users, projects, messages, 7-day chart)
- Users page: create/delete/password-reset/quotas + Sessions tab + Memories tab
- Session Monitor: online/offline, device info, force logout
- Broadcast/Announcement page (info/warning/success types)
- Feedback page: all user feedback, reply, close
- API Monitor: live test for OpenRouter/Gemini/Groq
- Global AI Rules page (one set of rules, all projects)
- Master AI page (model, memory, rules -- admin only)
- Database page: D1 tables explorer, SQL runner, CSV export, Supabase config, backup
- Cloudflare page: Worker/D1/KV/Pages live status, monthly deploy count
- System page: Maintenance mode toggle, Full data export, Audit log, Error log

---

## Pending / Next Priorities

1. **Live Internet Search (DuckDuckGo)** -- toggle exists in Settings but not actually implemented
2. **Termux actual execution** -- URL saved but no command execution yet
3. **Fine-grained GitHub tokens** -- separate tokens for deploy vs AI
4. **Keys fully through Worker** -- currently sent in request body
5. **Testing with 2 testers** -- user management ready, testers not yet added
6. **Master AI testing** -- /admin/master-ai to be tested by user

---

## Security Status

| Item | Status |
|---|---|
| GitHub repo private | DONE |
| Worker secret header enforced | DONE (2200) |
| D1 protected | DONE -- 403 without correct secret |
| Daily D1 backup | DONE -- cron in Worker |
| PIN lock on app | DONE -- enforced in App.tsx |
| AI proxy in Worker | DONE -- /api/ai endpoint |
| User login system | DONE -- username/password |
| Single session enforcement | DONE |
| Admin panel protected | DONE -- PIN + bypass key |
| Admin auto-logout (10 min) | DONE |
| Fine-grained GitHub tokens | PENDING |
| Keys stored in Worker env | PENDING (keys still sent from client) |

---

## Last Session Summary (2026-03-27)

Major features built after March 26, 2026 (post last memory update):
- Full admin panel with 17 sub-pages
- User login system with data isolation and quotas
- Single session enforcement + session monitor
- Nova assistant (replaced Sharof on Projects page)
- Pinka branding (replaced Richard Brown)
- Per-project memory system (in-editor 🧠 button)
- Global AI rules in Admin
- D1 + Cloudflare status pages in Admin
- Feedback system (widget + admin panel + user notifications)
- Broadcast announcements
- APK export, Smart deploy, PWA, Backup/Restore
- Bug fixes: broadcast banner in main app, user quotas, dead code cleanup

---

## How to Restore Next Session

Paste this one line:

> BrainForge project. GitHub: richardbrownmiami-commits/devforge-ai. Token: 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. Cloudflare: 913f3a2576a358054eba9a58a9573949. Worker: brainforge-api. Secret: BRAINFORGE_SECRET=2200. Live: https://brainforge-7xn.pages.dev. Admin: https://brainforge-7xn.pages.dev/admin. Emergency: /admin?key=bf2200. Telegram: @araislivingbot
