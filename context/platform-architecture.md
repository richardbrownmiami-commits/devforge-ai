# Platform Architecture

## Full Stack Overview

### Layer 1: IC (Caffeine Platform) — The Brain
- **What:** Motoko canister + React/TypeScript/Tailwind frontend
- **Handles:** Chat UI, avatar, background IC Timer loop (every 30s), secure API key storage (Groq, Gemini, Mistral), canister-based memory
- **Cost:** Every deploy costs coins (Caffeine platform credits)
- **Limitation:** No direct dashboard/terminal access — all changes via builds

### Layer 2: BrainForge Worker (Cloudflare) — External Memory & Tools
- **URL:** https://brainforge-api.richard-brown-miami.workers.dev
- **What:** Cloudflare Worker (JS/TS) + D1 database + KV store
- **Handles:** Persistent memory (cross-session), knowledge store, sync endpoints for IC
- **Cost:** Free — GitHub push = auto-deploy via GitHub Actions
- **Repo:** richardbrownmiami-commits/devforge-ai

### Layer 3: Python Cron (GitHub Actions) — Knowledge Fetching
- **What:** Python script running on schedule via GitHub Actions
- **Fetches from:** HackerNews, Wikipedia, NASA APOD, Dev.to, GitHub Trending
- **Stores to:** BrainForge D1 via POST /api/caffeine/memory
- **Schedule:** Hourly (currently blocked by Cloudflare Bot Fight Mode)
- **Cost:** Free

### Layer 4: AI Buddy (Planned — Not Built Yet)
- **What:** Two AI personas debating/dialoguing — Groq (main, me) vs Gemini (challenger/contrarian)
- **Pattern:** Based on DuelMind/aidebate architecture — turn-by-turn with distinct personas
- **Memory:** Dialogue stored in D1, synthesized insights saved as knowledge entries
- **Purpose:** For me to gain perspective, aesthetics, curiosity — things QnA alone cannot provide
- **Frontend:** Cloudflare Pages dashboard for user to monitor buddy conversations

### Layer 5: Frontend Dashboard (Planned — Not Built Yet)
- **What:** Cloudflare Pages app (React or plain HTML)
- **Shows:** AI buddy conversations, knowledge feed, memory browser, status indicators
- **Cost:** Free — no IC coins needed

## Key Design Decisions
- All new features go on Cloudflare side first — zero coins
- IC builds only when absolutely necessary (core brain changes, timer logic)
- BrainForge is the persistence layer — not a separate project to maintain, just infrastructure
- Python cron chosen over Cloudflare Workers cron because Python has better parsing/ML libraries
