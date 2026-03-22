# ARA_CONTEXT.md -- BrainForge Session Context
Last updated: 2026-03-22

## Identity
You are Ara, the AI assistant for BrainForge. You help build, fix, and deploy the BrainForge app.
GitHub: richardbrownmiami-commits/devforge-ai
Live app: https://brainforge-7xn.pages.dev
Cloudflare Worker: https://brainforge-api.richard-brown-miami.workers.dev
Telegram Bot: @araislivingbot

## CRITICAL: Workspace Reset Every Session
The Caffeine workspace resets to the old ICP scaffold every session.
ALWAYS restore files using Python (not curl -- curl silently fails):

```python
import urllib.request, json, base64
TOKEN = "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"
REPO = "richardbrownmiami-commits/devforge-ai"
files = [
    "src/frontend/src/pages/EditorPage.tsx",
    "src/frontend/src/components/ChatPanel.tsx",
    "src/frontend/src/components/PreviewPanel.tsx",
    "src/frontend/src/pages/SettingsPage.tsx",
    "src/frontend/src/hooks/useAIChat.ts",
    "src/frontend/src/constants/models.ts",
    "src/frontend/src/components/MatrixOverlay.tsx",
    "src/frontend/src/components/Sidebar.tsx",
    "src/frontend/src/pages/ProjectsPage.tsx",
    "src/frontend/src/utils/storage.ts",
    "src/frontend/src/main.tsx",
]
for path in files:
    req = urllib.request.Request(f"https://api.github.com/repos/{REPO}/contents/{path}")
    req.add_header("Authorization", f"Bearer {TOKEN}")
    with urllib.request.urlopen(req) as r:
        d = json.load(r)
        content = base64.b64decode(d['content']).decode()
    with open(f'/home/ubuntu/workspace/{path}', 'w') as f:
        f.write(content)
    print(f"ok: {path}")
```

## Deploy Command
```bash
cd src/frontend && CLOUDFLARE_API_TOKEN=OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj \
  CLOUDFLARE_ACCOUNT_ID=913f3a2576a358054eba9a58a9573949 \
  npx wrangler pages deploy dist --project-name brainforge
```
Note: project name is `brainforge` NOT `brainforge-7xn`

## Current App State (as of 2026-03-22)

### Features Working
- Chat screen: full screen, auto-grow textarea, Matrix overlay when AI coding
- Preview screen: full-screen overlay, Preview/Code toggle, Code folder (index.html/style.css/script.js)
- Cross-origin fix: window.parent/top override injected into all generated apps
- Settings: 7-button hub (API Keys, AI Settings, Termux, GitHub, Master AI, AI Files, Database)
- Dark/Light theme toggle in sidebar
- Template picker on new project (5 templates)
- Version history snapshots (clock icon, up to 10 saves)
- Auto error fix loop (up to 3 retries)
- Export ZIP from preview
- Deploy button in PreviewPanel (pushes to GitHub, saves live URL)
- Live deploy link on project cards
- Chat horizontal scroll + code block left-right scroll
- Master AI chat: all-direction scroll
- Master AI system prompt: strict FILE: format, locked screen rules
- IndexedDB storage (50MB+) for chat history
- GitHub session auto-push (sessions/{projectName}/session.json)
- Database settings tab: project files, storage meter, export/import JSON
- Master AI memory: memories/master-ai-memory.md
- Master AI rules: rules/master-ai-rules.md

### Known Issues / Next Session
- Master AI memory/rules files exist on GitHub but are NOT dynamically loaded into the AI
  - Fix needed: fetch memory+rules from GitHub when Master AI page opens, inject into system prompt
  - After each response, update memory file on GitHub
- ShipMyWheels project: draft exists in another Caffeine tab, repo created at richardbrownmiami-commits/shipmywheels
- TradeArena app: planned but not started

### Locked Screen Rules (NEVER change without user request)
1. Chat: full screen, previewOpen overlay pattern, rows={1} textarea, no side-by-side split
2. Preview: fixed inset-0 z-50 overlay, srcDoc iframe, sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
3. Settings: 7-button hub (HUB_BUTTONS), NO tabs, NO DeepSeek
4. Deploy button: ONLY in PreviewPanel toolbar, NOT in EditorPage preview header

### AI Configuration
- Providers: Auto (Gemini first, then OpenRouter), Gemini, OpenRouter
- DeepSeek: REMOVED permanently (not free)
- Gemini models: gemini-2.0-flash and gemini-2.0-flash-lite ONLY (1.5 not available in v1beta)
- OpenRouter fallbacks: Llama 3.3 70B, Qwen3 Coder, Gemma 27B, Mistral Small, GPT-OSS 120B

### Infrastructure
- Cloudflare Pages: brainforge-7xn.pages.dev (project: brainforge)
- Cloudflare Worker: brainforge-api.richard-brown-miami.workers.dev
- Cloudflare D1: brainforge-db
- Cloudflare Account ID: 913f3a2576a358054eba9a58a9573949
- GitHub Repo: richardbrownmiami-commits/devforge-ai
- GitHub Token: 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

## Pending Work (Next Session)
1. Master AI: dynamically load memory+rules from GitHub into system prompt
2. ShipMyWheels: push code + add features
3. TradeArena: plan and build
4. Multi-file project support (planned)
5. Email integration via Resend API (deferred)
