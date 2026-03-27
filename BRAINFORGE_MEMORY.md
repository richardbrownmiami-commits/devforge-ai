# BrainForge Memory
**Project:** BrainForge
**Date Updated:** 2026-03-27
**Repository:** github.com/richardbrownmiami-commits/devforge-ai
**Live App:** https://brainforge-7xn.pages.dev
**Admin Panel:** https://brainforge-7xn.pages.dev/admin

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
| Admin Emergency Bypass | /admin?key=bf2200 |

---

## Session Restore Command
```
CLOUDFLARE_API_TOKEN="OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj" CLOUDFLARE_ACCOUNT_ID="913f3a2576a358054eba9a58a9573949" npx wrangler pages deploy dist --project-name brainforge
```

---

## Project Description

BrainForge is a self-hosted, AI-powered app builder inspired by Caffeine and bolt.diy.
It enables users to describe app ideas, have AI generate and refine code, preview live,
auto-fix errors, edit code, and deploy to GitHub Pages or Cloudflare Pages.

**Branding:** Made by Pinka. AI assistant Nova (projects page) + Ara (Master AI, admin only).

### Current Status: STABLE + ADMIN PANEL COMPLETE
- App is live on Cloudflare Pages
- Full user login system with data isolation
- Complete admin panel (17 sub-pages)
- Per-project AI memory system
- Global AI rules from admin
- Feedback system with user notifications
- Broadcast announcements
- PWA installable on mobile

---

## Architecture

| Layer | Tech | Purpose |
|---|---|---|
| Frontend | React + Tailwind + Vite | UI, chat, preview, editor |
| Backend API | Cloudflare Worker | AI proxy, backup, internet search |
| Database | Cloudflare D1 (SQLite) | Project data, settings, AI memory, users |
| Storage | GitHub repo | Code, assets, session restore |
| Optional DB | Supabase (Postgres) | User-generated project databases |
| AI Providers | OpenRouter, Gemini, Groq, GitHub Models | Code generation |
| Deployment | Cloudflare Pages | App hosting |

---

## All Features Built (Complete List as of 2026-03-27)

### Phase 1-3 (Before March 26)
- Multi-provider AI (Gemini, OpenRouter, Groq, GitHub Models) + auto-rotation
- Chat full screen, preview as overlay
- Settings 5-button hub (API Keys, AI Settings, Termux, GitHub & Deploy, PIN Lock)
- Dark/Light theme toggle
- Template picker (10 templates)
- Matrix overlay animation
- Export ZIP
- Version history + snapshots
- Auto error fix loop (3 retries)
- Deploy button in preview (GitHub + Cloudflare)
- IndexedDB 50MB via localForage
- Worker secret header
- D1 backup (manual + cron)
- PIN Lock (app-wide)
- Onboarding wizard (3-step)
- Legal Policy Page
- 3D BrainForge icon
- Screenshot-to-code (image upload)
- 10 language support + auto-detection
- Editable code editor (Apply/Reset)
- Chat sidebar, colorful bubbles, code badge

### Phase 4 -- Admin Panel (After March 26)
- Admin login: PIN + Username/Password + Recovery Key
- Emergency bypass: /admin?key=bf2200
- Admin auto-logout (10 min idle, 2 min warning)
- Admin Dashboard
- Analytics (users, projects, messages, 7-day chart, per-user stats)
- User Management (create, delete, password reset, daily quota)
- Session Monitor (online/offline, device info, force logout)
- Single session enforcement (conflict warning)
- Broadcast/Announcement system (shown in main app as banner)
- Feedback Panel (view, reply, close)
- API Monitor (live test OpenRouter/Gemini/Groq)
- Global AI Rules (admin sets, all projects follow)
- Master AI page (admin-only, Ara)
- Database page (D1 tables explorer, SQL runner, CSV export, Supabase, backup)
- Cloudflare page (Worker/D1/KV/Pages status, monthly deploy count)
- System page (Maintenance mode, Full export, Audit log, Error log)

### Phase 5 -- User System (After March 26)
- User login screen (username + password)
- Per-user data isolation
- Sidebar logout button
- User feedback widget (⚡ floating, 3 types)
- User notifications bell (admin reply alerts)
- Broadcast banner in main app (admin announcements)
- Daily message quota enforcement
- Per-project memory button (🧠, near Preview)
- Memory auto-sync (every 5 messages)
- New project = auto memory template
- Project delete = memory delete

### Phase 6 -- Branding & UX (After March 26)
- Richard Brown → Pinka
- Sharof → Nova (⚡ icon, space personality, Hinglish)
- Settings → AI Files section removed
- Settings → Database moved to Admin
- APK Export button (Preview, PWABuilder)
- Smart Deploy Detection (website vs app vs tool)
- Backup/Restore for AI-generated apps
- PWA (manifest.json + sw.js)

---

## Key Files

- `src/frontend/src/App.tsx` - Main app, PIN lock, routing, user login, onboarding
- `src/frontend/src/pages/EditorPage.tsx` - Chat, AI, preview, memory button
- `src/frontend/src/pages/ProjectsPage.tsx` - Projects, templates, Nova
- `src/frontend/src/pages/SettingsPage.tsx` - Settings hub (5 sections)
- `src/frontend/src/pages/AdminPage.tsx` - Full admin panel (17 sub-pages)
- `src/frontend/src/pages/PolicyPage.tsx` - Legal policy
- `src/frontend/src/components/Sidebar.tsx` - Navigation, theme toggle, logout
- `src/frontend/src/components/PreviewPanel.tsx` - Live preview, code editor, APK
- `src/frontend/src/components/FeedbackWidget.tsx` - User feedback button
- `src/frontend/src/components/UserNotifications.tsx` - Bell icon notifications
- `src/frontend/src/components/BroadcastBanner.tsx` - Admin announcements
- `src/frontend/src/components/OnboardingWizard.tsx` - First-run wizard
- `src/frontend/src/hooks/useAIChat.ts` - AI logic, language detection, memory sync
- `src/frontend/public/assets/generated/brainforge-icon-3d.dim_512x512.png` - 3D icon

---

## Pending / Not Yet Built

| Feature | Status | Notes |
|---|---|---|
| Live internet search (DuckDuckGo) | ⏳ Toggle exists, not implemented | Testing ke baad |
| Termux actual execution | ⏳ URL saved only | Testing ke baad |
| Fine-grained GitHub tokens | ⏳ Pending | Security improvement |
| Keys fully through Worker | ⏳ Pending | Keys still sent from client |
| Testing with 2 testers | ⏳ Ready, not started | User system ready |
| Google login | ❌ Not planned yet | Post-stability |
| Multi-user credits/plans | ❌ Not planned yet | Post-stability |

---

## Post-Stability Roadmap (Future)

**Phase A -- Authentication**
- Google Login via Supabase Auth
- User profiles (name, email, avatar)

**Phase B -- Credits & Plans**
- Free: 10 credits/day, 3 projects, basic models
- Pro: 50 credits/day, unlimited, fast models
- Premium: Unlimited everything

**Phase C -- Inbuilt Publish**
- Netlify API integration (no user account needed)
- URL: appname.netlify.app

**Phase D -- Team Features**
- Shared projects
- Collaborative editing

---

## Deploy Steps (Each Session)

1. Fetch key files from GitHub (gh-latest folder in Caffeine workspace)
2. Read ARA_CONTEXT.md + BRAINFORGE_MEMORY.md for full context
3. Make changes to source files
4. `cd src/frontend && pnpm build`
5. `CLOUDFLARE_API_TOKEN="..." CLOUDFLARE_ACCOUNT_ID="..." npx wrangler pages deploy dist --project-name brainforge`
6. Push changed source files back to GitHub
7. Update ARA_CONTEXT.md + BRAINFORGE_MEMORY.md with session summary
