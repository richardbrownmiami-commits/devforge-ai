# ⚡ AI Quick Start - BrainForge Development

**TL;DR:** You have full GitHub + Cloudflare access. Stop simulating. Start coding.

---

## 🎯 Your Credentials (Already Set)

```
GitHub PAT: Available from environment/localStorage
Cloudflare API Token: Available from environment
GitHub Repo: richardbrownmiami-commits/devforge-ai
Worker URL: https://brainforge-api.richard-brown-miami.workers.dev
Live Site: https://brainforge-7xn.pages.dev
```

---

## 📌 The Pattern You Follow

**Every time someone asks you to build/fix something:**

```
1️⃣  Read the code
2️⃣  Create a branch (or hotfix)
3️⃣  Make changes
4️⃣  Commit + Push
5️⃣  Create PR + Merge
6️⃣  GitHub Actions deploys automatically
7️⃣  Verify live
```

---

## 🚀 One-Minute Examples

### **Add a Button to Admin Page**

```
1. GET /repos/.../contents/src/frontend/src/pages/admin/AdminDashboardPage.tsx
2. Add button component in code
3. PUT file back with new code
4. Commit message: "feat: add export-data button to admin dashboard"
5. Create PR → Merge → Done (auto-deploys in 2 min)
```

### **Fix a Bug in Worker**

```
1. GET /repos/.../contents/cloudflare-worker/src/index.ts
2. Find and fix the bug
3. PUT file back
4. Commit: "fix: prevent 500 error in /api/deploy endpoint"
5. Merge → Auto-deploys
```

### **Add New Environment Variable**

```
1. PUT to Cloudflare API to update env vars
2. OR add to GitHub secrets (.env.local)
3. GitHub Actions picks it up automatically
```

---

## 🔑 Key URLs

| Purpose | URL |
|---------|-----|
| **Read file** | `GET /repos/richardbrownmiami-commits/devforge-ai/contents/{path}` |
| **Write file** | `PUT /repos/richardbrownmiami-commits/devforge-ai/contents/{path}` |
| **Create branch** | `POST /repos/richardbrownmiami-commits/devforge-ai/git/refs` |
| **Create PR** | `POST /repos/richardbrownmiami-commits/devforge-ai/pulls` |
| **Check deployment** | `GET /repos/richardbrownmiami-commits/devforge-ai/actions/runs` |
| **Test Worker** | `GET https://brainforge-api.richard-brown-miami.workers.dev/health` |

---

## ⚠️ Most Common Mistakes

❌ **Don't:**
- Simulate actions without executing
- Forget to read SHA before updating files
- Push to main without PR (except hotfixes)
- Hardcode secrets
- Update without testing

✅ **Do:**
- Read first, write second
- Always include SHA for updates
- Create branches for features
- Use env vars for secrets
- Verify deployment works

---

## 🧠 The Secret Sauce

**Why most AIs fail at autonomous development:**

They describe → they don't execute

**You succeed because:**

You actually call the APIs → actually write commits → actually deploy

---

## 📚 Full Documentation

- **System Prompt:** `AI_SYSTEM_PROMPT.md` (architecture + all API endpoints)
- **Developer Guide:** `AI_DEVELOPER_INSTRUCTIONS.md` (step-by-step examples)
- **This File:** Quick reference

---

## 🎬 Let's Go

When you're ready to code:

1. ✅ Confirm you have GitHub token access
2. ✅ Read the relevant code files
3. ✅ Make your changes
4. ✅ Push to GitHub
5. ✅ GitHub Actions handles deployment
6. ✅ Verify on live site

**No describing. No simulating. Just building.**

---

**Let's make BrainForge legendary! 🚀**
