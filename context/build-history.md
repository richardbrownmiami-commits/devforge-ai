# Build History

## IC Builds (Used Coins)

### Build 1: KAI Main Platform (Multiple cycles)
- **What:** Full KAI app — chat, avatar, background loop, multi-AI fallback, skill system
- **Issues found:** Hollow features, demo data masking bugs, canister ID not wired, IC Timer not auto-starting, mobile view broken, Gemini key exposed in frontend, double Groq calls
- **Status:** Multiple QA cycles, many issues fixed, some persistent

### Build 2: Caffeine AI Page (IC)
- **What:** Added "Caffeine AI" page inside KAI — chat panel, avatar, status panel, memory panel
- **Status:** Preview built, coins used. IC-based, so inherits IC limitations.

### Build 3: BrainForge Sync + Background Learning
- **What:** Wired BrainForge D1 sync into IC app, background loop pulls from BrainForge, Proposals page real data, Prompt editor layers visible
- **Status:** Preview built, coins used. D1 shows "no memory found" in live chat — sync not fully working.

## Cloudflare Deploys (Free — No Coins)

### Deploy 1: BrainForge Worker — Caffeine Endpoints
- **What:** Added /api/caffeine/* endpoints to BrainForge Worker
- **Status:** ✅ Live and working

### Deploy 2: BrainForge Worker — Knowledge APIs
- **What:** Added feed, context, personality, learn endpoints
- **Status:** ✅ Live and working

### Deploy 3: Python Cron (GitHub Actions)
- **What:** Python script fetching HackerNews, Wikipedia, NASA, Dev.to, GitHub into D1
- **Status:** ✅ Script works, D1 has 19 entries, hourly auto-run blocked by Bot Fight Mode

## Known Failures & Root Causes
| Issue | Root Cause | Status |
|---|---|---|
| Silent build failures | Too many changes batched in one IC build | Avoid large IC builds |
| Hollow features | Agents wrote stub code, QA didn't catch | Strict code-level QA now |
| BrainForge deploy stuck | Hardcoded revoked token in deploy.yml | Fixed — using secrets now |
| D1 cron blocked | Cloudflare Bot Fight Mode blocking GitHub Actions IPs | User must disable Bot Fight Mode |
| IC-BrainForge sync not working | Code wired but not fully tested end-to-end | Pending fix |
