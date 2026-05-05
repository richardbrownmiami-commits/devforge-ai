# browser-agent

A Playwright script that opens Caffeine AI in a browser, reads an instruction from the repo, sends it to the chat, and writes the response back to the repo — all headlessly after the first login.

---

## Requirements

```bash
npm install playwright
npx playwright install chromium
```

Set your GitHub PAT as an environment variable so the script can read and write files to the repo:

```bash
export GITHUB_PAT=your_personal_access_token_here
```

---

## First run — save your login session

```bash
node run.js --setup
```

This opens a **visible** browser window pointed at `https://caffeine.ai`.

1. Log in to Caffeine AI manually
2. Navigate to your workspace chat screen
3. Close the browser window

Your session is saved to `user-data/` inside this folder. The script will reuse it on every future run — no re-login required unless the session expires.

> ⚠️ **Never commit `user-data/` to git.** It contains your login session cookies.
> It is already listed in `.gitignore`.

---

## Normal run (headless)

```bash
node run.js
```

The script will:

1. Launch a headless browser using your saved session in `user-data/`
2. Navigate to `https://caffeine.ai`
3. Read the message to send from `browser-agent/instructions.md` in the repo
   - Falls back to `"hi"` if the file is not found
4. Find the chat input, type the message, and press Enter
5. Wait 5 seconds for a response
6. Write the response to `browser-agent/response.md` in the repo
7. Repeat up to **3 times** (hop limit), with a **3-second delay** between hops
8. Stop automatically after 3 hops — no infinite loops

---

## Files

| File | Purpose |
|---|---|
| `run.js` | The main script |
| `instructions.md` | The message sent to Caffeine AI on each run |
| `response.md` | Written by the script — contains the AI's responses |
| `user-data/` | Your saved browser session — **never commit this** |

---

## Changing the instruction

Edit `browser-agent/instructions.md` in the repo. The script reads it fresh on each hop.

Example contents:
```
Search for the latest research on AI memory and summarise the key findings.
```

---

## Troubleshooting

**"No user-data/ folder found"**
Run `node run.js --setup` first.

**"Could not find chat input"**
Your session may have expired. Run `node run.js --setup` again to log in and save a fresh session.

**Responses not writing to repo**
Make sure `GITHUB_PAT` is set and has `repo` scope at `github.com/settings/tokens`.
