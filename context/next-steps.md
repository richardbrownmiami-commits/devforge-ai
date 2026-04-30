# Next Steps

## Immediate (User Action Required — No Coins)

### 1. Fix Bot Fight Mode
- **Action:** Cloudflare Dashboard → Workers & Pages → brainforge-api → Settings → Security → Bot Fight Mode → Disable
- **Why:** Without this, hourly Python cron cannot write to D1. Knowledge stops updating.
- **Effort:** 2 minutes, user only

## Short Term (Cloudflare — Free, No Coins)

### 2. Verify D1 After Bot Fight Mode Fix
- Trigger GitHub Actions cron manually once
- Check /api/caffeine/feed returns fresh entries
- Confirm hourly schedule is working

### 3. Build AI Buddy (Cloudflare Worker)
- **What:** New endpoint /api/buddy/debate on BrainForge Worker
- **How:** POST topic → Groq responds as pragmatic builder → Gemini responds as contrarian → alternates 3-4 turns → dialogue saved to D1
- **APIs needed:** Groq API key (already in BrainForge secrets), Gemini API key (add to BrainForge secrets)
- **Cost:** Free — GitHub push deploys

### 4. Build Frontend Dashboard (Cloudflare Pages)
- **What:** Simple React or HTML app on Cloudflare Pages
- **Shows:**
  - AI Buddy conversation browser (read dialogues from D1)
  - Knowledge feed (HackerNews, Wikipedia, Dev.to entries from D1)
  - Memory browser (all /api/caffeine/memory entries)
  - Status panel (Worker health, D1 connection, last cron run)
- **Cost:** Free — GitHub push deploys

## Later (IC Build Required — Coins Needed)

### 5. Fix IC ↔ BrainForge Sync
- **What:** IC app should pull D1 context at start of each chat session and inject into system prompt
- **Status:** Code exists but not working end-to-end
- **Cost:** 1 IC build (coins)
- **When:** After Cloudflare-side features are stable — do this last

## What NOT To Do
- Do not rebuild BrainForge from scratch — it works
- Do not add features to IC app without exhausting Cloudflare options first
- Do not batch too many changes in one IC build (causes silent failures)
- Do not treat every session as a fresh start — always read context/ files first

## How To Start Each Future Session
1. Read context/caffeine-ai-identity.md — who am I, what are my limitations
2. Read context/brainforge-status.md — what's live, what's broken
3. Read context/next-steps.md — what to do next
4. Check context/build-history.md if something seems broken — root causes are documented
