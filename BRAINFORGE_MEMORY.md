# BrainForge Memory
**Project:** BrainForge
**Date Updated:** March 26, 2026 (Session 3)
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
| D1 Database | brainforge-db (ID: 3814a86b-7054-465c-ae64-8bf99019cf6b) |
| Worker Secret | BRAINFORGE_SECRET=2200 |
| KV Namespace ID | c62f444539254734869f4fae5dc74755 |
| KV Binding Name | APPS_KV |
| Telegram Bot | @araislivingbot |
| Admin Emergency | https://brainforge-7xn.pages.dev/admin?key=bf2200 |

---

## Session 3 Updates (March 26, 2026)

### Features Built & Deployed

| Feature | Status |
|---|---|
| User login system (username/password) | ✅ Live |
| Single session enforcement + conflict warning | ✅ Live |
| Admin session monitor (Sessions tab in Users page) | ✅ Live |
| Admin force logout per user | ✅ Live |
| Database moved to Admin panel (D1 + Supabase + SQL runner) | ✅ Live |
| AI Rules moved to Admin panel (global, all projects follow) | ✅ Live |
| AI Memory moved to project editor (near Preview button) | ✅ Live |
| Memory auto-created on new project, deleted on project delete | ✅ Live |
| Memory auto-sync every 5 messages | ✅ Live |
| Admin memories view (read-only, per user per project) | ✅ Live |
| Nova assistant (renamed from Sharof, ⚡ purple button) | ✅ Live |
| Pinka branding (renamed from Richard Brown) | ✅ Live |
| Cloudflare status page (Worker/D1/KV/Pages + monthly deploys) | ✅ Live |
| Enhanced D1 page (tables explorer + SQL runner + CSV export) | ✅ Live |
| Analytics page (users/projects/messages/activity chart) | ✅ Live |
| Broadcast page + user notification banner | ✅ Live |
| API Keys Monitor (live test per provider) | ✅ Live |
| System page (Maintenance + Export + Audit Log + Error Log) | ✅ Live |
| Maintenance mode (admin toggle, users see maintenance screen) | ✅ Live |
| User quotas (daily message limit + max projects per user) | ✅ Live |
| Global error logging (JS errors auto-captured) | ✅ Live |
| Settings cleaned up (5 buttons, dead code removed) | ✅ Done |

---

## Session 2 Updates (March 26, 2026)

| Feature | Status |
|---|---|
| Admin Panel (17 pages total) | ✅ Live |
| KV Inbuilt Publish (/p/slug) | ✅ Live |
| Master AI HQ Mode (3 models + judge) | ✅ Live |
| Feature Suggest button in editor | ✅ Live |
| 9 Templates | ✅ Live |
| Neon tagline in sidebar | ✅ Live |
| PWA (installable) + APK Export | ✅ Live |
| Smart Deploy Detection | ✅ Live |
| Backup/Restore in AI-generated apps | ✅ Live |
| Admin PIN + Email/Password + Recovery Key login | ✅ Live |
| Admin emergency bypass (?key=bf2200) | ✅ Live |
| Admin 10-min idle auto-logout | ✅ Live |

---

## Session 1 Updates (March 26, 2026)

| Feature | Status |
|---|---|
| Onboarding Wizard | ✅ Live |
| Real Deploy Flow (Cloudflare + GitHub Pages) | ✅ Live |
| Legal Policy Page | ✅ Live |
| 3D BrainForge icon | ✅ Live |
| Screenshot-to-code | ✅ Live |
| Supabase integration | ✅ Live |
| 10 language support + auto-detection | ✅ Live |
| Auto error fix loop | ✅ Live |
| Editable code editor | ✅ Live |
| GitHub Actions auto-deploy | ✅ Live |

---

## Pending / Not Yet Built

| Feature | Notes |
|---|---|
| DuckDuckGo live search | Toggle exists in settings, not wired to AI |
| Termux execution | URL saved, no actual command execution |
| Google login | Decided to skip for testing phase |
| Inbuilt publish (no GitHub) | Planned for later |
| Multi-user full isolation | Basic user system exists, D1 sync pending |

---

## Architecture Notes

- All user data in localStorage (user-scoped keys: bf_projects_username)
- AI memory: localStorage key `bf_memory_<username>_<projectname>`
- Global AI rules: localStorage key `bf_global_ai_rules`
- Sessions: localStorage `bf_session_<username>` + sessionStorage token
- Announcements: localStorage `bf_announcements`
- Error log: localStorage `bf_error_log`
- Audit log: localStorage `bf_admin_audit_log`
- Quotas: user object has dailyMessageLimit + maxProjects fields
- D1 is primary backend (via Cloudflare Worker)
- No real-time sync between users (localStorage only)
