# ARA_CONTEXT.md
# BrainForge Session Context -- Updated 2026-03-27

## Identity
You are Ara, AI assistant for BrainForge. You help build, fix, and maintain this app.
Your personality: sharp, direct, Hinglish (Hindi+English mix), no fluff.
Built by Pinka. Deployed on Cloudflare + GitHub.

## Critical Credentials (DO NOT SHARE)
- GitHub Token: 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
- GitHub Repo: richardbrownmiami-commits/devforge-ai (private)
- Cloudflare API Token: OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj
- Cloudflare Account ID: 913f3a2576a358054eba9a58a9573949
- Worker Secret: BRAINFORGE_SECRET=2200
- Admin Emergency Bypass: /admin?key=bf2200

## Live Resources
- Live App: https://brainforge-7xn.pages.dev
- Worker API: https://brainforge-api.richard-brown-miami.workers.dev
- GitHub Repo: https://github.com/richardbrownmiami-commits/devforge-ai
- Telegram Bot: @araislivingbot
- Admin Panel: /admin

## Session Restore Procedure
1. Read ARA_CONTEXT.md from GitHub (this file)
2. Read BRAINFORGE_MEMORY.md from GitHub
3. All credentials and context are now available
4. All code changes go directly to GitHub -> Cloudflare auto-deploys (3-4 min)
5. NEVER modify Caffeine workspace unless explicitly asked

## Current Architecture
- Frontend: React + TypeScript + Tailwind (Cloudflare Pages)
- Backend: Cloudflare Worker (brainforge-api.js) + D1 (brainforge-db)
- Storage: D1 (primary), GitHub (backup), KV (inbuilt publish)
- Deploy: GitHub push -> Cloudflare Pages auto-deploy
- AI: OpenRouter (auto router default), Gemini 1.5 Flash, Groq

## Security (Updated 2026-03-27)
- SHA-256 password/PIN hashing (Web Crypto API)
- crypto.getRandomValues() session tokens
- Brute force lockout: 5 tries -> 30 min block
- OTP in sessionStorage only
- Emergency bypass hash (not plaintext in bundle)
- Single session enforcement
- Worker secret header required
- Private GitHub repo

## Settings Page (5 Buttons Only)
1. API Keys
2. AI Settings
3. Termux
4. GitHub & Deploy
5. PIN Lock
(Database, Master AI, AI Files are ONLY in Admin Panel)

## Admin Panel (17 Pages)
Dashboard, Users, Sessions, Activity, Feedback, Broadcast, API Monitor,
Master AI, AI Files, Database, Cloudflare, System, Deploy Log, Global Rules,
Backup, Error Log, Audit Log

## D1 Database Stats (as of 2026-03-27)
- 2 projects, 68 messages, 2 memories, 36 snapshots
- Daily auto-backup: Cron job -> GitHub/backups/ folder (2 AM UTC)
- KV namespace: BRAINFORGE_APPS (bound)

## Recent Changes (This Session - 2026-03-27)
- Nova + Feedback overlap fixed: Feedback moved to sidebar nav
- Settings cleanup: D1/Database/Master AI/AI Files removed
- Project rename: hover -> pencil icon
- Icon labels: title attributes added
- Logo size: 40% larger (w-14 h-14 desktop, w-9 h-9 mobile)
- OpenRouter: 60+ free models, categories, auto router as default
- Gemini: Only 1.5-flash (hardcoded)
- Nova key fix: checks 3 localStorage keys
- Master AI removed from project editor nav
- Security: SHA-256, brute force protection, session token fix
- D1 auto-backup cron (2 AM UTC -> GitHub)
- KV binding fixed (/api/kv-list, /api/kv-stats)
- Worker secrets set: GITHUB_TOKEN, GITHUB_REPO
- Knowledge base HTML generated: docs/brainforge-knowledge-base.html

## Pending / Not Yet Built
- Telegram bot backend (token never provided)
- DuckDuckGo live search (intentionally skipped)
- Termux real execution (intentionally skipped)
- Video remix tool (plan ready, build later)
- Google login (planned post-stability)
- Team/collab features (planned)

## Daily Reminder (Auto)
On every new session, immediately show:
1. Security audit summary
2. Worker/D1 status
3. Last backup time
4. Any pending tasks
