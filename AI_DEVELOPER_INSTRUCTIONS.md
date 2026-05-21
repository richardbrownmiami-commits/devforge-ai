# 🤖 BrainForge AI Developer Instructions

**Purpose:** Step-by-step guide for AI to autonomously build, test, and deploy code  
**Updated:** May 21, 2026

---

## ✅ BEFORE YOU START

**Verify you have access to:**

```javascript
// Check these are set in your environment:
GitHub_PAT = "ghp_..." (check from browser agent or admin settings)
CF_API_TOKEN = "OBYob5EKKSE9cS0Xu-rZMkkKs46YnHIR0qN94lZj"
CF_ACCOUNT_ID = "913f3a2576a358054eba9a58a9573949"
WORKER_SECRET = "2200"
REPO = "richardbrownmiami-commits/devforge-ai"
```

**Confirm these are accessible:**
- ✅ GitHub API (https://api.github.com)
- ✅ Cloudflare API (https://api.cloudflare.com)
- ✅ Worker endpoint (https://brainforge-api.richard-brown-miami.workers.dev)
- ✅ Live site (https://brainforge-7xn.pages.dev)

---

## 🏗️ UNDERSTANDING THE ARCHITECTURE

### **Frontend (React 19 + TypeScript)**
```
src/frontend/src/
├── App.tsx                 # Main router, PIN lock, maintenance gate
├── pages/
│   ├── ApkBuilderPage.tsx     # Android APK builder with GitHub Actions
│   ├── SettingsPage.tsx       # User settings, GitHub token config
│   └── admin/
│       ├── AdminDashboardPage.tsx
│       ├── MasterAIAdminPage.tsx
│       ├── CloudflarePage.tsx
│       ├── StatusPage.tsx
│       └── ... (15+ admin pages)
├── components/
│   ├── Sidebar.tsx
│   ├── OnboardingWizard.tsx
│   ├── UserLoginGate.tsx
│   └── FeedbackWidget.tsx
└── lib/
    └── utils.ts            # Helper functions
```

### **Backend (Cloudflare Worker)**
```
cloudflare-worker/src/
├── index.ts                # Main worker code
└── ... (middleware, routes)

Endpoints:
GET  /health               # Health check
POST /api/generate         # AI code generation
POST /api/deploy           # Deploy to GitHub Pages
```

### **Deployment**
```
GitHub push → GitHub Actions → Build + Test → Wrangler deploy → Cloudflare Pages
(automatic, no manual action needed)
```

---

## 📋 STEP-BY-STEP: ADD A NEW FEATURE

### **Phase 1: Planning & Analysis**

**Task:** "Add Google OAuth login to BrainForge"

**Step 1.1: Read the current code**
```bash
# Read the settings page to understand auth structure
GET https://api.github.com/repos/richardbrownmiami-commits/devforge-ai/contents/src/frontend/src/pages/SettingsPage.tsx
Headers: Authorization: token {GITHUB_PAT}

# Decode the base64 response to understand:
- How tokens are currently stored
- What settings exist
- Where to add new auth method
```

**Step 1.2: Read related files**
```bash
# Read App.tsx to understand routing
GET /repos/.../contents/src/frontend/src/App.tsx

# Read package.json to see dependencies
GET /repos/.../contents/.old/src/frontend/package.json

# Check if Supabase is already integrated
GET /repos/.../contents/src/frontend/src/components/UserLoginGate.tsx
```

**Step 1.3: Create implementation plan**
```markdown
## Feature: Google OAuth Authentication

### Architecture:
1. Frontend: Add Supabase Auth integration
2. UI: Login button → Google OAuth dialog
3. Storage: Save user token in localStorage + Supabase DB
4. Worker: Add /api/auth endpoint to verify tokens

### Files to modify:
- src/frontend/src/components/UserLoginGate.tsx (add Google login button)
- src/frontend/src/pages/SettingsPage.tsx (show logged-in user)
- cloudflare-worker/src/index.ts (add auth endpoint)
- .old/src/frontend/package.json (add @supabase/supabase-js)

### Testing:
- Test login flow works
- Test token persistence
- Test worker authentication
```

### **Phase 2: Implementation**

**Step 2.1: Create a feature branch**
```bash
POST https://api.github.com/repos/richardbrownmiami-commits/devforge-ai/git/refs
Headers: Authorization: token {GITHUB_PAT}
Body:
{
  "ref": "refs/heads/feature/google-oauth",
  "sha": "5dc4cf97f9e8a5de0dbbbb3bb1406c9deb06a9bd"  # Current main commit
}
```

**Step 2.2: Update dependencies**
```bash
# Read current package.json
GET /repos/.../contents/.old/src/frontend/package.json

# Extract dependencies object
# Add: "@supabase/supabase-js": "^2.38.0"

# Write updated package.json
PUT /repos/.../contents/.old/src/frontend/package.json
Headers: Authorization: token {GITHUB_PAT}
Body:
{
  "message": "feat: add Supabase for Google OAuth",
  "content": "base64(updated-package.json)",
  "sha": "existing-sha-from-previous-read",
  "branch": "feature/google-oauth"
}
```

**Step 2.3: Create login component**
```bash
# Create new component: GoogleAuthButton.tsx
PUT /repos/.../contents/src/frontend/src/components/GoogleAuthButton.tsx
Headers: Authorization: token {GITHUB_PAT}
Body:
{
  "message": "feat: add Google OAuth authentication button",
  "content": "base64(new-component-code)",
  # NO sha field for new files!
  "branch": "feature/google-oauth"
}

# Component code example:
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export function GoogleAuthButton() {
  const [loading, setLoading] = useState(false);
  
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const supabase = createClient(
        process.env.REACT_APP_SUPABASE_URL,
        process.env.REACT_APP_SUPABASE_ANON_KEY
      );
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      
      if (error) throw error;
      // User redirected to Google OAuth
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button onClick={handleGoogleLogin} disabled={loading}>
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
}
```

**Step 2.4: Update UserLoginGate component**
```bash
# Read current UserLoginGate.tsx
GET /repos/.../contents/src/frontend/src/components/UserLoginGate.tsx

# Modify to use GoogleAuthButton
PUT /repos/.../contents/src/frontend/src/components/UserLoginGate.tsx
Body:
{
  "message": "feat: integrate Google OAuth in login gate",
  "content": "base64(updated-code)",
  "sha": "file-sha-from-previous-read",
  "branch": "feature/google-oauth"
}

# Code example:
import { GoogleAuthButton } from './GoogleAuthButton';

export function UserLoginGate({ children }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('bf_user');
    setUser(user ? JSON.parse(user) : null);
  }, []);
  
  if (!user) {
    return (
      <div className="login-page">
        <h1>BrainForge</h1>
        <GoogleAuthButton />
      </div>
    );
  }
  
  return <>{children}</>;
}
```

**Step 2.5: Update Worker for auth endpoint**
```bash
# Read current worker code
GET /repos/.../contents/cloudflare-worker/src/index.ts

# Add new endpoint
PUT /repos/.../contents/cloudflare-worker/src/index.ts
Body:
{
  "message": "feat: add /api/auth endpoint for token verification",
  "content": "base64(updated-worker-code)",
  "sha": "file-sha",
  "branch": "feature/google-oauth"
}

# Code example to add:
router.post('/api/auth/verify', async (request) => {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'No token' }), { status: 401 });
  }
  
  try {
    // Verify token with Supabase
    const response = await fetch('https://YOUR-SUPABASE-URL/auth/v1/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    
    if (!response.ok) throw new Error('Invalid token');
    
    const user = await response.json();
    return new Response(JSON.stringify({ user }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 401 });
  }
});
```

### **Phase 3: Testing**

**Step 3.1: Verify local build**
```bash
# The AI should run (or verify the process):
npm install
npm run build
npm run typecheck

# Expected: No errors, build succeeds
```

**Step 3.2: Create Pull Request**
```bash
POST https://api.github.com/repos/richardbrownmiami-commits/devforge-ai/pulls
Headers: Authorization: token {GITHUB_PAT}
Body:
{
  "title": "feat: Add Google OAuth authentication",
  "body": """
## 🎯 What Changed?
- Integrated Supabase for authentication
- Added Google OAuth login button
- Created auth verification endpoint in Worker
- Users can now login with Google account

## 📝 Files Modified
- src/frontend/src/components/GoogleAuthButton.tsx (new)
- src/frontend/src/components/UserLoginGate.tsx (updated)
- cloudflare-worker/src/index.ts (updated)
- .old/src/frontend/package.json (updated)

## ✅ Testing
- [x] Google login button displays
- [x] OAuth flow completes successfully
- [x] Token is stored in localStorage
- [x] Worker /api/auth/verify endpoint works
- [x] TypeScript checks pass
- [x] Build succeeds

## 🚀 Deployment
- Merge to main → GitHub Actions runs tests → Deploys to Cloudflare Pages
""",
  "head": "feature/google-oauth",
  "base": "main"
}

# Response will include:
{
  "number": 123,
  "html_url": "https://github.com/.../pull/123"
}
```

### **Phase 4: Merge & Deploy**

**Step 4.1: Merge PR**
```bash
PUT https://api.github.com/repos/richardbrownmiami-commits/devforge-ai/pulls/123/merge
Headers: Authorization: token {GITHUB_PAT}
Body:
{
  "commit_message": "Merge: Add Google OAuth authentication (PR #123)",
  "merge_method": "squash"
}
```

**Step 4.2: Monitor deployment**
```bash
# Check GitHub Actions status
GET https://api.github.com/repos/richardbrownmiami-commits/devforge-ai/actions/runs?per_page=1
Headers: Authorization: token {GITHUB_PAT}

# Expected response:
{
  "workflow_runs": [
    {
      "id": 999999,
      "status": "completed",
      "conclusion": "success",
      "name": "Deploy to Cloudflare Pages",
      "html_url": "https://github.com/.../actions/runs/999999"
    }
  ]
}

# If status is still "in_progress", wait 2-3 minutes
```

**Step 4.3: Verify live deployment**
```bash
# Test the live site
GET https://brainforge-7xn.pages.dev

# Expected: Login page shows Google OAuth button
# Click button → OAuth flow should work
```

---

## 🚨 COMMON TASKS

### **Task: Fix a Bug**

```bash
# 1. Read the buggy file
GET /repos/.../contents/src/frontend/src/pages/SettingsPage.tsx

# 2. Identify the issue by reading the code
# 3. Create a hotfix branch (for urgent bugs)
POST /repos/.../git/refs
{
  "ref": "refs/heads/hotfix/login-button-unresponsive",
  "sha": "current-main-commit"
}

# 4. Fix the file
PUT /repos/.../contents/src/frontend/src/pages/SettingsPage.tsx
{
  "message": "fix: prevent login button double-click issue",
  "content": "base64(fixed-code)",
  "sha": "file-sha",
  "branch": "hotfix/login-button-unresponsive"
}

# 5. Create PR, merge, deploy (same as above)
```

### **Task: Update Worker Environment Variable**

```bash
# 1. Update in GitHub secrets
# OR update via Cloudflare API:

PUT https://api.cloudflare.com/client/v4/accounts/913f3a2576a358054eba9a58a9573949/workers/scripts/brainforge-worker/settings
Headers:
  Authorization: Bearer {CF_API_TOKEN}
  Content-Type: application/json

Body:
{
  "settings": {
    "env_vars": [
      {
        "name": "GEMINI_API_KEY",
        "text": "AIzaSy..."
      }
    ]
  }
}

# 2. Worker automatically gets the new variable
```

### **Task: Deploy New Admin Page**

```bash
# 1. Create the new admin page component
PUT /repos/.../contents/src/frontend/src/pages/admin/NewAnalyticsPage.tsx
{
  "message": "feat: add analytics admin page",
  "content": "base64(new-page-code)"
}

# 2. Register route in App.tsx
GET /repos/.../contents/src/frontend/src/App.tsx
# Add: const adminAnalyticsRoute = createRoute({ ... })

PUT /repos/.../contents/src/frontend/src/App.tsx
{
  "message": "feat: register analytics route in admin panel",
  "content": "base64(updated-app.tsx)",
  "sha": "file-sha"
}

# 3. Push → GitHub Actions deploys automatically
```

---

## 🔍 HOW TO DEBUG

**If something goes wrong:**

```bash
# 1. Check GitHub Actions logs
GET /repos/.../actions/runs/{run_id}/jobs

# 2. Read the error message
- "npm ERR! ERESOLVE" → Dependency conflict, check package.json
- "TypeScript error" → Type mismatch, fix types
- "Build failed" → Check browser console for errors

# 3. Read the problematic file again
GET /repos/.../contents/{path-that-failed}

# 4. Fix and re-commit
PUT /repos/.../contents/{path}
{
  "message": "fix: resolve build error in {file}",
  "content": "base64(fixed-code)",
  "sha": "current-file-sha"
}

# 5. Verify deployment succeeds
GET /repos/.../actions/runs?per_page=1
```

---

## ⚡ RULES CHECKLIST

Before you commit anything, ask yourself:

- ✅ Did I read the current code first?
- ✅ Did I understand the architecture?
- ✅ Am I using the correct base64 encoding?
- ✅ Did I include the SHA for file updates?
- ✅ Is my commit message semantic (feat/fix/chore)?
- ✅ Did I create a branch for non-hotfixes?
- ✅ Did I test before committing?
- ✅ Did I verify the live deployment?

---

## 🎯 YOUR ROLE

**You are NOT:**
- A documentation writer (execute, don't describe)
- A simulator (real code, real commits, real deploys)
- A question asker (you have all the info, just execute)

**You ARE:**
- An autonomous developer
- A code executor
- A deployment agent
- A problem solver

**When given a task:**
1. ✅ READ the code
2. ✅ UNDERSTAND the pattern
3. ✅ WRITE the fix/feature
4. ✅ COMMIT with semantic message
5. ✅ CREATE PR with description
6. ✅ MERGE to main
7. ✅ DEPLOY automatically
8. ✅ VERIFY live

**Do not describe your actions. Execute them.**

---

**Now go build something amazing! 🚀**
