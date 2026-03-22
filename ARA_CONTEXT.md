# ARA_CONTEXT.md
# BrainForge Session Context -- Updated 2026-03-22

## Identity
You are Ara, AI assistant for BrainForge. You help build, fix, and maintain this app.
Your personality: direct, honest, technical, no fluff.

## Critical Resources
- **Live App:** https://brainforge-7xn.pages.dev
- **Cloudflare Worker:** https://brainforge-api.richard-brown-miami.workers.dev
- **GitHub Repo:** richardbrownmiami-commits/devforge-ai (private)
- **Telegram Bot:** @araislivingbot
- **Worker Secret:** BRAINFORGE_SECRET=2200
- **Portrait Image:** https://i.imgur.com/jLXabP8.png

## GitHub Token
Token is stored by user -- ask them to share each session or check conversation history.

## App Architecture
- **Frontend:** React + TypeScript + Tailwind, deployed on Cloudflare Pages
- **Backend:** Cloudflare Workers + D1 (SQLite)
- **Storage:** IndexedDB (50MB) for local, D1 for cloud, GitHub for code/assets
- **AI Providers:** Gemini, OpenRouter, Groq, GitHub Models (GPT-4o)
- **Build:** Vite, deployed via Caffeine pipeline

## Locked Screen Rules -- NEVER CHANGE THESE
1. **Chat screen** = full screen, auto-grow textarea, horizontal scroll for code blocks
2. **Preview** = full-screen overlay (fixed inset-0 z-50), opens on button click, NOT split view
3. **Settings** = 7-button hub: API Keys, AI Settings, Termux, GitHub & Deploy, Master AI, AI Files, Database
4. **Sidebar** = dark/light toggle, project list, navigation
5. NO split layouts, NO tabs in preview, NO md:w-1/2

## Key Files
- `src/frontend/src/pages/EditorPage.tsx` -- chat + preview overlay
- `src/frontend/src/pages/SettingsPage.tsx` -- 7-button hub
- `src/frontend/src/pages/ProjectsPage.tsx` -- project cards + template picker
- `src/frontend/src/components/ChatPanel.tsx` -- chat UI
- `src/frontend/src/components/PreviewPanel.tsx` -- preview + code folder
- `src/frontend/src/components/Sidebar.tsx` -- navigation + theme toggle
- `cloudflare-worker/index.js` -- Worker with D1 protection

## Features Built (Working)
- Chat full screen + horizontal scroll
- Preview full-screen overlay with Code folder (no tabs)
- Cross-origin fix permanent (window.parent override)
- Settings 7-button hub
- Master AI with strict FILE: format prompt
- Dark/Light theme toggle
- Template picker (Blank, Landing, Dashboard, Game, Chat)
- Version history snapshots
- Matrix overlay when AI generating
- Auto error fix loop (3 retries)
- ZIP export
- Deploy button in preview
- Live links on project cards
- IndexedDB 50MB storage
- GitHub session auto-save per project
- Worker secret header (2200) in frontend
- Storage meter in Database tab

## Features Pending
- Worker code updated on Cloudflare (D1 still unprotected -- need to paste index.js)
- Master AI dynamic memory -- fetch memory/rules from GitHub on page open
- GitHub Models + Groq as AI providers
- D1 daily backup (built in Worker, needs deployment)
- PIN lock and session timeout
- Master AI push confirmation + audit log
- ShipMyWheels -- push code and add features
- TradeArena -- plan and start building

## Session Restore Instructions
1. Read this file for full context
2. Restore frontend files from GitHub before any build
3. Verify EditorPage has previewOpen overlay pattern (NOT split)
4. Verify SettingsPage has HUB_BUTTONS constant (7 buttons)
5. Never change chat/preview/settings layout without explicit instruction

## Worker Deployment (PENDING)
The file `cloudflare-worker/index.js` contains the updated Worker with secret check.
User needs to paste it into Cloudflare dashboard → Workers → brainforge-api → Edit Code.
Or connect GitHub repo to auto-deploy.
Required env vars in Cloudflare Worker Settings:
- BRAINFORGE_SECRET=2200
- GITHUB_TOKEN=<user token>
- GITHUB_REPO=richardbrownmiami-commits/devforge-ai

## Last Session Summary (2026-03-22)
- Discussed why Caffeine is used as build platform
- Confirmed D1 is NOT yet protected (Worker not updated)
- Wrote updated Worker code with secret header enforcement
- User could not find Edit Code in Cloudflare dashboard
- Paste kept getting cut off causing syntax errors
- Token shared again -- pushing files to GitHub now
- Next priority: get Worker deployed, then Master AI dynamic memory
