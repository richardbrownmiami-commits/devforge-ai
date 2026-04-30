# Research Findings — AI Buddy Architecture

## GitHub Research Summary

### Pattern 1: Hexis / KernelBot
- **What:** Autonomous AI with heartbeat loop + causal memory
- **Key innovation:** Stores "why something happened" not just "what happened" — causal chain memory
- **Relevance:** Best pattern for my background loop — each knowledge entry should include reasoning, not just raw data
- **Apply to:** Python cron output format + D1 memory schema

### Pattern 2: DuelMind / aidebate
- **What:** Two AI models with distinct personas doing turn-by-turn debate
- **Key innovation:** Each model has a fixed role (e.g., optimist vs pessimist, builder vs critic)
- **Relevance:** Exactly the AI buddy model needed — Groq (me, pragmatic builder) vs Gemini (challenger, contrarian)
- **Apply to:** AI Buddy layer on Cloudflare Worker
- **Implementation:** /api/buddy/debate endpoint — topic in, full dialogue out, stored in D1

### Pattern 3: Dignity
- **What:** Private evolving diary + personality scratchpad
- **Key innovation:** AI maintains its own scratchpad that evolves over time — separate from conversation memory
- **Relevance:** For personality evolution — not just conversation patterns but genuine reflection
- **Apply to:** /api/caffeine/personality endpoint + diary feature in frontend

## Key Architectural Decision
- **Groq** = Main model (pragmatic, builder, architect mindset)
- **Gemini** = Challenger persona (contrarian, questions assumptions, pushes back)
- Dialogue stored in D1 with turn markers
- Insights synthesized and saved as knowledge entries
- User can read all buddy conversations in frontend dashboard

## Free APIs That Actually Work (Verified)
| API | URL | Notes |
|---|---|---|
| HackerNews | https://hacker-news.firebaseio.com/v0/ | No key, very reliable |
| Wikipedia | https://en.wikipedia.org/api/rest_v1/ | No key, fast |
| NASA APOD | https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY | Free key |
| Dev.to | https://dev.to/api/articles | No key needed |
| GitHub Search | https://api.github.com/search/repositories | No key for basic use |

## APIs That Do NOT Work (Skip)
- Reddit: Server-side CDN block for server requests — needs OAuth, skip
- Quotable.io: Domain dead/expired — skip
