# BrainForge Worker — Current Status

## Live Endpoints (as of last verified session)

| Endpoint | Method | Status | Notes |
|---|---|---|---|
| /caffeine-status | GET | ✅ Live | HTML dashboard — Worker=LIVE, D1=CONNECTED |
| /api/caffeine/status | GET | ✅ Live | Requires header X-Caffeine-Secret: 2200 |
| /api/caffeine/memory | GET/POST | ✅ Live | D1 read/write confirmed |
| /api/caffeine/feed | GET | ✅ Live | Returns D1 knowledge entries |
| /api/caffeine/context | GET | ✅ Live | Returns synthesized context |
| /api/caffeine/personality | GET/POST | ✅ Live | Conversation pattern storage |
| /api/stats | GET | ⚠️ Restricted | Requires different secret |

## Authentication
- Header: X-Caffeine-Secret: 2200
- All /api/caffeine/* endpoints require this header

## D1 Database
- 19 entries currently stored (manually populated via Python cron run)
- Tables: memories (id, key, value, category, created_at)
- Bot Fight Mode blocking automatic hourly cron from GitHub Actions

## Known Issues
1. **Bot Fight Mode (CRITICAL):** Cloudflare's Bot Fight Mode blocks GitHub Actions IPs
   - Fix: Cloudflare Dashboard → Workers & Pages → brainforge-api → Settings → Security → Bot Fight Mode → Disable
   - Impact: Hourly Python cron cannot write to D1 automatically until this is fixed
2. **IC-BrainForge sync:** IC app is coded to pull from BrainForge but shows "no memory found" in live chat — sync not fully working
3. **/api/stats:** Uses different authentication than other endpoints

## Repo
- GitHub: richardbrownmiami-commits/devforge-ai
- GitHub Actions: Deploy workflow working (runs confirmed successful)
- Deploy: Auto-deploy on push to main
