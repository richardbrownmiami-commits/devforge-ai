# ARA_CONTEXT.md
# BrainForge Session Context -- Updated 2026-03-25

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

---

## LOCKED SCREEN RULES -- NEVER CHANGE WITHOUT EXPLICIT INSTRUCTION

1. **Chat screen** = full screen, auto-grow textarea, horizontal scroll for code blocks
2. **Preview** = full-screen overlay (fixed inset-0 z-50), opens on button click -- NOT split view
3. **Settings** = 8-button hub: API Keys, AI Settings, Termux, GitHub & Deploy, Master AI, AI Files, Database, PIN Lock
4. **Sidebar** = dark/light toggle, project list, navigation
5. **Master AI** = strict FILE: format responses only

---

## Key Source Files

- src/frontend/src/App.tsx -- PIN lock wrapper + router
- src/frontend/src/pages/EditorPage.tsx -- chat + preview overlay
- src/frontend/src/pages/SettingsPage.tsx -- 8-button hub + all settings pages
- src/frontend/src/pages/ProjectsPage.tsx -- project cards + template picker
- src/frontend/src/components/ChatPanel.tsx -- chat UI
- src/frontend/src/components/PreviewPanel.tsx -- preview + code folder
- src/frontend/src/components/Sidebar.tsx -- navigation + theme toggle
- cloudflare-worker/index.js -- Worker v3 (deployed)
- docs/BrainForge-Handbook.md -- full setup handbook

---

## Features Confirmed Working (as of 2026-03-25)

- Chat full screen + horizontal scroll, auto-grow textarea
- Preview full-screen overlay with Code folder
- Cross-origin fix permanent (window.parent/window.top override in iframe)
- Settings 8-button hub -- all 8 buttons open full pages
- Master AI with strict FILE: format system prompt
- Master AI auto-loads memory from GitHub on page open
- Master AI auto-response greeting on page open
- Master AI voice output (Web Speech API, deep/robotic, EN or HI toggle)
- Master AI memory auto-update to GitHub after every response
- Master AI push confirmation + audit log
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
- Manual D1 backup button in Database tab
- AI proxy endpoint in Worker (/api/ai)
- PIN Lock: screen on app load, session timeout, activity tracking
- BrainForge Handbook: docs/BrainForge-Handbook.md

---

## Pending / Next Priorities

1. **Fine-grained GitHub tokens** -- user to create separate tokens for deploy vs AI
2. **Full AI code generation loop** -- improve BrainForge to be self-sufficient as Caffeine replacement
3. **TradeArena** -- separate project, not yet started
4. **Keys fully through Worker** -- currently sent in request body to Worker proxy; next step is storing in Worker env vars

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
| Fine-grained GitHub tokens | PENDING |
| Keys stored in Worker env | PENDING (keys still sent from client) |

---

## Last Session Summary (2026-03-25)

- User said "Trade arena chod kar sab implement karo" (implement all pending except TradeArena)
- Implemented PIN Lock enforcement in App.tsx (PinLock component wrapping entire app)
- Added Master AI voice output (Web Speech API, deep pitch=0.3, rate=0.78, EN/HI toggle)
- Added Master AI auto-load memory from GitHub when page opens
- Added Master AI auto-response greeting message on page open
- Fixed Worker backup POST endpoint (was GET only, now POST with body token/repo)
- Added AI proxy endpoint /api/ai to Worker (routes to openrouter/gemini/groq/github)
- Created docs/BrainForge-Handbook.md (comprehensive setup guide)
- All pushed to GitHub, Cloudflare Pages auto-deploying

---

## How to Restore Next Session

Paste this one line:

> BrainForge project. GitHub: richardbrownmiami-commits/devforge-ai. Token: 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. Cloudflare: 913f3a2576a358054eba9a58a9573949. Worker: brainforge-api. Secret: BRAINFORGE_SECRET=2200. Live: https://brainforge-7xn.pages.dev. Telegram: @araislivingbot
