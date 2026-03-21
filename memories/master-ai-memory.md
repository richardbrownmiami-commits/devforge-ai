# Master AI Memory -- BrainForge Full Context
Last updated: 2026-03-21

## What is BrainForge
BrainForge is a self-hosted AI app builder live at https://brainforge-7xn.pages.dev
- Frontend: React + TypeScript + Tailwind, built with Vite
- Deployed on: Cloudflare Pages (project name: `brainforge`)
- Backend API: Cloudflare Worker at https://brainforge-api.richard-brown-miami.workers.dev
- Database: Cloudflare D1 (`brainforge-db`)
- Code backup: GitHub repo `richardbrownmiami-commits/devforge-ai`
- Telegram bot: @araislivingbot

## Architecture
- All data stored in localStorage (primary) + Cloudflare D1 (cloud backup)
- AI providers: Gemini 2.0 Flash (free, primary) + OpenRouter free models (fallback)
- No DeepSeek -- removed permanently (not free)
- Settings saved to localStorage key `bf_settings`
- Projects saved to localStorage key `bf_projects`
- Chat history: `bf_chat_{projectName}`
- Snapshots: `bf_snapshots_{projectName}`
- AI files: `bf_ai_file_{key}`
- Deploy URLs: `bf_deploy_url_{projectName}`

## Key Files (GitHub source of truth)
| File | Purpose |
|------|---------|
| src/frontend/src/pages/EditorPage.tsx | Chat screen + preview overlay + history drawer |
| src/frontend/src/components/ChatPanel.tsx | Chat UI, auto-grow textarea |
| src/frontend/src/components/PreviewPanel.tsx | Preview iframe (srcDoc, no allow-same-origin) |
| src/frontend/src/pages/SettingsPage.tsx | 7-button hub settings |
| src/frontend/src/hooks/useAIChat.ts | AI provider logic, Gemini rotation |
| src/frontend/src/constants/models.ts | Model lists |
| src/frontend/src/components/Sidebar.tsx | Nav + dark/light toggle |
| src/frontend/src/components/MatrixOverlay.tsx | Matrix animation when AI coding |
| src/frontend/src/pages/ProjectsPage.tsx | Projects grid + template picker |

## LOCKED Screens (never change layout)
1. CHAT: full screen, previewOpen overlay pattern, rows={1} textarea
2. PREVIEW: fixed inset-0 z-50 overlay, srcDoc iframe, sandbox="allow-scripts"
3. SETTINGS: 7-button hub (API/AI/Termux/GitHub/MasterAI/AIFiles/Database)

## How to Make a Change (step by step)
1. Restore all files from GitHub (workspace resets every Caffeine session)
2. Read the file you need to change
3. Make ONLY the requested change -- do not touch other screens
4. Run: cd src/frontend && npx vite build
5. If build passes, deploy: cd src/frontend && CLOUDFLARE_API_TOKEN=OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj CLOUDFLARE_ACCOUNT_ID=913f3a2576a358054eba9a58a9573949 npx wrangler pages deploy dist --project-name brainforge
6. Push changed files to GitHub using the API

## How to Push a File to GitHub
```python
import json, base64, urllib.request
TOKEN = "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"
REPO = "richardbrownmiami-commits/devforge-ai"
# get sha first, then PUT with content
```

## Features Built So Far
- Multi-provider AI (Gemini 2.0 Flash + OpenRouter free models, auto-rotation)
- Chat screen full screen, preview as overlay button
- Settings: 7-button hub (API Keys, AI Settings, Termux, GitHub, Master AI, AI Files, Database)
- Dark/Light theme toggle in sidebar
- Template picker when creating projects (5 templates)
- Matrix overlay animation when AI is coding
- Export ZIP button in preview panel
- Version history / snapshots (auto-save, clock icon, restore)
- Auto error fix loop (up to 3 retries)
- Database tab: project files, AI memories, export/import JSON, D1 storage meter
- Deploy button in preview overlay (pushes to GitHub, live URL saved to project)
- Live deploy link shown on project cards

## What Master AI Should NOT Change
- Chat layout (full screen, textarea rows=1)
- Preview overlay structure (fixed inset-0 z-50)
- Settings hub buttons layout
- Gemini models (2.0 flash only)
- DeepSeek (removed permanently)
