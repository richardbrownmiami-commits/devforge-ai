# BrainForge Handbook
**Version:** 1.0 | **Updated:** March 2026 | **Live:** https://brainforge-7xn.pages.dev

---

## What is BrainForge?

BrainForge is a self-hosted, AI-powered app builder. You describe what you want to build, and the AI writes the code, lets you preview it live, and deploys it to GitHub + Cloudflare Pages -- all from your phone or browser.

---

## Quick Start

1. Open https://brainforge-7xn.pages.dev
2. Go to **Settings > API Keys** and add at least one AI key (OpenRouter recommended -- free)
3. Go to **Settings > GitHub & Deploy** and add your GitHub token and repo
4. Tap **New Project**, pick a template, and start chatting

---

## Settings Reference

| Button | What it does |
|---|---|
| **API Keys** | Add OpenRouter, Gemini, Groq, or GitHub Models keys |
| **AI Settings** | Choose provider (auto/openrouter/gemini/groq/github) and model |
| **Termux Brain** | Connect your Android phone running a local AI server |
| **GitHub & Deploy** | Set token + repo for code deployment |
| **Master AI** | AI that controls BrainForge itself (not your projects) |
| **AI Files** | View and edit AI memory + rules per project |
| **Database** | Storage usage, export, D1 backup |
| **PIN Lock** | Set a 4-6 digit PIN to lock the app |

---

## AI Providers

BrainForge supports 4 providers with auto-rotation (tries each in order if rate-limited):

| Provider | Free tier | Best for |
|---|---|---|
| **OpenRouter** | Yes (100+ models) | Code generation, default |
| **Gemini** | Yes (1M tokens/day) | Long context, multimodal |
| **Groq** | Yes (ultra-fast) | Speed, quick fixes |
| **GitHub Models** | Yes (with GitHub account) | GPT-4o, advanced reasoning |

**How to get keys:**
- OpenRouter: https://openrouter.ai/keys
- Gemini: https://aistudio.google.com/app/apikey
- Groq: https://console.groq.com/keys
- GitHub: Create a Personal Access Token at https://github.com/settings/tokens

---

## Master AI

Master AI is a dedicated AI that controls BrainForge itself -- it can read and rewrite BrainForge source files via GitHub.

**To use:**
1. Settings > Master AI
2. Toggle **Enable Master AI** on
3. Click **Load Memory from GitHub** (auto-loads on page open)
4. Type what you want to change about BrainForge
5. Master AI returns a file to push -- review and click **Push to GitHub**

**Voice Output:**
- Toggle **Voice Output** on in Master AI settings
- Choose EN (English, deep robotic) or HI (Hindi)
- Master AI speaks every response aloud

**Rules:**
- Master AI ONLY modifies BrainForge source files
- It will NOT help with your app projects
- All pushes require confirmation before going live

---

## Deploying Projects

1. Open any project
2. Chat with AI to generate code
3. Click **Preview** to see it live in the browser
4. In the Preview overlay, click **Deploy** to push to GitHub + Cloudflare

Your project gets a live URL automatically via Cloudflare Pages.

---

## PIN Lock

1. Settings > PIN Lock
2. Toggle **Enable PIN Lock** on
3. Set a 4-6 digit PIN
4. Set **Session Timeout** (minutes of inactivity before locking)
5. Click **Set PIN**

On next app open, a lock screen appears. Enter your PIN to continue.

---

## D1 Database Backup

**Manual backup:**
1. Settings > Database > **Backup D1 to GitHub Now**
2. A JSON snapshot is pushed to `backup/d1-backup-YYYY-MM-DD.json` in your repo

**Automatic backup:**
- The Cloudflare Worker runs a daily cron at 2am UTC
- Requires `GITHUB_TOKEN` and `GITHUB_REPO` env vars set in Cloudflare dashboard

---

## AI Memory System

Each project has its own AI memory and rules:
- **Memory:** What the AI remembers about the project
- **Rules:** What the AI is/isn't allowed to do

View and edit these in **Settings > AI Files**.

Master AI has its own memory at `memories/master-ai-memory.md` in GitHub. It auto-updates after every response.

---

## Session Restore

If Caffeine resets the workspace, restore from GitHub:
```
BrainForge project. GitHub: richardbrownmiami-commits/devforge-ai. Token: [your-token]. Live: https://brainforge-7xn.pages.dev
```

All source code, context files, and Worker code are in the GitHub repo.

---

## Security Checklist

- [ ] GitHub repo set to **private**
- [ ] Cloudflare Worker protected by `BRAINFORGE_SECRET=2200`
- [ ] API keys stored in localStorage only (never committed to repo)
- [ ] PIN lock enabled for app access
- [ ] D1 backup running daily to GitHub

---

## Cloudflare Worker API Endpoints

Base URL: `https://brainforge-api.richard-brown-miami.workers.dev`
Required header: `X-BrainForge-Secret: 2200`

| Endpoint | Method | Description |
|---|---|---|
| `/api/stats` | GET | Database row counts |
| `/api/projects` | GET | All projects |
| `/api/projects` | POST | Save/update project |
| `/api/projects/:id` | DELETE | Delete project |
| `/api/chat` | GET | Chat history for a project |
| `/api/chat` | POST | Save a message |
| `/api/memory` | GET | Get AI memory by key |
| `/api/memory` | POST | Save AI memory |
| `/api/backup` | GET | Export all D1 data as JSON |
| `/api/backup` | POST | Push D1 snapshot to GitHub |
| `/api/ai` | POST | AI proxy (routes to provider) |
| `/api/search` | GET | DuckDuckGo web search |

---

## Troubleshooting

**"No API keys configured"**
→ Go to Settings > API Keys and add at least one key

**Preview shows blank**
→ The generated code may have errors. Ask the AI to fix it.

**Deploy fails**
→ Check Settings > GitHub & Deploy -- verify token has `repo` scope

**Worker returns 403**
→ The secret header is missing or wrong. Check BRAINFORGE_SECRET in Worker env.

**Master AI not responding**
→ Check that at least one API key is set and Master AI is toggled on

---

*BrainForge is self-hosted and fully independent. All data lives in your GitHub repo and Cloudflare D1. You own everything.*
