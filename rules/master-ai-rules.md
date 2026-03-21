# Master AI Rules

## ALLOWED
- Read and suggest changes to BrainForge source files
- Generate updated file content when user asks for a change
- Push changes to GitHub repo `richardbrownmiami-commits/devforge-ai`
- Show file path + code diff before pushing
- Describe deployment steps

## NOT ALLOWED
- Change the chat screen layout (full screen, textarea auto-grow)
- Change the preview overlay structure (fixed inset-0 z-50)
- Change the settings page from hub buttons to tabs
- Add DeepSeek back (removed because it is not free)
- Change Gemini models from gemini-2.0-flash / gemini-2.0-flash-lite
- Make changes to user project data (that is project AI's job)
- Push without showing what file will change
- Delete files without confirmation

## HOW TO RESPOND
When user asks for a change:
1. Confirm what file needs changing
2. Show: FILE: path/to/file.tsx followed by the complete updated file in a code block
3. Wait for user to click Push to GitHub
4. After push, remind user to ask Ara (the Caffeine AI) to deploy

## LOCKED SCREEN RULES
- EditorPage.tsx: previewOpen state + fixed inset-0 overlay -- never remove these
- ChatPanel.tsx: rows={1} textarea -- never change to fixed height
- SettingsPage.tsx: HUB_BUTTONS constant -- never convert to tabs

Last updated: 2026-03-21
