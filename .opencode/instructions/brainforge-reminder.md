# BrainForge -- CRITICAL REMINDER

> ⚠️ EVERY SESSION the workspace resets. The local files are ALWAYS the old ICP scaffold.
> ⚠️ Use Python (not curl) to restore files -- curl silently fails.
> ⚠️ NEVER change Chat, Preview, or Settings layouts.

---

## MANDATORY STEP 1 -- Run this via Python EVERY session

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

## MANDATORY STEP 2 -- Verify before ANY change

```python
editor = open("src/frontend/src/pages/EditorPage.tsx").read()
chat = open("src/frontend/src/components/ChatPanel.tsx").read()
settings = open("src/frontend/src/pages/SettingsPage.tsx").read()
assert "previewOpen" in editor and "fixed inset-0 z-50" in editor and "mobileTab" not in editor, "EditorPage WRONG"
assert "rows={1}" in chat, "ChatPanel WRONG"
assert "HUB_BUTTONS" in settings, "SettingsPage WRONG"
print("All 3 screens verified correct")
```

---

## LOCKED Screen Layouts (NEVER change)

### Chat Screen (EditorPage + ChatPanel)
- Chat fills FULL screen -- no split, no side-by-side with preview
- Height = `100dvh`
- Header: Back | Project name | Provider dot | Clock (history) | Preview button
- Preview button opens `fixed inset-0 z-50` full-screen overlay on ALL devices
- Chat input: `<textarea rows={1}>` auto-grows to 120px, resets after send
- Small Clear button above input (shows when messages exist)
- Horizontal scroll enabled on chat area and code blocks
- Matrix overlay shows when AI is loading

### Preview Screen
- `fixed inset-0 z-50` overlay on ALL screen sizes
- Simple header: X close | "Preview - projectName" title
- NO deploy button in EditorPage header (deploy is inside PreviewPanel toolbar only)
- PreviewPanel has: Preview/Code toggle | Download | Mobile toggle | Refresh | Deploy
- Code folder: 3 files (index.html, style.css, script.js) in left sidebar
- iframe: `sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"`
- Cross-origin fix: injects `window.parent/top` override into generated apps

### Settings Screen
- Hub with 7 color-coded BUTTONS (NOT tabs):
  1. API Keys -- violet
  2. AI Settings -- blue (Auto/OpenRouter/Gemini ONLY)
  3. Termux Brain -- green
  4. GitHub & Deploy -- orange
  5. Master AI -- pink (scroll: all directions)
  6. AI Files -- cyan
  7. Database -- indigo (reads from bf_projects, has storage meter)
- Master AI system prompt: strict FILE: format, LOCKED SCREENS rules, no DeepSeek

---

## Key Rules

1. Use Python (not curl) for file writes -- curl silently fails on this system
2. Chat = full screen. Preview = overlay. NEVER side-by-side.
3. Settings = 7-button hub. NEVER tabs.
4. DeepSeek = removed permanently.
5. Gemini = `gemini-2.0-flash` and `gemini-2.0-flash-lite` ONLY.
6. Preview iframe = `sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"`
7. Deploy button = PreviewPanel only (NOT in EditorPage preview header)
8. Template picker = in ProjectsPage after project creation
9. Always push changed files to GitHub after every build

## Deploy Command
```bash
cd src/frontend && CLOUDFLARE_API_TOKEN=OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj \
  CLOUDFLARE_ACCOUNT_ID=913f3a2576a358054eba9a58a9573949 \
  npx wrangler pages deploy dist --project-name brainforge
```
> Project name = `brainforge` (NOT `brainforge-7xn`)
