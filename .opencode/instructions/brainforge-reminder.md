# BrainForge -- CRITICAL REMINDER

> ⚠️ EVERY SESSION the workspace resets. The local files are ALWAYS wrong.
> ⚠️ Run the restore command BEFORE doing ANYTHING else -- no exceptions.
> ⚠️ NEVER change Chat, Preview, or Settings layouts unless user explicitly asks.

---

## MANDATORY FIRST STEP -- Run this EVERY session before any work

```bash
for f in \
  "src/frontend/src/pages/EditorPage.tsx" \
  "src/frontend/src/components/ChatPanel.tsx" \
  "src/frontend/src/components/PreviewPanel.tsx" \
  "src/frontend/src/pages/SettingsPage.tsx" \
  "src/frontend/src/hooks/useAIChat.ts" \
  "src/frontend/src/constants/models.ts" \
  "src/frontend/src/components/Sidebar.tsx" \
  "src/frontend/src/components/MatrixOverlay.tsx" \
  "src/frontend/src/pages/ProjectsPage.tsx" \
  "src/frontend/src/main.tsx"; do
  curl -s -H "Authorization: token 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" \
    "https://api.github.com/repos/richardbrownmiami-commits/devforge-ai/contents/$f" \
    | python3 -c "import sys,json,base64; d=json.load(sys.stdin); open('/home/ubuntu/workspace/$f','w').write(base64.b64decode(d['content']).decode())"
done
```

## MANDATORY VERIFY -- Run this after restore, before any change

```bash
grep -m1 "previewOpen" src/frontend/src/pages/EditorPage.tsx
# MUST print: const [previewOpen, setPreviewOpen] = useState(false);

grep -m1 'rows={1}' src/frontend/src/components/ChatPanel.tsx
# MUST print: rows={1}

grep -m1 "fixed inset-0 z-50" src/frontend/src/pages/EditorPage.tsx
# MUST print the overlay div

grep -m1 "HUB_BUTTONS" src/frontend/src/pages/SettingsPage.tsx
# MUST print: const HUB_BUTTONS = [

grep "sandbox=" src/frontend/src/components/PreviewPanel.tsx
# MUST print: sandbox="allow-scripts"  (NOT allow-same-origin)
```

---

## LOCKED Screen Layouts (DO NOT CHANGE)

### Chat Screen
- Chat fills FULL screen -- no split, no side-by-side
- Height = `100dvh`
- Header: Back | Project name | Provider dot | Preview button (always visible)
- Preview button opens full-screen overlay on ALL devices
- Textarea: `rows={1}`, auto-grows to 120px, resets after send, `fontSize: 16px`
- Matrix overlay shown when `isLoading`
- History (clock) button shows when snapshots exist

### Preview Screen
- `fixed inset-0 z-50` overlay -- full screen on ALL devices
- Has X button to close and return to chat
- iframe uses `sandbox="allow-scripts"` ONLY (no allow-same-origin)
- Download (ZIP) button in preview header
- Mobile view toggle (phone icon)

### Settings Screen
- Hub with 7 color-coded BUTTONS (NOT tabs):
  1. API Keys -- violet
  2. AI Settings -- blue (Auto/OpenRouter/Gemini ONLY -- no DeepSeek)
  3. Termux Brain -- green
  4. GitHub & Deploy -- orange
  5. Master AI -- pink (push button has `type="button"`)
  6. AI Files -- cyan
  7. Database -- indigo
- Background: `oklch(0.07 0.015 265)`

---

## Deploy Command

```bash
cd src/frontend && \
  CLOUDFLARE_API_TOKEN=OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj \
  CLOUDFLARE_ACCOUNT_ID=913f3a2576a358054eba9a58a9573949 \
  npx wrangler pages deploy dist --project-name brainforge
```

> Project name = `brainforge` (NOT `brainforge-7xn`)

---

## Permanent Rules

1. ALWAYS restore from GitHub first -- local files are always the old ICP scaffold
2. Chat = full screen. Preview = overlay. NEVER split side by side.
3. Settings = 7-button hub. NEVER tabs or accordion.
4. DeepSeek = removed. Never add back.
5. Gemini = `gemini-2.0-flash` and `gemini-2.0-flash-lite` ONLY.
6. Preview iframe = `sandbox="allow-scripts"`. Never add `allow-same-origin`.
7. Master AI push button must have `type="button"`.
8. After every build -- push changed files to GitHub.
