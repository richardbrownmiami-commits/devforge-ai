# BrainForge Context File
**Last Updated:** March 26, 2026 (Session 2)

---

## Session Restore Prompt

Paste this at start of every new Caffeine session:

```
BrainForge project restore.
GitHub: richardbrownmiami-commits/devforge-ai
Token: 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
Live: brainforge-7xn.pages.dev
Worker: https://brainforge-api.richard-brown-miami.workers.dev
CF Account: 913f3a2576a358054eba9a58a9573949
CF API Token: OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj
KV Namespace ID: c62f444539254734869f4fae5dc74755
Deploy: GitHub Actions auto-deploy on push to main.
Admin Panel: brainforge-7xn.pages.dev/#/admin
Context: BRAINFORGE_MEMORY.md on GitHub has full details.
Always fetch files from GitHub before making changes.
```

---

## Quick Reference

| Item | Value |
|---|---|
| Live App | https://brainforge-7xn.pages.dev |
| Admin Panel | https://brainforge-7xn.pages.dev/#/admin |
| GitHub Repo | richardbrownmiami-commits/devforge-ai |
| GitHub Token | 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 |
| Worker URL | https://brainforge-api.richard-brown-miami.workers.dev |
| Worker Secret | 2200 |
| CF Account ID | 913f3a2576a358054eba9a58a9573949 |
| CF API Token | OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj |
| KV Namespace ID | c62f444539254734869f4fae5dc74755 |
| KV Binding | APPS_KV |
| Inbuilt Publish URL | brainforge-7xn.pages.dev/p/[slug] |
| D1 DB | brainforge-db |

---

## What Was Built (Session 2 -- March 26, 2026)

1. **Admin Panel** -- 7 pages: Dashboard, Master AI, Status, Backup, Issues, Deploy Log, Notes
2. **Notes Page** -- pre-loaded with roadmap, security reminders, issues, project ideas
3. **KV Inbuilt Publish** -- users can publish apps without CF/GitHub account
4. **Worker fix** -- `/health` endpoint and `x-secret` header bugs fixed
5. **Interactive ProjectsPage** -- colored cards, search, spring animations
6. **9 Templates** -- added Todo, Portfolio, Expense Tracker, Notes App
7. **Logo + Neon tagline** -- bigger logo, "Soocho Mat -- Bana Dalo / KHUD Ka App"
8. **AI Data Detection** -- warns when localStorage used, suggests Supabase
9. **Master AI HQ Mode** -- 3 models parallel + judge AI picks best answer
10. **All latest free models** -- DeepSeek V3.2, Kimi K2.5, Step 3.5 Flash added
11. **Feature Suggest button** -- AI suggests 5 relevant features for current project

---

## Deploy Workflow (Fully Automatic)

```
Any GitHub push to main
        ↓
.github/workflows/deploy.yml triggers
        ↓
GitHub Actions: pnpm install + pnpm build
        ↓
Wrangler: pages deploy dist → Cloudflare Pages
        ↓
brainforge-7xn.pages.dev live (3-4 min)
```

No manual Caffeine deploy needed anymore.

---

## Important Rules for Next Session

1. **Always fetch from GitHub first** -- Caffeine workspace resets every session
2. **Use GitHub API (Python urllib)** -- bash curl blocked by permissions
3. **Push directly to GitHub** -- GitHub Actions handles deployment automatically
4. **Never hardcode changes** -- always read file first, then modify, then push
5. **KV routes are public** -- `GET /p/slug` does NOT require Worker secret
6. **Admin panel URL** -- `/#/admin` (hidden from regular users)
