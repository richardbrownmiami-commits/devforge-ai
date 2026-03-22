# How to Change the Worker Secret (2200)

If you ever need to change the secret password from `2200` to something new, follow every step below in order. Missing any step will break BrainForge.

---

## Step 1 -- Choose a New Secret

Pick a new password. Example: `bf_secure_9999`
Write it down somewhere safe before you start.

---

## Step 2 -- Update Cloudflare Worker Environment Variable

1. Go to **dash.cloudflare.com**
2. Workers & Pages → **brainforge-api**
3. Click **Settings** tab
4. Under **Environment Variables** find `BRAINFORGE_SECRET`
5. Click **Edit** → change the value to your new secret
6. Click **Save**

This takes effect immediately -- no redeploy needed.

---

## Step 3 -- Update the Worker Code

The Worker code has the secret hardcoded as a fallback check.

1. Go to **dash.cloudflare.com → Workers & Pages → brainforge-api → Edit Code**
2. Find this line:
   ```javascript
   if (req.headers.get('X-BrainForge-Secret') !== '2200') {
   ```
3. Change `2200` to your new secret:
   ```javascript
   if (req.headers.get('X-BrainForge-Secret') !== 'your_new_secret') {
   ```
4. Click **Save and Deploy**

OR if you want Ara (Claude on Caffeine) to do it automatically:
- Share your Cloudflare API token and account ID
- Tell Ara the new secret value
- Ara will deploy the updated Worker directly

---

## Step 4 -- Update BrainForge Frontend

The frontend sends the secret on every API call. You need to update it in the app settings AND in the code.

### In the App (localStorage)
1. Open **https://brainforge-7xn.pages.dev**
2. Go to **Settings → GitHub & Deploy**
3. Find **Worker Secret** field
4. Change the value to your new secret
5. Save

### In the Source Code
1. Open your GitHub repo
2. Search for `2200` in the codebase
3. Files that will need updating:
   - `src/frontend/src/pages/SettingsPage.tsx` -- default seed value
   - Any other file referencing `BRAINFORGE_SECRET` or `2200` as a default
4. Replace all instances of `2200` with your new secret
5. Commit and push

---

## Step 5 -- Rebuild and Deploy BrainForge Frontend

After changing the source code:

**Option A -- Via Caffeine (Ara does it):**
1. Open a new Caffeine session
2. Tell Ara: "Change the worker secret from 2200 to [new secret] and redeploy"
3. Ara will update the code, build, and deploy automatically

**Option B -- Manual via Wrangler:**
```bash
cd devforge-ai
npm install
npm run build
npx wrangler pages deploy dist --project-name brainforge
```

**Option C -- Via Cloudflare Pages Dashboard:**
1. dash.cloudflare.com → Workers & Pages → brainforge (Pages)
2. Click **Create new deployment**
3. Upload the `dist/` folder

---

## Step 6 -- Update Telegram Bot (if using)

If your Telegram bot (@araislivingbot) calls the Worker API:
1. Open your Telegram bot Worker code
2. Find the secret header value
3. Update it to the new secret
4. Redeploy the Telegram bot Worker the same way as Step 3

---

## Step 7 -- Test Everything

Run these checks after updating:

```
# Should return {error:Unauthorized}
https://brainforge-api.richard-brown-miami.workers.dev/api/projects

# Should return your projects (in browser dev tools or Postman with header)
Header: X-BrainForge-Secret: your_new_secret
URL: https://brainforge-api.richard-brown-miami.workers.dev/api/projects
```

Also open BrainForge and confirm:
- Projects load correctly
- Chat works
- AI responds
- No 403 errors in browser console (F12 → Console)

---

## Quick Reference -- All Places Secret Appears

| Location | Where to change it |
|---|---|
| Cloudflare Worker env var | dash.cloudflare.com → Workers → brainforge-api → Settings → Variables |
| Worker code hardcoded check | dash.cloudflare.com → Workers → brainforge-api → Edit Code |
| BrainForge app localStorage | Settings → GitHub & Deploy → Worker Secret field |
| BrainForge source code | `src/frontend/src/pages/SettingsPage.tsx` |
| Telegram bot Worker (if used) | dash.cloudflare.com → Workers → your-telegram-bot → Edit Code |

---

## If Something Breaks

If BrainForge stops loading projects or shows errors after changing the secret:

1. **Check browser console** (F12 → Console) -- look for 403 errors
2. **Most likely cause:** Secret in localStorage does not match Worker env var
3. **Quick fix:** Go to Settings → GitHub & Deploy → update Worker Secret to match what you set in Step 2
4. **If still broken:** Temporarily set `BRAINFORGE_SECRET` back to `2200` in Cloudflare to restore access, then redo the steps carefully

---

## Notes

- The secret is stored in **localStorage** on your device -- if you clear localStorage, go to Settings and re-enter it
- The secret is never stored in the GitHub repo source code as a committed value
- Rotate the secret every few months for best security
- Never share the secret in a public place or commit it to a public repo
