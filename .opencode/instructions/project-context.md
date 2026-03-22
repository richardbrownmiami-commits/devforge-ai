# Project Context

Use this context to preserve continuity with what already exists in the project.

- Project name: BrainForge
- Project summary: ## Application Overview

**BrainForge** is a self-hosted, AI-powered app builder inspired by Caffeine and bolt.diy, designed for personal autonomy, platform independence, and persistent AI memory. It enables users to describe app ideas, have AI (multi-provider: Gemini, OpenRouter, Groq, GitHub Models, etc.) generate and refine code (HTML/CSS/JS/React), preview live, auto-fix errors, edit code, and deploy to GitHub and Cloudflare Pages.

**Live App:** https://brainforge-7xn.pages.dev  
**Cloudflare Worker:** https://brainforge-api.richard-brown-miami.workers.dev  
**GitHub Repo:** richardbrownmiami-commits/devforge-ai (private)  
**Telegram Bot:** @araislivingbot  

---

## Critical Credentials (confirmed working as of 2026-03-22)

- **GitHub Token:** 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
- **Cloudflare API Token:** OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj
- **Cloudflare Account ID:** 913f3a2576a358054eba9a58a9573949
- **D1 Database ID:** 3814a86b-7054-465c-ae64-8bf99019cf6b
- **D1 Database Name:** brainforge-db
- **Worker Secret:** BRAINFORGE_SECRET=2200
- **Cloudflare Pages Project:** brainforge
- **Portrait Image:** https://i.imgur.com/jLXabP8.png

---

## LOCKED SCREEN RULES -- NEVER CHANGE WITHOUT EXPLICIT INSTRUCTION

1. **Chat screen** = full screen, auto-grow textarea, horizontal scroll for code blocks
2. **Preview** = full-screen overlay (fixed inset-0 z-50), opens on button click -- NOT split view, no md:w-1/2, no Tabs layout
3. **Settings** = 7-button hub: API Keys, AI Settings, Termux, GitHub & Deploy, Master AI, AI Files, Database
4. **Sidebar** = dark/light toggle, project list, navigation
5. **Master AI** = strict FILE: format responses only, no chat, no explanations

---

## D1 Schema (actual confirmed columns)

- **projects:** id, name, ai_model, code, created_at, last_modified
- **messages:** id, project_id, role, content, created_at
- **snapshots:** id, project_id, code, description, created_at
- **ai_memory:** scope, content, message_count, updated_at
- **ai_rules:** scope, content, updated_at
- **settings:** key, value
- **telegram_chats:** chat_id, history, updated_at
- **chats:** id, project_id, role, content, created_at
- **memories:** key, value, updated_at

---

## Key Source Files

- src/frontend/src/pages/EditorPage.tsx -- chat + preview overlay
- src/frontend/src/pages/SettingsPage.tsx -- 7-button hub (HUB_BUTTONS constant)
- src/frontend/src/pages/ProjectsPage.tsx -- project cards + template picker
- src/frontend/src/components/ChatPanel.tsx -- chat UI with horizontal scroll
- src/frontend/src/components/PreviewPanel.tsx -- preview + code folder (Preview/Code toggle)
- src/frontend/src/components/Sidebar.tsx -- navigation + theme toggle
- cloudflare-worker/index.js -- Worker with D1 protection (deployed and working)
- docs/CHANGE-SECRET.md -- instructions for changing the 2200 secret

---

## Features Confirmed Working

- Chat full screen + horizontal scroll, auto-grow textarea
- Preview full-screen overlay with Code folder (Preview/Code toggle, no tabs)
- Cross-origin fix permanent (window.parent/window.top override in iframe)
- Settings 7-button hub -- all 7 buttons open full pages
- Master AI with strict FILE: format system prompt and complete locked screen rules
- Dark/Light theme toggle in sidebar
- Template picker after project creation (Blank, Landing, Dashboard, Game, Chat)
- Version history snapshots with timestamps + one-click restore
- Matrix overlay animation when AI is generating code
- Auto error fix loop (3 retries before asking user)
- ZIP export of project files
- Deploy button in preview overlay -- pushes to GitHub + saves live URL
- Live links on project cards
- IndexedDB 50MB storage (localForage)
- GitHub session auto-save per project (sessions/{name}/session.json)
- Worker secret header (2200) sent on all API calls from frontend
- Storage meter in Database tab (color-coded green/yellow/red)
- D1 Worker fully deployed and protected -- 403 without correct secret
- Daily D1 backup to GitHub (cron at 2am)
- Clear button in chat (trash icon above input bar)
- No duplicate Deploy button (removed from EditorPage overlay header)

---

## Security Status

| Item | Status |
|---|---|
| GitHub repo private | DONE |
| Worker secret header enforced (2200) | DONE |
| D1 protected -- 403 without secret | DONE |
| Daily D1 backup cron | DONE |
| docs/CHANGE-SECRET.md | DONE |
| Fine-grained GitHub tokens | PENDING |
| PIN lock on app | PENDING |
| API keys routed through Worker | PENDING |

---

## Pending / Next Priorities

1. **Master AI dynamic memory** -- fetch memories/master-ai-memory.md and rules/master-ai-rules.md from GitHub on page open, inject into system prompt. Currently static/hardcoded.
2. **GitHub Models + Groq as AI providers** -- add GPT-4o (free via GitHub token) and Llama 3.3 (Groq) for Master AI rotation
3. **BrainForge Handbook** -- create docs/BrainForge-Handbook.md with full setup guide (PDF failed, redo as Markdown)
4. **PIN lock and session timeout** -- app access protection
5. **Master AI push confirmation + audit log** -- logs/master-ai-changes.md
6. **ShipMyWheels** -- push code and add features
7. **TradeArena** -- plan and start building
8. **Route AI keys through Cloudflare Worker** -- so keys never in browser localStorage

---

## Full Conversation History Summary

### What Was Built (Chronological)

**Session 1-3: Core App**
- Built BrainForge from scratch -- Caffeine-style UI, dark theme, sidebar, chat interface
- Multi-provider AI: Gemini, OpenRouter
- Live preview in sandboxed iframe using srcDoc
- Project history with persistent chat (IndexedDB)
- GitHub integration -- pushes code to repo, deploys to Cloudflare Pages

**Session 4-5: Preview and Settings**
- Fixed preview to full-screen overlay (removed split view permanently)
- Settings page rebuilt as 7-button hub with color-coded buttons
- AI Files viewer added -- see/edit memory and rules files per project
- Database tab added -- shows project files, AI memories, storage meter

**Session 6-7: Master AI**
- Master AI page added -- dedicated AI for BrainForge maintenance
- Strict system prompt: FILE: format only, no chat responses
- Locked screen rules injected into Master AI system prompt
- memories/master-ai-memory.md and rules/master-ai-rules.md pushed to GitHub

**Session 8: Storage and Sessions**
- IndexedDB storage upgraded to 50MB (was 5MB)
- GitHub session auto-save -- after every AI response, session pushed to sessions/{name}/session.json
- Storage meter added to Database tab

**Session 9: PreviewPanel Rebuild**
- Old PreviewPanel deleted entirely
- New PreviewPanel built from scratch:
  - Preview / Code toggle (not tabs)
  - Code folder sidebar showing index.html, style.css, script.js
  - Cross-origin fix permanent (injects safety script into iframe)
  - Mobile frame toggle, refresh, ZIP export, Deploy button
- Removed HTML/CSS/JS tabs from preview
- Removed Terminal tab

**Session 10: UI Fixes**
- Chat horizontal scroll added for long code lines
- Master AI all-direction scroll enabled
- Clear chat button added (trash icon)
- Duplicate Deploy button removed from EditorPage overlay header
- Template picker restored after project creation
- Master AI system prompt completed (was truncated)
- Reminder file updated to use Python for file writes (curl was silently failing)

**Session 11: Security - Worker Secret**
- Worker secret (2200) added to frontend -- all API calls now send X-BrainForge-Secret: 2200
- Worker Secret field added to Settings → GitHub & Deploy
- Discussed D1 security in detail -- confirmed Worker was not checking the secret

**Session 12: D1 Protection (current session)**
- Confirmed D1 was publicly accessible -- projects visible without any auth
- Deployed updated Cloudflare Worker via Cloudflare API (Python urllib multipart)
- Worker now enforces secret header check -- 403 without correct secret
- D1 schema confirmed by querying sqlite_master
- Worker uses correct column names (last_modified not updated_at for projects)
- Daily backup cron added (2am, exports to backup/d1-backup-YYYY-MM-DD.json)
- docs/CHANGE-SECRET.md added to GitHub
- ARA_CONTEXT.md updated on GitHub
- Project paused -- user returning in a few days

---

## How to Deploy Worker (Ara can do this autonomously)

```python
import urllib.request, json

token = "OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj"
account_id = "913f3a2576a358054eba9a58a9573949"

# Read worker code, then:
boundary = "BrainForgeBoundary"
metadata = b'{"main_module":"worker.js","compatibility_date":"2024-01-01","bindings":[{"type":"d1","name":"DB","id":"3814a86b-7054-465c-ae64-8bf99019cf6b"}]}'

body = (
    f"--{boundary}\r\n".encode() +
    b'Content-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n' +
    metadata + b"\r\n" +
    f"--{boundary}\r\n".encode() +
    b'Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n' +
    worker_code + b"\r\n" +
    f"--{boundary}--\r\n".encode()
)

req = urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/brainforge-api",
    data=body, method="PUT",
    headers={"Authorization": f"Bearer {token}", "Content-Type": f"multipart/form-data; boundary={boundary}"}
)
```

---

## How to Push Files to GitHub (Ara can do this autonomously)

```bash
TOKEN="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"
REPO="richardbrownmiami-commits/devforge-ai"

# Get SHA of existing file (for updates)
SHA=$(curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$REPO/contents/PATH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sha',''))")

# Push file
CONTENT=$(base64 -w 0 filename)
curl -s -X PUT "https://api.github.com/repos/$REPO/contents/PATH" \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Update file\",\"content\":\"$CONTENT\",\"sha\":\"$SHA\"}"
```

---

## User Preferences

- Always discuss before building -- no action without explicit confirmation
- Chat, preview, and settings layouts are locked -- never change without explicit instruction
- All features must be tested before deployment
- Security is a priority
- No Termux required -- Cloudflare dashboard or API is sufficient
- Python for file writes (curl was silently failing in earlier sessions)
