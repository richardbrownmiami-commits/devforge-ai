# BrainForge TODO List
> Last Updated: 2026-03-26

---

## 🔴 Urgent (Abhi Karna Hai)

- [ ] GitHub token mein `workflow` scope add karo
  - `github.com/settings/tokens` → Edit → workflow ✓ → Update
  - Phir naya token Caffeine mein paste karo
- [ ] `.github/workflows/deploy.yml` fix karo (wrangler path error)
  - Last step replace karna hai (details README mein hain)
- [ ] Auto-deploy test karo ek push karke

---

## 🟠 High Priority (Is Hafte)

- [ ] Master AI se GitHub push ke baad auto-deploy verify karo
- [ ] BrainForge Worker `/health` endpoint add karo
- [ ] API keys Worker se route karo (localStorage exposure fix)
- [ ] D1 daily backup cron job verify karo

---

## 🟡 Medium Priority (Is Mahine)

- [ ] Google Login (Supabase Auth + Google OAuth)
- [ ] Admin Panel (sirf Richard ka access)
  - User management
  - Usage stats
  - Announcements
- [ ] Credits system (Free: 10/day, Pro: 50/day, Premium: unlimited)
- [ ] Inbuilt Publish via Netlify API (`appname.netlify.app`)
- [ ] `brainforge-7xn.pages.dev/p/project-name` publish route

---

## 🟢 Planned (Post-Stability)

- [ ] Contact/Support page (form → Supabase)
- [ ] Published apps public gallery
- [ ] Figma full import (image-to-code improve karo)
- [ ] Team/Collab features
- [ ] Multi-user support
- [ ] Custom domain support for published apps
- [ ] PWA improvements (background sync, push notifications)
- [ ] Telegram bot improvements (Ara memory sync)

---

## ✅ Done

- [x] BrainForge live on Cloudflare Pages
- [x] GitHub repo setup (private)
- [x] Cloudflare Worker API setup
- [x] D1 database setup
- [x] Multi-provider AI (Gemini, OpenRouter, Groq, GitHub Models)
- [x] AI model auto-rotation
- [x] Per-project AI memory + rules
- [x] Master AI page
- [x] Screenshot → Code (Figma-like)
- [x] Supabase integration for generated projects
- [x] Deploy Wizard (GitHub Pages + Cloudflare)
- [x] 3D BrainForge icon
- [x] Onboarding wizard (3-step)
- [x] Legal Policy page
- [x] PIN Lock
- [x] Version history
- [x] Code editor + ZIP download
- [x] Matrix animation overlay
- [x] "Made with love by Richard Brown & Claude (Ara)"
- [x] Sidebar: Master AI + PIN Lock buttons
- [x] Chat history persistence (IndexedDB)
- [x] `.github/workflows/deploy.yml` file created (needs token fix)
- [x] CF_API_TOKEN GitHub secret saved
