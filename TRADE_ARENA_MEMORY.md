# TRADE_ARENA_MEMORY.md
# Trade Arena -- Project Memory & Confirmed Decisions
# Last Updated: 2026-03-27
# Owner: Pinka (India)

---

## Project Overview

**Trade Arena** ek paper trading simulation game hai jisme users real market data pe
virtual trades karte hain aur Trade Arena Token (TAT) kamate hain.
Token ICP blockchain pe launch hoga. App 24/7 chalegi.

---

## Confirmed Features (DO NOT RE-DISCUSS)

### 1. Game Type
- Paper trading simulation (real money nahi lagte)
- Users Trade Arena Token (TAT) se trade karte hain
- Real live market data use hoti hai

### 2. Markets (Teeno)
| Market | Data Source | Hours |
|---|---|---|
| India (NSE/BSE) | Yahoo Finance API (free) | 9:15 AM - 3:30 PM IST |
| US (NYSE/NASDAQ) | Yahoo Finance API (free) | 9:30 PM - 4 AM IST |
| Crypto (BTC/ETH etc.) | CoinGecko API (free) | 24/7 |

- DuckDuckGo use nahi karna -- Yahoo Finance + CoinGecko final hai
- App 24/7 chalegi -- market band ho toh Market Closed page dikhega

### 3. Market Closed Page
Jab NSE ya NYSE band ho:
- "Market Closed" status + next open time
- Top Gainers of Day list
- Top Losers of Day list
- Filter: Options | Stocks | Equity
- Day wise filter: Aaj | Kal | Is Hafte

### 4. Trade Arena Token (TAT)
- ICP blockchain pe ICRC-1 standard token
- New user signup bonus: 4000 TAT free
- Users real money se bhi khareed sakte hain
- Payment methods:
  - India: UPI
  - International: Crypto (USDT/BTC)
  - USD direct: Abhi nahi
- Token price: Baad mein set hoga

### 5. Pre-Sale Model
- Token abhi virtual hai (pre-release)
- Wallet page pe dikhega:
  - Token name: Trade Arena Token (TAT)
  - Status: Virtual (Pre-Release)
  - Release Date: [TBD - baad mein set hoga]
  - Estimated Launch Price: [TBD]
  - Presale benefit: Launch price se 50% profit potential
- "Estimated Launch Price" use karo (NOT "fake price")
- Presale progress bar dikhao (FOMO ke liye)
- Collected real money → Liquidity pool mein jaayega
- Smart contract mein lock hoga (trust ke liye)
- Liquidity: Presale collections se aayegi

### 6. Competition System
- 2 types: Daily + Weekly
- Entry fee: 100 TAT per participant
- Prize pool: Dynamic (participant count × 100 tokens)
- Platform cut: 20% of total pool
- Remaining 80% winners mein bante:

| Participant Count | Winners | Distribution |
|---|---|---|
| 5 se kam | Top 3 | 1st=60%, 2nd=25%, 3rd=15% |
| 5-10 | Top 5 | 1st=40%, 2nd=25%, 3rd=15%, 4th=12%, 5th=8% |
| 10+ | Top 10 | Performance wise |

- Performance based distribution (best trades = more prize)

### 7. User Types
| Type | Who | What They Do |
|---|---|---|
| Beginner | Naya user | Stocks + Crypto paper trade |
| Intermediate | Thoda experience | Competitions join kare |
| Advanced/Pro | Experienced trader | Options + Weekly tournaments |
| Investor | Token mein interest | Presale + TAT kharidna |

### 8. Options Trading
- Beginners: Stocks + Equity only
- Advanced users: Options bhi available (toggle: "Switch to Advanced Mode")
- Data: NSE official public data + Yahoo Finance

### 9. Earning Model (Platform Owner ke liye)
| Source | How | Permanent? |
|---|---|---|
| Token sale (presale) | UPI/Crypto se | One-time |
| Competition 20% cut | Har competition | ✅ Always |
| Transaction fees (1-2%) | Har token transfer | ✅ Always |
| Liquidity pool fees (0.3%) | ICPSwap trading | ✅ Always |

---

## Pending Decisions (Discuss Karna Hai)

### Next Session Mein Discuss Karna Hai (1 by 1):
1. 🎨 **Design** -- app kaisi dikhegi (dark/light theme, colors, style)
2. 📱 **Pages List** -- konse pages honge
3. 🔐 **Login/Registration** -- email/password ya wallet connect ya dono
4. 📊 **Dashboard** -- user ko kya dikhega main screen pe
5. 💼 **Wallet Page** -- TAT balance, presale info, buy/sell
6. 🏆 **Competition Page** -- join, leaderboard, live results
7. ⚙️ **Admin Panel** -- platform owner ka control panel
8. 📈 **Trading Interface** -- chart, buy/sell, portfolio
9. 🏅 **Leaderboard** -- public ya private
10. 🔔 **Notifications** -- alerts, competition reminders

---

## Tech Stack (Planned)

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Tailwind (Caffeine/ICP) |
| Backend | Motoko (ICP canister) |
| Token | ICRC-1 standard (ICP blockchain) |
| Market Data | Yahoo Finance API + CoinGecko API |
| Trading Data | Upstox public reports (backup) |
| Storage | ICP canister storage |

---

## Important Notes for Next Session

1. **Token price NOT set yet** -- discuss karna hai
2. **Design discuss nahi hua** -- next step yeh hai
3. **Login method NOT decided** -- email vs wallet
4. **Leaderboard public/private NOT decided**
5. **Pre-release date NOT set** -- owner decide karega
6. **USD payment abhi nahi** -- UPI + Crypto only

---

## Session History Summary

- 2026-03-27: Complete business model confirm hua
- Markets: India + US + Crypto (Yahoo Finance + CoinGecko)
- Token: TAT on ICP, 4000 free on signup, UPI+Crypto payment
- Competition: Daily+Weekly, 100 TAT entry, 20% platform cut, dynamic prize
- Pre-sale: Virtual token, estimated price, progress bar, 50% profit info
- Options: Advanced mode toggle
- Market closed: Gainers/Losers list with filters
- Owner: Pinka (India)
- Next step: Design + Pages discussion
