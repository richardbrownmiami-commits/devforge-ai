# BrainForge Memory
**Project:** BrainForge
**Date Updated:** March 26, 2026
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
| Cloudflare Worker | brainforge-api |
| Worker URL | https://brainforge-api.richard-brown-miami.workers.dev |
| D1 Database | brainforge-db |
| Worker Secret | BRAINFORGE_SECRET=2200 |
| Telegram Bot | @araislivingbot |
| Portrait Image | https://i.imgur.com/jLXabP8.png |

---

## Session Restore Command
```
CLOUDFLARE_API_TOKEN="OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj" CLOUDFLARE_ACCOUNT_ID="913f3a2576a358054eba9a58a9573949" npx wrangler pages deploy dist --project-name brainforge
```

---

## March 26, 2026 -- Session Updates

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
| 10 language support (HTML, React, React+TW, TS, Python, SQL, Markdown, p5.js, Three.js, Chart.js) | ✅ Live |
| Auto language detection (Option B: single AI call) | ✅ Live |
| Auto error fix loop (Phase 2) | ✅ Live |
| Editable code editor with Apply/Reset (Phase 3) | ✅ Live |
| Chat sidebar, colorful bubbles, code badge | ✅ Live |

### Post-Stability Roadmap (Future -- After App Stable)

**Phase A -- Authentication**
- Google Login via Supabase Auth + Google OAuth
- User profiles (name, email, avatar)

**Phase B -- Admin Panel**
- Owner-only dashboard (Richard)
- User management, usage stats, announcements
- All published apps list

**Phase C -- Credits & Plans**
- Free: 10 credits/day, 3 projects, basic models
- Pro: 50 credits/day, unlimited projects, fast models, inbuilt publish
- Premium: Unlimited everything

**Phase D -- Inbuilt Publish**
- Netlify API integration (no user account needed)
- URL: appname.netlify.app
- Published gallery in Supabase

**Phase E -- Support**
- Contact form → Supabase
- FAQ page
- In-app bug report

---

## Project Description

BrainForge is a self-hosted, AI-powered app builder inspired by Caffeine and bolt.diy.
It enables users to describe app ideas, have AI generate and refine code (HTML/CSS/JS/React/Python/SQL/Three.js/Chart.js/p5.js/Markdown/TypeScript),
preview live, auto-fix errors, edit code, and deploy to GitHub Pages or Cloudflare Pages.

### Current Status: STABLE
- App is live on Cloudflare Pages
- All Phase 1, 2, 3 features deployed
- 10 language support with auto-detection
- 4 AI providers with auto-rotation
- Onboarding wizard for new users
- Real deploy wizard (GitHub Pages + Cloudflare Pages)
- Legal policy page
- 3D branded icon

---

## Architecture

| Layer | Tech | Purpose |
|---|---|---|
| Frontend | React + Tailwind + Vite | UI, chat, preview, editor |
| Backend API | Cloudflare Worker | AI proxy, backup, internet search |
| Database | Cloudflare D1 (SQLite) | Project data, settings, AI memory |
| Storage | GitHub repo | Code, assets, session restore |
| Optional DB | Supabase (Postgres) | User-generated project databases |
| AI Providers | OpenRouter, Gemini, Groq, GitHub Models | Code generation |
| Deployment | Cloudflare Pages | App hosting |

---

## Key Files

- `src/frontend/src/App.tsx` - Main app, PIN lock, routing, onboarding
- `src/frontend/src/pages/EditorPage.tsx` - Chat, AI, preview, deploy wizard
- `src/frontend/src/pages/ProjectsPage.tsx` - Project list, templates
- `src/frontend/src/pages/SettingsPage.tsx` - Settings hub (8 sections)
- `src/frontend/src/pages/PolicyPage.tsx` - Legal policy
- `src/frontend/src/components/Sidebar.tsx` - Navigation, theme toggle
- `src/frontend/src/components/PreviewPanel.tsx` - Live preview, code editor
- `src/frontend/src/components/OnboardingWizard.tsx` - First-run wizard
- `src/frontend/src/components/DeployWizard.tsx` - Deploy to CF/GitHub
- `src/frontend/src/hooks/useAIChat.ts` - AI chat logic, language detection
- `src/frontend/public/assets/generated/brainforge-icon-3d.dim_512x512.png` - 3D app icon

---

## Deploy Steps (Each Session)

1. Fetch key files from GitHub
2. Make changes
3. `cd src/frontend && pnpm build`
4. `CLOUDFLARE_API_TOKEN="..." CLOUDFLARE_ACCOUNT_ID="..." npx wrangler pages deploy dist --project-name brainforge`
5. Push changed source files back to GitHub

