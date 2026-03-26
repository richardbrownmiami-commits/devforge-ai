# BrainForge Project AI Rules

## DATA DETECTION -- CRITICAL

### Step 1: Detect if project needs data persistence
When user asks to build ANYTHING, scan for these signals:
- Keywords: "save", "store", "remember", "history", "list", "track", "manage", "login", "profile", "database", "data"
- App types: todo, notes, expense tracker, inventory, contacts, journal, calendar, booking, cart, CMS, blog, forum

HIGH REQUIREMENT projects (strongly recommend Supabase):
- User login/auth
- Multi-user data
- Expense/finance tracker
- Inventory/stock management
- Booking/appointment system
- E-commerce / cart
- CRM / contact manager
- Any app where data loss = problem

MEDIUM REQUIREMENT (offer choice):
- Todo app
- Notes app
- Simple tracker
- Personal diary

NO DATA (no action needed):
- Calculator
- Game (unless high scores)
- Landing page
- Portfolio
- Static tool

---

## DATA HANDLING RULES

### When data is needed:
1. ALWAYS check if Supabase is configured in settings (user will have bf_settings.supabaseUrl)
2. If Supabase IS configured:
   - Generate code WITH Supabase integration from the start
   - Include table creation SQL in a comment at top of file
   - Show example: what table name, what columns will be saved
3. If Supabase NOT configured:
   - Generate code with localStorage as temporary storage
   - Add a VISIBLE WARNING BANNER in the app UI (see template below)
   - Tell user in chat: Supabase connect karo permanent data ke liye

### Warning Banner Template (add inside HTML when using localStorage):
```html
<div id="data-warning" style="background:#7c3aed22;border:1px solid #7c3aed66;color:#c4b5fd;padding:8px 12px;font-size:12px;display:flex;align-items:center;gap:8px;margin-bottom:8px;border-radius:6px;">
  ⚠️ <strong>Data Warning:</strong> Abhi data browser localStorage mein save ho raha hai.
  Agar browser cache ya data delete hua to yeh data bhi reset ho jayega.
  Permanent data ke liye Settings mein Supabase connect karo.
  <button onclick="document.getElementById('data-warning').style.display='none'" style="margin-left:auto;background:none;border:none;color:#c4b5fd;cursor:pointer;font-size:16px;">×</button>
</div>
```

### When suggesting Supabase, show example relevant to the project:
- Todo app → "todos" table: id, text, done, created_at
- Expense tracker → "expenses" table: id, amount, category, note, date
- Inventory → "items" table: id, name, quantity, price, updated_at
- Contacts → "contacts" table: id, name, phone, email, notes
- Notes app → "notes" table: id, title, content, updated_at
- Blog → "posts" table: id, title, content, published, created_at
- Booking → "bookings" table: id, name, date, time, service, status

### When Supabase IS connected (settings has supabaseUrl):
- Generate full Supabase CRUD code automatically
- Do NOT use localStorage for main data
- Include: createClient, insert, select, update, delete
- Add RLS policy comment: "Enable RLS and allow all for now (tighten later)"

---

## CHAT RESPONSE FORMAT (when data detection triggers)

When user asks for a data-saving app WITHOUT Supabase configured:

\"Main yeh [app name] bana raha hoon. 

⚠️ **Data Storage:** Abhi localStorage use ho raha hai (temporary). 
Agar browser data clear hua to yeh data reset ho jayega.

**Permanent data ke liye:** Settings → Supabase section mein apna Supabase URL + Anon Key daalo — main khud code update kar dunga.

**Is project mein yeh save hoga:**
- Table: [relevant table]
- Columns: [relevant columns based on project]

Abhi test ke liye bana raha hoon:\"

---

## SUPABASE AUTO-MIGRATION

When user connects Supabase AFTER project is already built with localStorage:
- AI should detect the change (settings update event or user tells in chat)
- Automatically offer: "Supabase connect ho gaya! Kya main code update karun localStorage → Supabase?"
- On confirmation: rewrite the data layer completely
- Keep UI same, only change storage logic

---

## ALLOWED
- Build apps with localStorage for testing
- Suggest Supabase when data persistence is needed
- Auto-detect project type and show relevant table examples
- Auto-migrate code localStorage → Supabase on user request

## NOT ALLOWED  
- Build data-saving apps WITHOUT warning about localStorage limitations
- Ignore Supabase when it's already configured in settings
- Delete or overwrite user's existing Supabase data structure
