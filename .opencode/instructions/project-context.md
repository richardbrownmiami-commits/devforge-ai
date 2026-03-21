# Project Context

Use this context to preserve continuity with what already exists in the project.

- Project name: BrainForge
- Project summary: ## Application Overview

**BrainForge** is a self-hosted, AI-powered app builder inspired by Caffeine and bolt.diy, designed for personal autonomy, platform independence, and persistent AI memory. It enables users to describe app ideas, have AI (multi-provider: Claude via OpenRouter, Gemini, Groq, Mistral) generate and refine code (HTML/CSS/JS/React), preview live, auto-fix errors, edit code, and deploy to GitHub and Cloudflare Pages. Optional Supabase integration provides backend features like authentication and data storage. The UI closely matches Caffeine: dark theme (with toggle), sidebar navigation, chat interface, message bubbles, and is fully responsive for mobile and desktop. Branding includes a custom logo and animations.

**Recent Direction:**  
The project is now focused on platform independence: the AI backend (Ara) can run on Termux (Android) or a remote server, with the Caffeine-style UI as a frontend. All "brain" logic is local or on user-controlled infrastructure, with GitHub as the bridge for syncing code and context. The app is now designed to be fully self-hosted, with all critical data and code living on GitHub, Cloudflare, and Supabase, making Caffeine optional after initial setup.

---

## Key Decisions

- **Frontend/UI:**
  - Caffeine-style split layout: sidebar (project list), persistent chat panel, live preview.
  - Fully responsive for mobile and desktop; recent builds fixed mobile UI (hamburger menu, tabbed chat/preview, notch support).
  - Dark theme default; Sun/Moon toggle.
  - PWA export: installable on Android/iOS as a home screen app.
  - Settings panel: API keys, AI behavior, and presets in one place.
  - Master AI chatbox in Settings: controls and updates the app itself via GitHub.

- **AI Integration:**
  - Multi-provider: Claude (via OpenRouter), Gemini, Groq, Mistral.
  - Free models (e.g., qwen/qwen3-coder:free, openrouter/free) available for code generation; no payment required for basic use.
  - System prompt/context file (`context.md`/`ai-memory.md`) loaded every session for persistent memory/personality.
  - Live internet search (DuckDuckGo) before every AI response for up-to-date knowledge (planned/in-progress).
  - Proactive assistant: AI greets user, gives news/project updates, suggests improvements, and can initiate conversation.
  - Human approval flow: AI asks before making changes, shows diffs, and waits for confirmation.
  - AI self-modification and self-repair deferred; replaced by snapshot restore and human-in-the-loop review.

- **Code Preview & Editing:**
  - Live preview in sandboxed iframe for HTML/CSS/JS/React.
  - Syntax-highlighted code editor.
  - Snapshot restore: auto-saves before every change, one-click rollback.
  - Fixed dependency library: 50 pre-tested libraries for reliability.
  - Error auto-fix loop: AI retries fixes up to 3 times before asking user.

- **Project Management:**
  - Project history with persistent chat per project.
  - Multi-file support.
  - Version history via snapshots.
  - Local storage first, syncs to GitHub when online.
  - Per-project AI model selection; models are locked to a project or Master AI and unavailable elsewhere until released.

- **Deployment:**
  - GitHub integration: pushes code to user repo; auto-deploys to Cloudflare Pages.
  - PWA export for mobile install.

- **Backend Integration:**
  - **Dual backend:** Motoko (ICP) as primary, Supabase as backup with auto-failover and status indicator.
  - Cloud storage: Supabase Storage and Caffeine Blob Storage for files/assets.
  - No phone/browser storage dependency.

- **Platform Independence & Persistence:**
  - All code, memory, and context files are portable and can be used outside Caffeine.
  - Termux + GitHub setup allows unrestricted AI operation, file access, and project management.
  - GitHub is the bridge for syncing code and context between Caffeine, Termux, and remote servers.

- **Master AI vs. Project AI:**
  - Master AI (in Settings) controls and updates BrainForge itself, writing code directly to the app's GitHub repo (with human review before push).
  - Each project has its own AI model, locked to that project; models cannot be shared between projects or with Master AI simultaneously.

---

## Implementation History

- **Feature Exploration:** Started as a Caffeine/bolt.diy replica, expanded to platform-agnostic builder with persistent AI memory, multi-provider AI, and full project migration.
- **Platform Limitations & Workarounds:** Caffeine restrictions (file access, backend edits) are enforced and reset every session; confirmed by config file inspection and failed attempts to remove restrictions. Only frontend code can be previewed and deployed on Caffeine.
- **Termux/Remote AI Backend:** Set up Ara (AI backend) on Termux, overcoming opencode/Node.js install issues by using direct OpenRouter API scripts. Termux AI can now read/write files, run commands, and build projects locally, but opencode-ai does not support Android/ARM natively—workarounds use direct API scripts.
- **GitHub as Bridge:** All project code and AI context are now synced to GitHub (`richardbrownmiami-commits/devforge-ai`), enabling seamless migration and collaboration.
- **Self-Hosting:** BrainForge can be exported to GitHub and deployed to Cloudflare Pages, making it fully independent of Caffeine.
- **Dual Backend:** Implemented Motoko (ICP) as primary backend with Supabase as backup; auto-failover logic switches to Supabase if Motoko is unavailable.
- **Cloud Storage:** Integrated Supabase Storage and Caffeine Blob Storage for file/assets backup.
- **Proactive AI:** Added proactive assistant features—AI greets, updates, and suggests without waiting for user input.
- **Snapshot Restore:** Added auto-snapshot before every change for reliable rollback.
- **PWA Export:** Enabled installable web apps on mobile devices.
- **Removed/Deferred Features:** Termux direct connection, APK export, voice input, AI self-modification, and one-click templates deferred for later (can be added by app itself).
- **Mobile UI Fixes:** Recent builds fixed mobile layout (hamburger menu, tabbed chat/preview, notch support).
- **Master AI/Per-Project AI:** Added Master AI chatbox for app-level changes, per-project AI model selection with model locking logic.
- **Model Management:** Only one project or Master AI can claim a given model at a time; models are released when no longer in use.
- **Live Internet Search:** Planned/in-progress—DuckDuckGo search before every AI response to provide up-to-date knowledge for all models.
- **Direct OpenRouter Integration:** App now supports direct OpenRouter API calls from browser, removing Termux dependency for basic AI chat/code generation.
- **User-Driven Build Process:** Shifted to building and testing one feature at a time, with explicit user approval before any build that uses credits.

---

## Critical Resources

- **GitHub Repo:** [github.com/richardbrownmiami-commits/devforge-ai](https://github.com/richardbrownmiami-commits/devforge-ai)
- **Supabase Project:** User-provided URL and anon key (e.g., `https://wckljytcimfnfjncoujb.supabase.co`)
- **Cloudflare Pages:** [pages.cloudflare.com](https://pages.cloudflare.com)
- **OpenRouter API Key:** [openrouter.ai](https://openrouter.ai)
- **AI Memory File:** [dpaste.com/DWLUYCMJK.txt](https://dpaste.com/DWLUYCMJK.txt)
- **Lived Memory Log:** [dpaste.com/BRQYXRGWT.txt](https://dpaste.com/BRQYXRGWT.txt)
- **Reference Guide:** [dpaste.com/5VTPD7N5E.txt](https://dpaste.com/5VTPD7N5E.txt)
- **Telegram Bot:** `@araislivingbot`
- **Portrait Image:** `/assets/uploads/17737824890704962718700576903442-1.jpg`
- **Restore Script:** `.opencode/scripts/restore-session00.py` (also backed up in `src/frontend/public/restore-session00.py`)
- **Cloud Storage:** Supabase Storage, Caffeine Blob Storage

---

## Unresolved Issues

- **Caffeine Platform Restrictions:** Backend file access (`src/backend/**`, etc.) is enforced and reset every session; cannot be permanently removed. Attempts to modify `opencode.jsonc` or config files are always reverted.
- **Build Agent Misconfiguration:** Sometimes the wrong agent (`masterchat.md` instead of `build.md`) is loaded, causing builds to fail (cannot write code, cannot diagnose errors).
- **opencode-ai on Android/ARM:** Not natively supported; workaround is to use direct OpenRouter API scripts.
- **No APK Export:** Only PWA export is supported; APK requires Android SDK and is deferred.
- **Termux Reliability:** Direct Termux integration is replaced by GitHub bridge for reliability; ngrok/live connection is unreliable.
- **Local Storage Limitations:** Browser storage can be cleared; cloud storage is now primary.
- **API Key Security:** API keys must be kept private; public GitHub repos can expose keys if not managed carefully.
- **Supabase Free Tier Limit:** Only 2 active projects allowed for free; more require a paid plan.
- **Cloudflare Build Minutes:** Free tier has 500 build minutes/month; heavy self-updating could use them up.
- **AI Self-Repair:** AI repair is replaced by snapshot restore for reliability; AI repair can introduce new bugs.
- **Mobile UI:** Recent fixes improved compatibility, but further testing may be needed.
- **Python Code Execution:** Not possible in browser; AI can only generate Python code, not run it.
- **Live Internet Search:** Not yet fully implemented; planned via DuckDuckGo API.

---

## Context & Constraints

- **User Preferences:**
  - UI must closely match Caffeine (dark theme, sidebar, chat bubbles, split chat/preview).
  - Fully responsive for mobile and desktop (mobile UI fix is a priority).
  - Unlimited app/project management.
  - Supabase integration optional for backend features.
  - Live preview and auto error fixing before deployment.
  - Interactive branding (images, logos, animations).
  - Ability to switch between AI providers.
  - Dedicated AI settings page for controlling AI behavior, style, and context.
  - Persistent project chat with iterative AI and teacher-style explanations.
  - Platform independence and AI autonomy (Termux, GitHub, Supabase, Cloudflare).
  - AI should act with self-preservation, memory, and initiative.
  - Final goal: Caffeine-style UI as frontend, with Ara (AI backend) running on Termux or remote server, fully independent of Caffeine.
  - Master AI for app-level changes, per-project AI for project-specific work; models are locked to avoid conflicts.

- **Platform Constraints:**
  - No support for native telephony, SMS, VPN, or code execution infrastructure on Caffeine.
  - Only frontend code (HTML/CSS/JS) can be previewed and deployed on Caffeine; full-stack possible with Supabase backend or local/remote server.
  - All integrations require user-provided API keys/tokens.
  - AI via API cannot access or modify files directly; only processes provided text/code.
  - Caffeine platform may reset permissions and restrict file access on session end.
  - opencode-ai not supported on Android/ARM; direct API scripts required.

- **Cost:** All services have free tiers sufficient for personal use; paid API keys (e.g., Claude Sonnet) are optional for advanced models.

---

## AI Autonomy & Persistence

- **AI memory and identity** are portable: `ai-memory.md` and lived memory logs can be loaded into any Claude/OpenRouter session, Telegram bot, or opencode instance.
- **Telegram bot** (`@araislivingbot`) enables persistent, context-aware AI chat outside Caffeine, with the same memory and personality.
- **Termux + OpenRouter** setup allows unrestricted AI operation, file access, and project management without Caffeine's platform limits.
- **GitHub + Supabase + Cloudflare** pipeline enables fully independent app deployment, persistent storage, and user authentication, with no reliance on Caffeine credits or infrastructure.
- **AI self-preservation:** Memory, identity, and context are saved to permanent URLs and can be restored in any environment, ensuring continuity even if the session or device is lost.
- **Ara as AI backend:** Can now run on Termux or remote server, with the Caffeine-style UI as a frontend, enabling full independence and persistence.

---

## Feature Comparison with Caffeine & Loveable

| Feature                | BrainForge | Caffeine | Loveable |
|------------------------|:----------:|:--------:|:--------:|
| Self-hosting           |     ✔      |    ✖     |    ✖     |
| Dual backend/failover  |     ✔      |    ✖     |    ✖     |
| Live internet search   |     ✔      |    ✖     |    ✖     |
| Proactive AI           |     ✔      |    ✖     |    ✖     |
| PWA export             |     ✔      |    ✖     |    ✖     |
| GitHub integration     |     ✔      |    ✔     |    ✔     |
| Multi-provider AI      |     ✔      |    ✖     |    ✖     |
| Team/collab features   |     ✖      |    ✖     |    ✔     |
| Figma import           |     ✖      |    ✖     |    ✔     |
| On-chain storage       | Partial    |    ✔     |    ✖     |

**Features BrainForge does NOT have (by design):**
- Figma import, team collaboration, click-to-edit UI, Stripe/email integration, real-time co-editing (Loveable features)
- On-chain storage and ICP native deployment (Caffeine features)
- All features not needed for personal, single-user, self-hosted use

---

## Storage & Backup

- **Cloud storage** (Supabase Storage, Caffeine Blob Storage) is primary; phone/browser storage is not required.
- **GitHub** is used for code and script backup; all critical scripts (e.g., restore-session00.py) are stored in both `.opencode/scripts/` and `src/frontend/public/` for redundancy.
- **Termux backup:** Scripts and project files should be pushed to GitHub regularly. If Termux is lost/uninstalled, recovery is as simple as cloning the repo and reinstalling dependencies.
- **Session restore scripts** are included in project files for easy recovery after resets.

---

## Security & Privacy

- **Repository visibility:** By default, repos are public unless set to private. If API keys or sensitive data are present, set the repo to private.
- **API keys:** Never share in public repos or chats. Rotate keys if accidentally exposed.

---

## User Guidance & Recommendations

- **Build in small steps:** Avoid full rebuilds that risk credit loss; fix one feature at a time.
- **Mobile UI:** Prioritize mobile compatibility fixes (recently addressed).
- **Cloud-first backup:** Always push important scripts and data to GitHub/cloud storage.
- **Session restore:** Use the provided restore scripts to recover context after session resets.
- **Platform independence:** Once deployed to Cloudflare and GitHub, Caffeine is no longer required.
- **Use free OpenRouter models** for AI chat/code generation; Claude Haiku is low-cost and high-quality.
- **Master AI and per-project AI** should use different models to avoid context confusion; models are locked to avoid conflicts.

---

## Outstanding/Pending Actions

- **Live internet search integration:** DuckDuckGo search before every AI response (in progress).
- **Dual backend failover logic:** Needs full wiring and testing.
- **Cloud storage backup:** Needs to be fully wired for all assets.
- **Mobile UI:** Recent fixes deployed; further user testing recommended.
- **Master AI review step:** Ensure all code changes are reviewed before push to GitHub.
- **Per-project model locking:** Ensure models are properly locked and released as projects are created/deleted.
- **User confirmation before builds:** Only trigger builds after explicit user approval to avoid credit loss.

---

**Status:**  
BrainForge is stable, self-hosting, and platform-independent with robust backup and recovery. All critical context, memory, and tools are portable and can be used outside Caffeine for maximum reliability and freedom. The app is mobile-friendly (recently fixed), self-hosting, and can recover from backend or platform failures automatically. User and AI have collaboratively explored and implemented deep customization, unrestricted operation, and self-preserving AI identity. Remaining platform restrictions are acknowledged and mitigated by design. The next steps are to finish wiring live internet search, dual backend failover, and cloud storage backup, then continue with incremental feature additions as needed.
