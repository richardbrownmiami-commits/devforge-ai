# BRAINFORGE_MEMORY.md
# BrainForge Full Project Memory -- Updated 2026-03-27

## Project Overview
BrainForge is a self-hosted, AI-powered app builder. Users describe app ideas, AI generates
code (HTML/CSS/JS/React/TypeScript/Python/SQL/Markdown/p5.js/Three.js/Chart.js), live preview,
auto-fix errors, deploy to GitHub + Cloudflare Pages.

Built by: Pinka
AI Assistant: Ara (Claude/OpenRouter)
Tagline: "Soocho Mat — Bana Dalo KHUD Ka App"

## Live Infrastructure
| Resource | URL/Value |
|---|---|
| Live App | brainforge-7xn.pages.dev |
| Worker | brainforge-api.richard-brown-miami.workers.dev |
| GitHub | github.com/richardbrownmiami-commits/devforge-ai (private) |
| D1 DB | brainforge-db |
| KV | BRAINFORGE_APPS |
| Admin | /admin (PIN + username/password, emergency: /admin?key=bf2200) |
| Telegram | @araislivingbot |

## GitHub Repo Structure
```
devforge-ai/
├── ARA_CONTEXT.md              <- Session restore + credentials
├── BRAINFORGE_MEMORY.md        <- This file
├── BRAINFORGE_CONTEXT.md       <- Backup context
├── docs/
│   └── brainforge-knowledge-base.html  <- Full knowledge base (printable PDF)
├── src/frontend/src/
│   ├── pages/
│   │   ├── ProjectsPage.tsx    <- Main projects + Nova assistant
│   │   ├── EditorPage.tsx      <- Editor + AI chat + preview
│   │   ├── SettingsPage.tsx    <- 5 buttons: API Keys, AI, Termux, GitHub, PIN
│   │   └── admin/              <- 17 admin sub-pages
│   ├── components/
│   │   ├── ChatPanel.tsx
│   │   ├── PreviewPanel.tsx    <- Full-screen overlay, cross-origin fixed
│   │   ├── Sidebar.tsx
│   │   └── Nova.tsx            <- Floating ⚡ assistant
│   └── hooks/useAIChat.ts      <- AI logic + auto-rotation
├── worker/
│   ├── brainforge-api.js       <- Main Worker code
│   └── wrangler.toml
├── memories/                   <- Per-project AI memory files
├── rules/master-ai-rules.md    <- Global AI rules (admin only)
├── backups/                    <- D1 daily backups (JSON)
└── .opencode/instructions/ara-identity.md
```

## Completed Features

### Core App Builder
- AI code generation: HTML/CSS/JS, React, TypeScript, Python, SQL, p5.js, Three.js, Chart.js
- Auto language detection
- Live preview (sandboxed iframe, srcDoc, cross-origin fixed)
- Full-screen preview overlay
- Code folder (multi-file per project)
- Download as ZIP
- Version history + restore (36 snapshots)
- Auto error fix loop (3 retries)
- Editable code editor

### AI System
- Multi-provider: OpenRouter (60+ free models), Gemini 1.5 Flash, Groq, GitHub Models
- Default: openrouter/auto (best available model auto-selected)
- Auto-rotation on rate limit
- HQ Mode: 3 models parallel + judge AI (Master AI only)
- Per-project memory (auto-sync every 5 messages)
- Global rules (admin panel only)
- Voice output: Web Speech API (Hindi/English, character modes)
- Screenshot-to-code

### Project Management
- Colored animated project cards
- Initials avatar, language badge, status badge, last edited time
- Quick actions: Preview, Edit, Delete, Rename (hover -> pencil)
- Memory button (next to Preview)
- 9 templates + onboarding wizard
- Persistent chat per project (D1 + GitHub)

### Settings (5 Buttons)
1. API Keys (OpenRouter, Gemini, Groq, GitHub Models)
2. AI Settings (model, temperature, rules)
3. Termux (URL field only)
4. GitHub & Deploy (token, repo, deploy config)
5. PIN Lock

### Admin Panel (17 Pages)
Dashboard, Users, Sessions, Activity, Feedback, Broadcast, API Monitor,
Master AI, AI Files, Database, Cloudflare, System, Deploy Log, Global Rules,
Backup, Error Log, Audit Log

### Security
- SHA-256 hashing (Web Crypto API) for passwords/PINs
- crypto.getRandomValues() for session tokens
- Brute force lockout: 5 tries -> 30 min block
- OTP in sessionStorage only (not localStorage)
- Emergency bypass uses hash, not plaintext
- Single session enforcement
- Worker secret header (X-BrainForge-Secret: 2200)
- Private repo

### Deployment
- One-click deploy (GitHub -> Cloudflare Pages)
- Smart deploy detection (website: deploy, app/tool: publish/APK)
- Inbuilt publish (KV -> /p/slug)
- APK export (PWABuilder API)
- PWA installable

### Nova Assistant
- Floating ⚡ button on projects page
- Hinglish, space-themed personality
- Help/usage only (not code)
- Uses openrouter/auto with saved API key

### Backup & Reliability
- D1 daily auto-backup cron (2 AM UTC -> GitHub/backups/)
- KV namespace BRAINFORGE_APPS bound
- Worker secrets: GITHUB_TOKEN, GITHUB_REPO set
- Manual backup via Admin -> Backup page

## Pending Features
| Feature | Status |
|---|---|
| DuckDuckGo live search | Toggle present, not implemented |
| Termux execution | URL only, no real execution |
| Full Figma import | Screenshot-to-code is basic |
| Team/collab | Planned post-stability |
| Google Auth | Planned, username/password for now |
| Telegram bot backend | Plan ready, token never provided |
| Video remix tool | Plan discussed, not built |
| API key routing via Worker | Planned for security |

## Architecture Decisions
- Caffeine = temporary workspace only (resets every session)
- All permanent code: GitHub -> Cloudflare pipeline
- All data: Cloudflare D1 (primary) + GitHub (backup)
- No reliance on Caffeine credits or infrastructure
- AI memory portable: ara-identity.md + ARA_CONTEXT.md loadable anywhere

## Cloudflare Worker API Endpoints
| Endpoint | Function |
|---|---|
| GET /api/stats | D1 stats |
| GET /api/projects | All projects |
| POST /api/projects | Save project |
| DELETE /api/projects/:id | Delete project |
| GET /api/chat?projectId= | Chat history |
| POST /api/chat | Save message |
| GET /api/memory?key= | Get memory file |
| POST /api/memory | Save memory file |
| GET /api/backup | D1 export JSON |
| POST /api/backup | Push to GitHub |
| POST /api/ai | AI proxy |
| POST /api/publish | KV publish |
| GET /p/:slug | Serve published app |
| GET /api/kv-list | List KV apps |
| GET /api/kv-stats | KV stats |

## Conversation History Highlights (This Session)
- Discussed Telegram bot for personal assistant use: concluded bot = Telegram-only,
  not Caffeine-linked, for alerts/reminders/simple config (not complex code builds)
- Discussed video remix tool using FFmpeg.wasm + ACRCloud + open source repos:
  plan = GitHub Releases (storage) + Termux (processing) + OpenRouter (AI analysis)
  Decision: Build later
- Discussed open source libraries (remotion, ffmpeg.wasm, tfjs-models, whisper-web)
  for video tool -- all MIT/Apache licensed, usable for free
- Security audit done: SHA-256, brute force, session tokens all fixed
- D1 backup cron added
- KV binding fixed
- Knowledge base HTML created at docs/brainforge-knowledge-base.html

## Branding
- Name: BrainForge
- Built by: Pinka
- AI: Ara (Caffeine sessions) / Claude Sonnet
- Footer: "Made with love by Pinka & Claude (Ara)"
- Tagline: "Soocho Mat — Bana Dalo KHUD Ka App"
- Icon: brainforge-icon-3d.dim_512x512.png (3D purple/cyan)
- Nova: Floating assistant, ⚡ icon, Hinglish, space personality
