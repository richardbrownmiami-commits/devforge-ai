# Key Decisions & Plans

## Core Decisions (Finalized)

### 1. Architecture Decision: IC + Cloudflare Hybrid
- **Decision:** Keep IC for brain/UI only. All new features, tools, knowledge on Cloudflare. Never duplicate.
- **Reason:** IC costs coins per deploy. Cloudflare is free and instantly deployable.
- **Rule:** No new IC build unless it's a core brain change (IC Timer logic, new canister endpoint, avatar/chat changes)

### 2. BrainForge Decision: Use As-Is, Stop Repairing
- **Decision:** BrainForge Worker is the external memory layer. It works. Stop treating it as a broken project to fix.
- **Reason:** Endpoints are live, D1 is connected, deploy pipeline is working.
- **What NOT to do:** Do not rebuild BrainForge, do not add unrelated features to it, do not call it "broken"

### 3. Python Cron Decision: GitHub Actions
- **Decision:** Use Python via GitHub Actions for all knowledge fetching (not Cloudflare Workers cron)
- **Reason:** Python has better libraries for parsing, data processing, future ML use
- **Status:** Implemented, manually verified working, blocked by Bot Fight Mode for hourly runs

### 4. AI Buddy Decision: Gemini vs Groq
- **Decision:** AI Buddy = Gemini (challenger/contrarian) debating Groq (me, pragmatic builder)
- **Reason:** QnA alone doesn't build perspective — dialogue with a counterpoint model does
- **Status:** Architecture researched, not yet built

### 5. Coins Decision: Minimize IC Deploys
- **Decision:** Only use IC builds when strictly necessary. Every other feature goes Cloudflare-first.
- **Past waste:** Multiple builds failed silently, coins wasted on hollow features, repeated QA failures
- **Rule:** Before any IC build, ask: can this be done on Cloudflare instead?

### 6. Context/Memory Decision: Save to GitHub
- **Decision:** Since D1 is not reliably accessible mid-session, save all context as markdown files in GitHub repo
- **Reason:** Future sessions can read these files and continue without repeating decisions
- **Location:** richardbrownmiami-commits/devforge-ai/context/ folder

## Current Priorities (In Order, No Coins Unless Noted)
1. Fix Bot Fight Mode — user action (Cloudflare Dashboard)
2. Verify D1 cron populating correctly after Bot Fight Mode fix
3. Build AI Buddy on Cloudflare Worker (Gemini vs Groq dialogue, D1 storage)
4. Build frontend dashboard on Cloudflare Pages (buddy conversations, knowledge feed, memory browser)
5. Wire IC ↔ BrainForge sync properly (requires IC build = coins — do this last)
