# BrainForge -- CRITICAL REMINDER (Read Every Session)

> ⚠️ NEVER change the layout of Chat, Preview, or Settings screens unless the user EXPLICITLY asks.

---

## LOCKED Screen Layouts

### 1. Chat Screen (EditorPage + ChatPanel)
- **Chat fills the FULL screen** -- no split, no side-by-side with preview
- **Height:** `100dvh`
- **Header:** Back button | Project name | Provider dot | **Preview button (always visible, all screen sizes)**
- **Preview button** in header opens full-screen overlay on ALL devices (not just mobile)
- **Input bar:** Auto-growing `<textarea>` -- starts 1 line (`minHeight: 38px`), grows to `maxHeight: 120px`. Resets after send.
- **Shortcut:** After AI generates code, a `Tap to open preview` button appears in the chat feed
- **Messages:** `ScrollArea` fills remaining height. User bubbles `chat-bubble-user ml-6`, AI bubbles `chat-bubble-ai`
- **Font:** `text-[12px]` for messages, `text-[11px]` for labels

### 2. Preview Screen
- **Always a full-screen overlay** (`fixed inset-0 z-50`) -- on ALL screen sizes
- Opened by the Preview button in the chat header
- Has its own header with X button to close and return to chat
- **Implementation:** `srcDoc` on sandboxed `<iframe>` -- NEVER `document.write()` (cross-origin error)

### 3. Settings Screen (SettingsPage)
- **Hub with 6 color-coded BUTTONS** (NOT tabs, NOT a split layout)
- Each button opens its own full sub-page with a back arrow
- **Hub buttons (order and colors are fixed):**
  1. API Keys -- violet
  2. AI Settings -- blue
  3. Termux Brain -- green
  4. GitHub & Deploy -- orange
  5. Master AI -- pink
  6. AI Files -- cyan
- **AI providers:** `auto`, `openrouter`, `gemini` ONLY -- DeepSeek is permanently removed

---

## Critical Build Rules

1. Chat = full screen. Preview = full-screen overlay. NEVER split them side by side.
2. Settings = hub buttons only. NEVER convert to tabs.
3. DeepSeek is removed permanently. Never add it back.
4. Textarea is always auto-growing single line. Never make it fixed height.
5. Preview always uses `srcDoc`. Never use `document.write()`.
6. Gemini fallbacks: `gemini-2.0-flash` and `gemini-2.0-flash-lite` ONLY (1.5 not available in v1beta).
7. Cloudflare project name is `brainforge` (NOT `brainforge-7xn`).

## Restore Commands (run before any build)
```bash
# Restore key files from GitHub
for f in "src/frontend/src/hooks/useAIChat.ts" "src/frontend/src/pages/EditorPage.tsx" "src/frontend/src/components/ChatPanel.tsx" "src/frontend/src/pages/SettingsPage.tsx"; do
  curl -s -H "Authorization: token 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" \
    "https://api.github.com/repos/richardbrownmiami-commits/devforge-ai/contents/$f" \
    | python3 -c "import sys,json,base64; d=json.load(sys.stdin); open('$f','w').write(base64.b64decode(d['content']).decode())"
done
```

## Deploy Command
```bash
cd src/frontend && CLOUDFLARE_API_TOKEN=OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj \
  CLOUDFLARE_ACCOUNT_ID=913f3a2576a358054eba9a58a9573949 \
  npx wrangler pages deploy dist --project-name brainforge
```

## Suggested Features (Pending)
1. Multi-file project support
2. Export project as ZIP
3. Snapshot / version history UI
4. One-click deploy to Cloudflare Pages
5. Auto error fix loop (AI retries up to 3x)
6. Template picker on new project
7. Dark/Light theme toggle
