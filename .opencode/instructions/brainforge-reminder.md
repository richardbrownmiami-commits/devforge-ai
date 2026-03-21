# BrainForge -- CRITICAL REMINDER (Read Every Session)

> ⚠️ NEVER change the layout, structure, or behavior of the Chat screen, Preview screen, or Settings screen unless the user EXPLICITLY asks to change them. These screens have been carefully built and tested. Any accidental change causes rollback issues and wastes both user's and AI's time.

---

## Current Screen Layouts (DO NOT CHANGE)

### 1. Chat Screen (EditorPage + ChatPanel)
- **Layout:** Desktop = 50/50 horizontal split (chat left `md:w-1/2`, preview right `md:w-1/2`). Mobile = chat full screen.
- **Height:** `100dvh` (dynamic viewport -- accounts for mobile browser chrome)
- **Header:** Back button | Project name | Provider dot + label | Preview button (mobile only, `md:hidden`)
- **Chat area:** `ScrollArea` fills all remaining height. Messages animate in with `motion/react`.
- **Message bubbles:** User = `chat-bubble-user ml-6` (right side). AI = `chat-bubble-ai` (left side). Font size `text-[12px]`.
- **Code blocks:** Syntax-highlighted inside bordered `<pre>` blocks with language label.
- **Input bar:** Auto-growing `<textarea>` -- starts at 1 line (`minHeight: 38px`), grows up to `maxHeight: 120px` as user types. Resets to 1 line after send. Send button is `h-9 w-9`.
- **Empty state:** Lightning bolt emoji + "Describe what you want to build"
- **Error state:** Red destructive banner with `AlertCircle` icon
- **Loading state:** 3 animated dots pulsing

### 2. Preview Screen
- **Desktop:** Always visible as right half of editor (`hidden md:flex md:w-1/2`). No button needed.
- **Mobile:** Full-screen overlay (`fixed inset-0 z-50`) opened by Preview button in header. Has its own header with X close button.
- **Implementation:** Uses `srcDoc` attribute on sandboxed `<iframe>` -- NEVER use `doc.open()/write()` (causes cross-origin errors).
- **Shows:** Latest HTML/CSS/JS code block from AI messages.

### 3. Settings Screen (SettingsPage)
- **Layout:** Hub page with 6 color-coded BUTTONS (NOT tabs). Each button opens its own full sub-page. Sub-pages have a back arrow (`ChevronLeft`) to return to hub.
- **Hub background:** `oklch(0.07 0.015 265)` (deep indigo/slate)
- **Hub buttons (order matters):**
  1. **API Keys** -- violet (`border-violet-500/30`) -- OpenRouter key + Gemini key ONLY (no DeepSeek)
  2. **AI Settings** -- blue (`border-blue-500/30`) -- Provider selector (Auto/OpenRouter/Gemini) + model dropdown
  3. **Termux Brain** -- green (`border-green-500/30`) -- Server URL + setup guide
  4. **GitHub & Deploy** -- orange (`border-orange-500/30`) -- Token + repo + deploy status
  5. **Master AI** -- pink (`border-pink-500/30`) -- Full-height chat + on/off toggle
  6. **AI Files** -- cyan (`border-cyan-500/20`) -- Memory + rules files per project, editable
- **Sub-page backgrounds:** Each sub-page has its own color variant
- **AI provider options:** `auto`, `openrouter`, `gemini` ONLY -- DeepSeek is REMOVED

---

## Critical Rules

1. **NEVER split or change the chat/preview layout** unless user asks. Desktop = side by side. Mobile = chat full screen + overlay.
2. **NEVER add tabs to Settings.** It uses hub buttons. Each button opens a full sub-page.
3. **NEVER add DeepSeek back.** It was removed because it's not free and caused errors.
4. **NEVER change the textarea** from auto-growing single-line to fixed height or multi-line.
5. **ALWAYS use `srcDoc` for the preview iframe.** Never use `document.write()`.
6. **ALWAYS restore from GitHub before building** -- workspace resets every Caffeine session.
   ```bash
   # Run this before ANY build:
   curl -s -H "Authorization: token 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" \
     https://api.github.com/repos/richardbrownmiami-commits/devforge-ai/contents/src/frontend/src/hooks/useAIChat.ts \
     | python3 -c "import sys,json,base64; d=json.load(sys.stdin); open('src/frontend/src/hooks/useAIChat.ts','w').write(base64.b64decode(d['content']).decode())"
   ```
7. **Gemini fallbacks are `gemini-2.0-flash` and `gemini-2.0-flash-lite` ONLY.** The 1.5 models are not available in v1beta.
8. **Cloudflare deploy command:**
   ```bash
   cd src/frontend && CLOUDFLARE_API_TOKEN=OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj \
     CLOUDFLARE_ACCOUNT_ID=913f3a2576a358054eba9a58a9573949 \
     npx wrangler pages deploy dist --project-name brainforge
   ```
   Note: Cloudflare project name is `brainforge` (NOT `brainforge-7xn`).

---

## Key Files (fetch from GitHub if missing locally)

| File | Purpose |
|------|---------|
| `src/frontend/src/pages/EditorPage.tsx` | Chat + Preview split layout |
| `src/frontend/src/components/ChatPanel.tsx` | Chat UI + auto-grow textarea |
| `src/frontend/src/components/PreviewPanel.tsx` | iframe preview with srcDoc |
| `src/frontend/src/pages/SettingsPage.tsx` | Hub buttons settings |
| `src/frontend/src/hooks/useAIChat.ts` | AI provider logic + Gemini rotation |
| `src/frontend/src/constants/models.ts` | Model lists (no DeepSeek, no Gemini 1.5) |

---

## BrainForge Suggested Features (To Build Next)

These are suggestions I recommend -- user should confirm before building any:

### High Impact
| Feature | Why |
|---------|-----|
| **Multi-file project support** | Real apps need multiple files (HTML, CSS, JS separate) |
| **Export project as ZIP** | Download all generated files at once |
| **Snapshot/version history UI** | Show list of snapshots, one-click restore per project |
| **One-click deploy to Cloudflare Pages** | Deploy generated app directly from BrainForge |
| **Reminder / sticky notes per project** | Pin a note to a project (what to build next, what's broken) |

### Medium Impact
| Feature | Why |
|---------|-----|
| **Share project link** | Generate a public preview URL for any generated app |
| **Template picker on new project** | Choose from Landing Page, Dashboard, Game, Form, Blank |
| **Auto error fix loop** | If preview JS errors, AI retries fix automatically (up to 3x) |
| **Dark/Light theme toggle** | Sun/Moon button in sidebar |
| **Project search/filter** | Find projects by name when list gets long |

### Future
| Feature | Why |
|---------|-----|
| **TradeArena app** | Fantasy stock trading with NSE/BSE data (planned) |
| **Email integration** | Resend API via Cloudflare Worker (deferred) |
| **PWA improvements** | Better install prompt + offline fallback page |
| **Vector memory** | ChromaDB/Qdrant on VPS for real semantic AI memory |
