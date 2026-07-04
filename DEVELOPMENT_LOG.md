# Restro POS — Development Log & Decision Record

> **Project:** Restro — Multi-tenant Restaurant POS SaaS
> **Date:** 4 July 2026
> **Session Duration:** ~3 hours
> **Status:** All items shipped and committed to `main`

---

## Session Overview

This session covered three major themes:
1. **UX & Psychology overhaul** — making the product feel premium and sticky
2. **Monetisation architecture** — pricing tiers, plan enforcement, admin controls
3. **Authentication & onboarding flow** — Google OAuth + owner registration journey

---

## Part 1 — Authentication & Onboarding

### Decisions Made

- **Domain strategy:** `app.domain.com` for the application. Root domain reserved as marketing-only landing page.
- **Owner registration:** Google OAuth via `better-auth`. After first Google sign-in, if no restaurant exists, owner is routed to multi-step onboarding form.
- **Staff login:** Email + password only. Staff are invited by owners and receive a temp password; `mustChangePassword` flag forces change on first login.
- **Route guard:** `mustChangePassword` in DB triggers a hard-block in `App.jsx` before any other route is accessible.

### Files Built / Changed

| File | Description |
|---|---|
| `Auth.jsx` | Google OAuth button + tab switching (Sign In / Register) |
| `Register.jsx` | Post-Google owner details form |
| `Login.jsx` | Clean email/password flow for staff |
| `Onboarding.jsx` | Multi-step restaurant registration (name, address, city, phone, email) |
| `AuthCallback.jsx` | NEW — handles Google OAuth redirect, checks restaurant status, routes accordingly |
| `Landing.jsx` | Full marketing page — hero, features, how-it-works, testimonials, stats bar, footer |
| `App.jsx` | Route guards updated: unauthenticated → Landing; authenticated → /home |

---

## Part 2 — UX & Psychology Overhaul

### Psychological Principles Applied

| Principle | Implementation |
|---|---|
| Fitts's Law | Order action button: 20x20 → 40x40px tap target |
| Progressive Disclosure (Miller's Law) | CreateOrderModal: 2-step flow (Order Type → Customer Details) |
| Peak-End Rule | OrderCelebration: confetti micro-animation on order COMPLETED |
| Zeigarnik Effect | SetupChecklist: 5-step progress panel with real API data |
| Von Restorff Effect | Medal badges (gold/silver/bronze) on top 3 popular dishes |
| Perceived Performance | FullScreenLoader branded skeleton; MiniCard shimmer instead of dash |
| Status Urgency | PENDING badge pulses amber; READY badge glows and ripples green |
| Loss Aversion | UpgradeBanner: "Every stockout costs you Rs you'll never recover" |
| Social Proof | Landing: stats bar, 3 testimonials with measurable outcomes |

### Files Changed / Created

| File | Change |
|---|---|
| `index.css` | +500 lines: keyframes, skeleton utilities, all new component styles |
| `FullScreenLoader.jsx` | Branded skeleton dashboard layout + pulsing logo |
| `MiniCard.jsx` | isLoading prop shows shimmer bar |
| `PopularDishes.jsx` | 3 skeleton rows + medals + rich empty state with CTA |
| `CreateOrderModal.jsx` | 2-step flow: big type cards (auto-advance 180ms) → customer form |
| `SetupChecklist.jsx` | NEW — Zeigarnik checklist, live API data, progress bar, localStorage dismiss |
| `OrderCelebration.jsx` | NEW — 12-particle CSS confetti + slide-up toast on COMPLETED |
| `UpgradeBanner.jsx` | Loss-aversion copy, social urgency, quantified claims |
| `Home.jsx` | isLoading to all MiniCards, SetupChecklist, PlanUsageBar |
| `RecentOrders.jsx` | Detects COMPLETED transitions and fires OrderCelebration |

---

## Part 3 — Monetisation & Pricing Architecture

### Pricing Tiers Decided

| Tier | Price | Target |
|---|---|---|
| Starter | Free forever | Solo cafe, new restaurant, food stall |
| Professional | Rs 2,499/month or Rs 21,999/year (25% off) | Established restaurant, full team |
| Enterprise | Contact | Chains, multi-location (future) |

Gross margin on Professional: ~93.5% (COGS ~Rs 163/month to serve one restaurant)

### Starter Hard Limits

| Resource | Limit | Why |
|---|---|---|
| Orders per month | 300 | Small cafe fits. Growth pushes upgrade naturally. |
| Menu items | 30 | Enough to launch; too few for a real restaurant (avg 50-80 items). |
| Tables | 10 | Covers small QSR or tiffin service. |
| Staff seats | 3 | Owner + cashier + 1 waiter. Any more = upgrade. |
| QR codes | 0 | High perceived value, zero marginal cost — Pro-only. |
| Analytics history | 7 days | Curiosity gap: they see yesterday, never last month. |

### Lock-In Mechanics (Why 30% users still cannot leave)

1. **Inventory data** — 3 months of stock counts cannot be manually reconstructed
2. **Order history** — GST returns require 1-year records. Accountant lives here.
3. **Staff training** — 6 people trained on one system will not retrain for Rs 2,499/month saved
4. **QR codes on physical tables** — Once laminated or engraved, they do not reprint to switch software
5. **90-day analytics** — Once "August vs July" lives here, owner returns to Restro every time

### Files Built / Changed

| File | Description |
|---|---|
| `config/planFeatures.js` | PLAN_LIMITS per tier, getPlanLimit() helper, new features (STAFF_INVITE, ANALYTICS_EXTENDED, EXPORT) |
| `middlewares/checkPlanLimit.js` | NEW — DB count per resource, structured 403 response. SUPER_ADMIN + dev mode bypass. |
| `routes/orderRoute.js` | checkPlanLimit("orders_per_month") on POST + GET /api/order/usage |
| `routes/menuRoute.js` | checkPlanLimit("menu_items") on POST /item |
| `routes/tableRoute.js` | checkPlanLimit("tables") on POST / |
| `routes/restaurantRoute.js` | checkPlanLimit("staff_seats") on POST /staff/invite |
| `controllers/orderController.js` | getOrderUsage() — returns ordersThisMonth, limit, percentage, unlimited |
| `https/index.js` (frontend) | getOrderUsage API call |
| `components/home/PlanUsageBar.jsx` | NEW — "247 of 300 orders used". Green → amber at 70% → red at 90%. Upgrade CTA at 70%+. Hidden for Pro/Enterprise. |
| `pages/PlatformAdmin.jsx` | Plan badge + inline plan dropdown on every restaurant card. One click changes plan, socket pushes to restaurant live. |

---

## Super Admin Controls — How to Use

1. Login with the email set as SUPER_ADMIN_EMAIL in .env
2. Go to Platform Admin
3. Every restaurant card shows current plan (colour-coded) + a dropdown to change it
4. Changing plan is instant — socket push means restaurant does not need to reload

**To upgrade your own restaurant:**
Platform Admin → find your restaurant card → change dropdown to Professional → done

---

## Git Commits This Session

```
cda2b43  feat: monetisation plan enforcement + usage counter
07b340b  feat: UX psychology overhaul + Google OAuth + onboarding flow
```

---

## Next Steps (Prioritised)

| Priority | Item | Notes |
|---|---|---|
| HIGH | 14-day Pro trial flow | After trial, inventory data read-only. Strongest retention mechanic. |
| HIGH | Scarcity banner at 80%+ orders | Already built (PlanUsageBar); make it more prominent at 90%+ |
| MEDIUM | Annual billing toggle on Landing page | Monthly/Annual switch, 25% off label |
| MEDIUM | Founder pricing (first 100 restaurants) | Rs 1,499/month locked for life — needs coupon or admin toggle |
| MEDIUM | useFeature hook (frontend) | Centralise all feature gates: const { can } = useFeature() |
| LOW | Export (CSV/PDF) | Gate behind Professional — EXPORT key already defined in planFeatures |
| LOW | Code-splitting | Bundle 556KB gzipped 182KB. Split Dashboard, Inventory, PlatformAdmin. |
| LOW | Analytics history filter | Apply analytics_days limit to dashboard/orders queries for Starter plan |

---

## Architecture Notes

- **Plan enforcement is backend-first.** Frontend shows UX warnings; backend enforces hard stops. Bypassing the UI still returns a 403.
- **devUnlockFeatures** — when NODE_ENV is not production and DEV_UNLOCK_FEATURES is not "false", all limits are bypassed. Set DEV_UNLOCK_FEATURES=false in .env to test enforcement locally.
- **Super admin bypass** — role === SUPER_ADMIN skips all plan checks automatically.
- **Socket push on plan change** — updateRestaurantPlan emits restaurant:plan_updated to the restaurant socket room. Frontend updates without a page reload.
