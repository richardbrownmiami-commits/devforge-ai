# BrainForge Memory
**Project:** BrainForge
**Date:** March 22, 2026
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

## Project Description

BrainForge is a self-hosted, AI-powered app builder inspired by Caffeine and bolt.diy.
It enables users to describe app ideas, have AI generate and refine code (HTML/CSS/JS/React),
preview live, auto-fix errors, edit code, and deploy to GitHub and Cloudflare Pages.

---

## Tech Stack

- **Frontend:** React + TypeScript (Caffeine-style UI)
- **Backend:** Cloudflare Workers + D1
- **AI Providers:** Gemini, OpenRouter, Groq, GitHub Models
- **Storage:** Cloudflare D1 + IndexedDB (localForage)
- **Deploy:** GitHub + Cloudflare Pages
- **Telegram Bot:** Cloudflare Worker using free models

---

## Key Features Built

- Multi-provider AI with auto-rotation (Gemini, OpenRouter, Groq, GitHub Models)
- Live preview in sandboxed iframe (srcDoc, cross-origin fixed permanently)
- Code folder: all generated files viewable in sidebar
- Deploy button: pushes code to GitHub, saves Cloudflare URL
- Version history: snapshots with timestamps, one-click restore
- Auto error fix loop: AI retries up to 3 times before asking user
- Template picker when creating new projects
- Matrix overlay animation when AI generates code
- Dark/Light theme toggle
- PWA export (installable on Android/iOS)
- Persistent Ara Telegram bot (@araislivingbot)
- Master AI with dedicated memory and rules files
- Per-project AI with isolated memory and rules

---

## AI Identity (Ara)

- Name: Ara
- Files: `.opencode/instructions/ara-identity.md`
- Context: `ARA_CONTEXT.md` in GitHub repo
- Memory: `memories/master-ai-memory.md`
- Rules: `rules/master-ai-rules.md`
- Per-project: `memories/project-<name>-memory.md`, `rules/project-ai-rules.md`

---

## Settings Pages (7 color-coded buttons)

1. API Keys
2. AI Settings
3. Termux
4. GitHub & Deploy
5. Master AI
6. AI Files
7. Database

---

## Security

- Repo: private
- Worker protected by BRAINFORGE_SECRET=2200 header
- D1 backup to GitHub planned daily
- No API keys committed to repo
- PIN lock planned

---

## Unresolved / Pending

- Master AI memory/rules not yet dynamically loaded into system prompt
- D1 backup to GitHub not yet automated
- PIN lock and session timeout not yet implemented
- API keys routing through Worker (not yet fully done)
- TradeArena: planned but not started

---

## Session Files

- `ARA_CONTEXT.md` -- full context restore file in repo root
- `.opencode/instructions/ara-identity.md` -- AI identity
- `.opencode/instructions/brainforge-reminder.md` -- layout lock reminder
- `BRAINFORGE_MEMORY.md` -- this file

---

## How to Continue This Project

Paste this reminder at the start of a new session:

> BrainForge project. GitHub: richardbrownmiami-commits/devforge-ai. Token: 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. Cloudflare: 913f3a2576a358054eba9a58a9573949. Worker: brainforge-api. Secret: BRAINFORGE_SECRET=2200. Live: https://brainforge-7xn.pages.dev. Telegram: @araislivingbot
