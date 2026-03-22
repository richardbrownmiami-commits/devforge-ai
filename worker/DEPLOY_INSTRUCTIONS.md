# BrainForge Worker -- Deploy Instructions

## Worker Details
- **Name:** brainforge-api
- **URL:** https://brainforge-api.richard-brown-miami.workers.dev
- **Account ID:** 913f3a2576a358054eba9a58a9573949
- **Secret Header:** X-BrainForge-Secret: 2200
- **Live App:** https://brainforge-7xn.pages.dev

---

## How to Redeploy Worker

The Worker code is saved in `worker/brainforge-api.js` in this repo.

### Method 1 -- Via Cloudflare Dashboard
1. Go to dash.cloudflare.com → Workers & Pages
2. Click `brainforge-api`
3. Click Edit Code
4. Paste the content of `worker/brainforge-api.js`
5. Click Save and Deploy

### Method 2 -- Via AI (Caffeine/Claude)
Tell the AI:
> "Redeploy the BrainForge Worker from the backup file in GitHub"

Provide the credentials from BRAINFORGE_MEMORY.md and the AI will redeploy automatically.

---

## D1 Database Tables

Run these SQL statements to recreate all tables if lost:

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template TEXT DEFAULT 'blank',
  live_url TEXT,
  github_repo TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS ai_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT,
  type TEXT DEFAULT 'project',
  content TEXT NOT NULL,
  updated_at TEXT
);
```

---

## Environment Bindings Required

| Binding | Type | Value |
|---|---|---|
| DB | D1 Database | brainforge-db ID from Cloudflare dashboard |

---

## Security
- All endpoints require header: `X-BrainForge-Secret: 2200`
- CORS: open (*) for frontend use
- GitHub token stored in localStorage on frontend, never in Worker

---

## AI Providers Used

| Provider | Models | Key Storage |
|---|---|---|
| Google Gemini | gemini-1.5-flash, gemini-pro | localStorage |
| OpenRouter | Free models | localStorage |
| Groq | Llama 3.3, Qwen3, Kimi | localStorage |
| GitHub Models | GPT-4o, DeepSeek | localStorage |

Auto-rotation: when one provider hits rate limit, next is tried automatically.

---

## Telegram Bot
- Bot: @araislivingbot
- Also runs on Cloudflare Workers
- Uses free models via OpenRouter
- Full Ara context/rules loaded from GitHub on each request
