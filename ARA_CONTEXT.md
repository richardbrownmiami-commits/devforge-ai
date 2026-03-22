# ARA_CONTEXT.md
# BrainForge Session Context -- Updated 2026-03-22

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
- **Deploy:** Caffeine pipeline OR wrangler pages deploy

## D1 Schema (actual tables)
- projects: id, name, ai_model, code, created_at, last_modified
- messages: id, project_id, role, content, created_at
- snapshots: id, project_id, code, description, created_at
- ai_memory: scope, content, message_count, updated_at
- ai_rules: scope, content, updated_at
- settings: key, value
- telegram_chats: chat_id, history, updated_at

---

## LOCKED SCREEN RULES -- NEVER CHANGE WITHOUT EXPLICIT INSTRUCTION

1. **Chat screen** = full screen, auto-grow textarea, horizontal scroll for code blocks
2. **Preview** = full-screen overlay (fixed inset-0 z-50), opens on button click -- NOT split view, no md:w-1/2, no Tabs
3. **Settings** = 7-button hub: API Keys, AI Settings, Termux, GitHub & Deploy, Master AI, AI Files, Database
4. **Sidebar** = dark/light toggle, project list, navigation
5. **Master AI** = strict FILE: format responses only, no chat, no code explanations

---

## Key Source Files

- src/frontend/src/pages/EditorPage.tsx -- chat + preview overlay
- src/frontend/src/pages/SettingsPage.tsx -- 7-button hub (HUB_BUTTONS constant)
- src/frontend/src/pages/ProjectsPage.tsx -- project cards + template picker
- src/frontend/src/components/ChatPanel.tsx -- chat UI with horizontal scroll
- src/frontend/src/components/PreviewPanel.tsx -- preview + code folder (Preview/Code toggle)
- src/frontend/src/components/Sidebar.tsx -- navigation + theme toggle
- cloudflare-worker/index.js -- Worker with D1 protection (deployed)
- docs/CHANGE-SECRET.md -- instructions for changing the 2200 secret
- docs/BrainForge-Handbook.md -- full setup handbook (TO DO)

---

## Features Confirmed Working

- Chat full screen + horizontal scroll, auto-grow textarea
- Preview full-screen overlay with Code folder (Preview/Code toggle)
- Cross-origin fix permanent (window.parent/window.top override in iframe)
- Settings 7-button hub -- all 7 buttons open full pages
- Master AI with strict FILE: format system prompt
- Dark/Light theme toggle in sidebar
- Template picker after project creation (Blank, Landing, Dashboard, Game, Chat)
- Version history snapshots with timestamps + one-click restore
- Matrix overlay animation when AI is generating
- Auto error fix loop (3 retries before asking user)
- ZIP export of project files
- Deploy button in preview overlay -- pushes to GitHub + saves live URL
- Live links on project cards
- IndexedDB 50MB storage (localForage)
- GitHub session auto-save per project (sessions/{name}/session.json)
- Worker secret header (2200) sent on all API calls
- Storage meter in Database tab (color-coded)
- D1 Worker fully deployed and protected -- secret check enforced
- Daily D1 backup to GitHub (cron at 2am)

---

## Pending / Next Priorities

1. **Master AI dynamic memory** -- fetch memories/master-ai-memory.md and rules/master-ai-rules.md from GitHub on page open, inject into system prompt. Currently static/hardcoded.
2. **GitHub Models + Groq as AI providers** -- add GPT-4o (free via GitHub token) and Llama 3.3 (Groq free) for Master AI rotation
3. **BrainForge Handbook** -- create docs/BrainForge-Handbook.md with full setup guide (PDF failed earlier, redo as Markdown)
4. **PIN lock and session timeout** -- app access protection
5. **Master AI push confirmation + audit log** -- logs/master-ai-changes.md
6. **ShipMyWheels** -- push code and add features
7. **TradeArena** -- plan and start building
8. **Route AI keys through Cloudflare Worker** -- so keys are never in browser localStorage

---

## Security Status

| Item | Status |
|---|---|
| GitHub repo private | DONE |
| Worker secret header enforced | DONE (2200) |
| D1 protected | DONE -- 403 without correct secret |
| Daily D1 backup | DONE -- cron in Worker |
| Fine-grained GitHub tokens | PENDING -- user to create |
| PIN lock on app | PENDING |
| Keys through Worker | PENDING |

---

## Session Restore Instructions (for Ara)

1. Fetch this file from GitHub at start of every session
2. Restore frontend source files from GitHub before any build
3. Verify EditorPage.tsx has previewOpen overlay pattern (NOT split, no md:w-1/2)
4. Verify SettingsPage.tsx has HUB_BUTTONS constant (7 buttons)
5. Never change chat/preview/settings layout without explicit user instruction
6. Always confirm before building -- user preference: no action without confirmation
7. Use Python for all file writes (curl was silently failing)
8. Use Cloudflare API directly to deploy Worker (no wrangler needed, have token)

---

## How to Deploy Worker (Ara can do this autonomously)

Cloudflare API token: ask user or check conversation
Account ID: 913f3a2576a358054eba9a58a9573949
D1 Database ID: 3814a86b-7054-465c-ae64-8bf99019cf6b
Worker name: brainforge-api

Use Python urllib multipart upload to:
PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/brainforge-api

---

## Last Session Summary (2026-03-22)

- Discussed D1 security -- confirmed Worker was NOT protected at start of session
- Deployed updated Worker with secret header enforcement via Cloudflare API (Python urllib)
- Verified: without secret returns 403, with secret 2200 returns data correctly
- D1 schema confirmed: projects use last_modified not updated_at
- Added docs/CHANGE-SECRET.md to GitHub -- full instructions for changing the secret
- Updated ARA_CONTEXT.md on GitHub
- User is pausing the project for a few days
- Next session: start with Master AI dynamic memory loading

---

## Notes for Next Session

- D1 is now fully secure -- do not need to redo this
- Cloudflare Worker is live and working correctly
- All credentials above are current as of 2026-03-22
- User preference: discuss before building, no surprises
