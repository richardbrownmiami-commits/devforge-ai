# BrainForge -- CRITICAL REMINDER (Read Every Session)

> ⚠️ The Caffeine workspace RESETS every session. Always restore from GitHub FIRST before making any changes.
> ⚠️ NEVER change Chat, Preview, or Settings screens unless the user explicitly asks.

---

## STEP 1 -- Restore files at the start of EVERY session

```bash
for f in \
  "src/frontend/src/pages/EditorPage.tsx" \
  "src/frontend/src/components/ChatPanel.tsx" \
  "src/frontend/src/pages/SettingsPage.tsx" \
  "src/frontend/src/hooks/useAIChat.ts" \
  "src/frontend/src/constants/models.ts"; do
  curl -s -H "Authorization: token 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" \
    "https://api.github.com/repos/richardbrownmiami-commits/devforge-ai/contents/$f" \
    | python3 -c "import sys,json,base64; d=json.load(sys.stdin); open('/home/ubuntu/workspace/$f','w').write(base64.b64decode(d['content']).decode())"
done
```

---

## STEP 2 -- Before ANY change, verify these 3 screens look correct

### ✅ CHAT SCREEN (EditorPage.tsx + ChatPanel.tsx)

**What it must look like:**
- Chat fills the ENTIRE screen (no side-by-side split with preview)
- Height = `100dvh`
- Header bar: `[<- Back]` | `[Project name]` | `[provider dot + label]` | `[Preview button]`
- **Preview button is always visible** on all screen sizes (desktop + mobile)
- Messages scroll in the middle area with `ScrollArea`
- User bubbles: `chat-bubble-user ml-6` (right-aligned)
- AI bubbles: `chat-bubble-ai` (left-aligned)
- Code blocks: inside bordered `<pre>` with language label
- Input bar at the bottom:
  - `<textarea rows={1}>` that auto-grows from 1 line up to 120px
  - Placeholder: "Enter instruction or question..."
  - `fontSize: 16px` (prevents mobile zoom)
  - Resets to 1 line after send
- After code is generated: "Tap to open preview" shortcut button appears in chat

**Quick verify command:**
```bash
grep -m1 "previewOpen" src/frontend/src/pages/EditorPage.tsx
# Must output: const [previewOpen, setPreviewOpen] = useState(false);
grep -m1 "rows={1}" src/frontend/src/components/ChatPanel.tsx
# Must output: rows={1}
```

---

### ✅ PREVIEW SCREEN

**What it must look like:**
- Always opens as a `fixed inset-0 z-50` full-screen overlay
- Works on ALL screen sizes (not just mobile)
- Header: `[X close button]` | `[Preview -- ProjectName]`
- Body: sandboxed `<iframe>` using `srcDoc` attribute
- Closes with X button, returns to chat

**Quick verify command:**
```bash
grep "fixed inset-0" src/frontend/src/pages/EditorPage.tsx
# Must output a line with: className="fixed inset-0 z-50 bg-background flex flex-col"
```

**Hard rule:** NEVER use `document.write()` or `doc.open()` for the iframe -- causes cross-origin error.

---

### ✅ SETTINGS SCREEN (SettingsPage.tsx)

**What it must look like:**
- A HUB PAGE with 6 large color-coded buttons (NOT tabs, NOT a vertical list of sections)
- Background: `oklch(0.07 0.015 265)` (deep indigo)
- Top: Settings icon + "Settings" title + Active AI status row
- **6 buttons in a 2-column grid:**

| # | Label | Color | What's inside |
|---|-------|-------|---------------|
| 1 | API Keys | Violet | OpenRouter key + Gemini key (NO DeepSeek) |
| 2 | AI Settings | Blue | Provider selector (Auto/OpenRouter/Gemini) + model |
| 3 | Termux Brain | Green | Server URL + test button + setup guide |
| 4 | GitHub & Deploy | Orange | Token + repo + live URLs |
| 5 | Master AI | Pink | Full-height chat + on/off toggle |
| 6 | AI Files | Cyan | Memory + rules files per project |

- Each button click opens a full sub-page with `<- back` arrow
- Each sub-page has its own background color matching its button color
- AI providers = `auto`, `openrouter`, `gemini` ONLY -- **DeepSeek is permanently removed**

**Quick verify command:**
```bash
grep -c "HUB_BUTTONS" src/frontend/src/pages/SettingsPage.tsx
# Must output: 1 (or more)
grep "deepseek\|DeepSeek\|deepSeek" src/frontend/src/pages/SettingsPage.tsx
# Must output nothing (DeepSeek is gone)
```

---

## STEP 3 -- Deploy command (always use this)

```bash
cd src/frontend && \
  CLOUDFLARE_API_TOKEN=OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj \
  CLOUDFLARE_ACCOUNT_ID=913f3a2576a358054eba9a58a9573949 \
  npx wrangler pages deploy dist --project-name brainforge
```

> Project name is `brainforge` -- NOT `brainforge-7xn`

---

## Permanent Rules (never break these)

1. Chat = full screen. Preview = full-screen overlay. NEVER split side by side.
2. Settings = 6-button hub. NEVER convert to tabs or accordion sections.
3. DeepSeek = permanently removed. Never add it back.
4. Textarea = auto-growing, starts at 1 line. Never make it fixed height.
5. Preview iframe = always `srcDoc`. Never `document.write()`.
6. Gemini models = `gemini-2.0-flash` and `gemini-2.0-flash-lite` ONLY. No 1.5 models.
7. Always restore from GitHub first. Always push to GitHub after changes.

---

## Suggested Features (not yet built -- confirm with user before starting)

1. Multi-file project support
2. Export project as ZIP
3. Snapshot / version history UI
4. One-click deploy to Cloudflare Pages from inside BrainForge
5. Auto error fix loop (AI retries up to 3x)
6. Template picker when creating a new project
7. Dark/Light theme toggle in sidebar
