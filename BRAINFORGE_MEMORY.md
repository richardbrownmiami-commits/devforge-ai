# BrainForge Memory
**Project:** BrainForge
**Date Updated:** March 26, 2026 (Session 2)
**Repository:** github.com/richardbrownmiami-commits/devforge-ai
**Live App:** https://brainforge-7xn.pages.dev

---

## Critical Credentials

| Item | Value |
|---|---|
| GitHub Token | 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 |
| GitHub Repo | richardbrownmiami-commits/devforge-ai |
| Cloudflare Account ID | 913f3a2576a358054eba9a58a9573949 |
| Cloudflare API Token | OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj |
| Cloudflare Worker URL | https://brainforge-api.richard-brown-miami.workers.dev |
| D1 Database | brainforge-db |
| Worker Secret | BRAINFORGE_SECRET=2200 |
| KV Namespace ID | c62f444539254734869f4fae5dc74755 |
| KV Binding Name | APPS_KV |
| Telegram Bot | @araislivingbot |

---

## Deploy Method (GitHub Actions -- Auto)

Push to `main` branch → GitHub Actions → Wrangler → Cloudflare Pages auto-deploy.
Workflow file: `.github/workflows/deploy.yml`
Secret: `CF_API_TOKEN` = Cloudflare API Token

---

## Session 2 Updates (March 26, 2026 -- Session 2)

### Features Built & Deployed

| Feature | Status |
|---|---|
| Admin Panel (full) -- Dashboard, Master AI, Status, Backup, Issues, Deploy Log, Notes | ✅ Live |
| Notes Page in Admin -- 5 pre-loaded notes (roadmap, security, issues, ideas) | ✅ Live |
| Admin panel Notes page -- all planning context saved | ✅ Live |
| Worker fix -- health check `/health` → `/api/stats`, header `x-secret` → `X-BrainForge-Secret` | ✅ Fixed |
| D1 status fix -- was stuck because Worker was offline | ✅ Fixed |
| KV Inbuilt Publish -- users can publish apps to `brainforge-7xn.pages.dev/p/slug` | ✅ Live |
| KV Namespace ID added to wrangler.toml | ✅ Done |
| Worker KV routes: POST/GET/DELETE `/api/publish` + `GET /p/:slug` | ✅ Live |
| ProjectsPage -- interactive cards (colored, initials avatar, lang badge, spring animation, search) | ✅ Live |
| Templates -- 9 templates (added: Todo, Portfolio, Expense Tracker, Notes App) | ✅ Live |
| Logo bigger (w-7 → w-10) in sidebar | ✅ Done |
| Neon tagline in sidebar: "Soocho Mat — Bana Dalo / KHUD Ka App ⚡" | ✅ Done |
| AI Training -- data detection + Supabase rules in `rules/project-ai-rules.md` | ✅ Done |
| localStorage warning banner in EditorPage when Supabase not connected | ✅ Done |
| AI system prompt (useAIChat.ts) -- data detection + warning banner injection | ✅ Done |
| Master AI -- all new free models added (DeepSeek V3.2, Kimi K2.5, Step 3.5, etc.) | ✅ Done |
| Master AI HQ Mode -- 3 models parallel + judge AI picks best | ✅ Live |
| Feature Suggest system -- "Suggest" button in chat → AI suggests 5 project features | ✅ Live |

---

## Session 1 Updates (March 26, 2026)

### Features Built & Deployed Today

| Feature | Status |
|---|---|
| Onboarding Wizard (3-step: Welcome, API Key, Ready) | ✅ Live |
| Real Deploy Flow (Cloudflare Pages + GitHub Pages wizard) | ✅ Live |
| Settings footer: "Made with love by Richard Brown & Claude (Ara)" | ✅ Live |
| Legal Policy Page (IP, permitted use, prohibited use + legal action) | ✅ Live |
| 3D BrainForge icon (brain + circuit + lightning, purple/cyan) | ✅ Live |
| Sidebar + favicon updated with 3D icon | ✅ Live |
| Screenshot-to-code (Figma-like image upload) | ✅ Live |
| Supabase integration for project databases | ✅ Live |
| 10 language support (HTML, React, TS, Python, SQL, Markdown, p5.js, Three.js, Chart.js) | ✅ Live |
| Auto language detection (single AI call) | ✅ Live |
| Auto error fix loop | ✅ Live |
| Editable code editor with Apply/Reset | ✅ Live |
| GitHub Actions auto-deploy workflow | ✅ Live |

---

## Current Architecture

| Layer | Tech | Purpose |
|---|---|---|
| Frontend | React + Tailwind + Vite | UI, chat, preview, editor |
| Backend API | Cloudflare Worker | AI proxy, backup, search, KV publish |
| Database | Cloudflare D1 (SQLite) | Project data, settings, AI memory |
| KV Storage | Cloudflare KV (`APPS_KV`) | Inbuilt published apps storage |
| Storage | GitHub repo | Code, assets, session restore |
| Optional DB | Supabase (Postgres) | User project databases |
| AI Providers | OpenRouter, Gemini, Groq | Code generation |
| Deployment | Cloudflare Pages (via GitHub Actions) | App hosting |

---

## Key Files

- `src/frontend/src/App.tsx` -- Main app, PIN lock, routing, admin routes
- `src/frontend/src/pages/EditorPage.tsx` -- Chat, AI, preview, suggest, Supabase warning
- `src/frontend/src/pages/ProjectsPage.tsx` -- Interactive project cards, 9 templates
- `src/frontend/src/pages/SettingsPage.tsx` -- Settings hub (8 sections)
- `src/frontend/src/pages/admin/` -- Full admin panel (7 pages)
- `src/frontend/src/components/Sidebar.tsx` -- Navigation, neon tagline
- `src/frontend/src/components/ChatPanel.tsx` -- Chat UI, Suggest button
- `src/frontend/src/hooks/useAIChat.ts` -- AI logic, language detection, data detection
- `cloudflare-worker/index.js` -- Worker API + KV publish routes
- `cloudflare-worker/wrangler.toml` -- KV namespace binding
- `rules/project-ai-rules.md` -- AI training rules for data detection
- `.github/workflows/deploy.yml` -- Auto-deploy workflow

---

## Unresolved Issues

| Priority | Issue |
|---|---|
| 🟠 Medium | API keys in localStorage -- visible in DevTools (Worker routing planned) |
| 🟠 Medium | Cloudflare Pages direct-upload mode -- can't switch to Git-connected |
| 🟡 Low | Free AI models can change/rate-limit anytime (auto-rotation mitigates) |
| 🟡 Low | Multi-user / Google login (post-stability roadmap) |
| 🟡 Low | Figma/image-to-code -- basic, full import not done |
| 🟡 Low | Team/collab features -- not present |

---

## Post-Stability Roadmap

**Phase A:** Google Login (Supabase Auth)
**Phase B:** Admin dashboard (user management, credits)
**Phase C:** Credits & Plans (Free/Pro/Premium)
**Phase D:** Inbuilt Publish improvement (Netlify fallback)
**Phase E:** Support page, contact form

---

## Session Restore Prompt (Paste at start of new session)
```
BrainForge project restore.
GitHub: richardbrownmiami-commits/devforge-ai
Token: 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
Live: brainforge-7xn.pages.dev
Worker: https://brainforge-api.richard-brown-miami.workers.dev
CF Account: 913f3a2576a358054eba9a58a9573949
CF API Token: OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj
KV ID: c62f444539254734869f4fae5dc74755
Deploy: GitHub Actions auto-deploy on push to main.
Admin: brainforge-7xn.pages.dev/#/admin
Context files: BRAINFORGE_MEMORY.md, BRAINFORGE_CONTEXT.md on GitHub.
```
