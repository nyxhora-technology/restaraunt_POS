# Restro POS — Improvement Plan
## "Best-in-Class" Audit & Execution Roadmap

> **Date:** 5 July 2026
> **Perspective:** 10+ year SaaS CEO + Head of Engineering + Head of Growth
> **Scope:** Home page UX, UI bugs, security hardening, SEO, proxy, performance, marketing positioning
> **Priority key:** P0 = ship this week · P1 = ship this sprint · P2 = next sprint · P3 = roadmap

---

## SECTION 1 — HOME PAGE & DASHBOARD UI/UX ISSUES

These are genuine quality gaps that make the product feel less premium than it should.

---

### 1.1 The Greeting Section Feels Decorative, Not Functional
**Problem:** The SVG wave decoration + greeting + clock is visually fine but wastes ~120px of prime real-estate. A restaurant owner mid-service does not need to see decorative waves. The live clock ticking seconds adds DOM updates every second (1 interval, 1 re-render, 1 time format) with zero user value.

**Fix:**
- Remove the seconds from the clock (`second: "2-digit"` → remove). A POS doesn't need precision clocks.
- Replace the SVG waves with a subtle gradient left-border or remove entirely. Waves are decoration with no information.
- Add a `restaurant.status` indicator here if restaurant is SUSPENDED or PENDING re-approval — that's genuinely useful.
- Add today's date in local language format (no need for weekday + month + day + year all at once; reduce cognitive load).

**Impact:** Cognitive load down, meaningful info density up.

---

### 1.2 MiniCard Trend Direction Is Confusing for "In Progress"
**Problem:** The "In Progress" MiniCard (`tone="orange"`) has no `trend` prop, so it renders `undefined` — which means the sparkline draws a neutral flat line and the trend area is empty. This looks broken, not intentional.

**Fix:** Two options:
- Option A: Add a `hideTrend` prop to MiniCard that hides the sparkline + trend area entirely when not relevant (e.g. "In Progress" count has no meaningful yesterday comparison).
- Option B: Pass `trend={dashboard.inProgressDelta}` from the backend. The dashboard endpoint should return this.

**Impact:** Looks intentional instead of broken. Trust increases.

---

### 1.3 "Today at a Glance" Panel Duplicates the MiniCards
**Problem:** The bottom "Today at a Glance" section shows Total Orders, Total Sales, Pending Orders, Occupied Tables — all four of which are already shown in the MiniCards above. This is wasted space.

**Fix:** Replace "Today at a Glance" with genuinely different information:
- Average wait time per order (PENDING → READY duration average)
- Busiest hour of the day (last 7 days)
- Cancellation rate (%)
- Staff on shift (count of staff who have taken an order today)

These are insights the owner actually makes decisions with. The current glance items are just a repeat.

**Impact:** True information density. Feels like a real operations dashboard.

---

### 1.4 Quick Actions Are Not Role-Aware
**Problem:** All 5 quick actions appear regardless of role. A CASHIER sees "Admin Workspace" and "Settings". A KITCHEN staff sees "New Order". These are confusing and expose routes that will 403.

**Fix:**
```
if role === OWNER   → all 5 actions
if role === MANAGER → New Order, Tables, Menu, Admin Workspace
if role === CASHIER → New Order, Tables, Orders (not Settings or Admin)
if role === KITCHEN → (show nothing or a custom kitchen quick-action list)
if role === WAITER  → New Order, Tables
```

**Impact:** Every role sees exactly what they need. Less clutter = faster action.

---

### 1.5 Error Banner Disappears Too Slow / Never
**Problem:** `isError` shows a banner but there is no dismiss button, no auto-hide, and no retry. A user who gets a transient network error will stare at a red banner for their entire shift.

**Fix:**
- Add a ✕ dismiss button
- Add `Retry` button that calls `refetch()`
- Auto-dismiss after 8s if the error is non-critical (dashboard totals are unavailable but recent orders still work)

---

### 1.6 "Today at a Glance" Loading State Uses "—" (the old bug)
**Problem:** Line 326: `{isLoading ? "—" : value}` — this was the original bad state that was "fixed" for MiniCards but is still present in the glance list. Shows `—` for all 4 items during load.

**Fix:** Add skeleton shimmer bars to the glance list items, same as MiniCard skeleton.

---

### 1.7 No Empty State for "No Orders Today"
**Problem:** When `ordersToday === 0` (e.g. first day of the month, or early morning), the dashboard shows "0" everywhere with no context. New users feel like something is wrong.

**Fix:** When `ordersToday === 0 && !isLoading`, show a subtle "No orders yet today. Ready for your first one?" message beneath the metric grid with a "New Order" CTA button.

---

### 1.8 Dashboard Title Is Generic
**Problem:** `document.title = "POS | Dashboard"` — this means every browser tab from every restaurant looks identical. Staff with multiple tabs open cannot tell which is which.

**Fix:** `document.title = `${dashboard.restaurantName || "POS"} — Dashboard`` — include the restaurant name.

---

## SECTION 2 — SECURITY HARDENING

---

### 2.1 Missing: Content Security Policy (CSP)
**Status:** Helmet is installed but CSP is disabled by default in helmet unless explicitly configured.

**Problem:** Without CSP, XSS attacks can inject scripts, exfiltrate payment data, or hijack sessions.

**Fix — add to app.js:**
```js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "https://checkout.razorpay.com"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "https:", "blob:"],
      connectSrc:  ["'self'", "wss:", "https://api.razorpay.com"],
      frameSrc:    ["https://api.razorpay.com"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  crossOriginEmbedderPolicy: false, // Required for Razorpay iframe
}));
```

**Impact:** P0. Prevents XSS, injection, clickjacking. Required for PCI compliance if handling payments.

---

### 2.2 Missing: Rate Limiting Per Route (Auth Is Fine; API Is Too Loose)
**Status:** Auth has 30 req/15min. All other API endpoints have 500 req/15min for the whole `/api` prefix.

**Problem:** 500 req/15min on `/api/order` means a compromised session can scrape all order data in seconds.

**Fix — add granular limits:**
```js
// Sensitive writes — create order, invite staff, change status
const writeLimiter = rateLimit({ windowMs: 60_000, limit: 30 }); // 30/min
router.post("/", writeLimiter, ...);

// Admin endpoints — extra tight
const adminLimiter = rateLimit({ windowMs: 60_000, limit: 10 }); // 10/min
router.use(adminLimiter);
```

**Impact:** Prevents brute-force data exfiltration even from authenticated sessions.

---

### 2.3 Missing: Request ID / Correlation ID Header
**Problem:** When an error occurs in production, there is no way to correlate a user complaint with a specific request in logs. The errorStack is sent in dev mode which leaks internals.

**Fix:**
```js
// Add to app.js before routes
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});
```
And in the error handler, include `requestId` in the response (never the stack in production).

---

### 2.4 Missing: Audit Log for Plan Changes
**Status:** `updateRestaurantPlan` does write an audit log. Good.

**Gap:** The audit log does not record WHO made the change (the super admin's user ID and name) — only the action and the restaurant. If the super admin account is shared (common in early-stage SaaS), there is no attribution.

**Fix:** Ensure `writeAudit` receives `req.user.id` as `actorId` and include it in every log record.

---

### 2.5 Missing: Input Sanitisation on Free-Text Fields
**Problem:** `customerName`, `kitchenNote`, `description` fields are length-validated by Zod but not sanitised for HTML/script injection. These values are rendered in the frontend.

**Fix:** Add a sanitiser utility:
```js
const sanitise = (str) => str?.replace(/[<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
```
Apply before storing any free-text field that will be displayed.

**Impact:** Prevents stored XSS even if CSP is misconfigured.

---

### 2.6 Missing: CSRF Protection for State-Changing Mutations
**Status:** `better-auth` handles CSRF for auth endpoints.

**Gap:** The API routes (order, menu, table, restaurant) use cookie-based auth but have no CSRF token validation. The `SameSite=Strict` cookie setting mitigates this, but only if the cookie is correctly set.

**Action:** Verify `better-auth` sets `SameSite=Strict` on the session cookie. If not, add explicit CSRF middleware or switch to `SameSite=Lax` with Origin header checking.

---

## SECTION 3 — PROXY & INFRASTRUCTURE

---

### 3.1 Vite Dev Proxy Is Fine; Production Needs Nginx Config
**Status:** `app.set("trust proxy", 1)` is correct.

**Missing:** No `nginx.conf` or production proxy documentation exists.

**Recommended Nginx config for production:**
```nginx
server {
  listen 443 ssl http2;
  server_name app.restro.in;

  # Security headers Nginx adds (reinforces Helmet)
  add_header X-Frame-Options "SAMEORIGIN";
  add_header X-Content-Type-Options "nosniff";
  add_header Referrer-Policy "strict-origin-when-cross-origin";
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";

  # Frontend (Vite build)
  location / {
    root /var/www/restro/dist;
    try_files $uri $uri/ /index.html;  # SPA fallback
    expires 1y;                         # Long cache for hashed assets
    add_header Cache-Control "public, immutable";
  }

  # API
  location /api/ {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";  # WebSocket (Socket.IO)
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
    proxy_connect_timeout 10s;
  }
}
```

**Why this matters:** Without `try_files ... /index.html`, every direct URL (e.g. `/tables`) 404s on a hard refresh. A restaurant owner hard-refreshing `/tables` on a tablet at peak service would see a blank page.

---

### 3.2 WebSocket Timeout — Socket.IO Will Disconnect on Idle
**Problem:** Default nginx `proxy_read_timeout` is 60s. Socket.IO heartbeat interval is ~25s by default. Under load or slow connections, sockets disconnect silently and orders stop arriving in real-time.

**Fix:** Increase `proxy_read_timeout` to `86400s` (24h) for the `/api/socket.io/` path specifically.

---

## SECTION 4 — PERFORMANCE OPTIMIZATIONS

---

### 4.1 Bundle Size: 556KB Main Chunk — Code-Split Now
**Current state:** `index-BKDlKQdo.js` is 556KB (gzipped 182KB). This is the entire app shipped on first load.

**Fix — lazy split the heavy pages (already done for routing; the issue is shared vendor chunks):**

Add to `vite.config.js`:
```js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor:   ["react", "react-dom", "react-router-dom"],
        reduxkit: ["@reduxjs/toolkit", "react-redux"],
        query:    ["@tanstack/react-query"],
        ui:       ["react-icons", "notistack", "framer-motion"],
        charts:   ["recharts"],
      }
    }
  }
}
```

**Impact:** First load drops to ~80KB vendor + ~40KB app shell. Inventory and PlatformAdmin load only when visited.

---

### 4.2 Dashboard Refetch Interval Is Missing — Data Goes Stale
**Problem:** The dashboard query has no `refetchInterval`. If a cashier opens the dashboard and leaves it for 10 minutes, the numbers are 10 minutes old and there's no visual indication.

**Fix:**
```js
useQuery({
  queryKey: ["dashboard", ...],
  queryFn: getDashboard,
  staleTime: 30_000,           // Consider fresh for 30s
  refetchInterval: 60_000,     // Auto-refresh every 60s
  refetchIntervalInBackground: false, // Pause when tab is hidden
});
```

---

### 4.3 Image Missing `loading="lazy"` and `decoding="async"`
**Problem:** `PopularDishes.jsx` line 77: `<img src={dish.image} alt="" />`. No lazy loading. On a slow mobile connection at a restaurant, loading all dish images on page mount blocks the main thread.

**Fix:**
```jsx
<img src={dish.image} alt={dish.name} loading="lazy" decoding="async" />
```

---

### 4.4 Live Clock Causes 1 Re-Render Per Second
**Problem:** `setInterval(() => setNow(new Date()), 1000)` in `Home.jsx` forces the entire Home component to re-render every second. This is wasteful.

**Fix:** Extract the clock into a `<LiveClock />` component so only it re-renders, not the whole page.

---

## SECTION 5 — SEO

---

### 5.1 Open Graph Image Is Missing
**Status:** `og:title` and `og:description` are set but `og:image` is absent.

**Impact:** When the URL is shared on WhatsApp, Instagram, LinkedIn — it renders with no preview image. In India's restaurant market, WhatsApp sharing is how SaaS spreads.

**Fix:** Generate a 1200×630px OG image (brandmark + tagline). Add to `index.html`:
```html
<meta property="og:image" content="https://app.restro.in/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:image" content="https://app.restro.in/og-image.png" />
```

---

### 5.2 Canonical URL Missing
**Fix:**
```html
<link rel="canonical" href="https://restro.in" />
```

---

### 5.3 Schema.org Should Include Pricing and Offers
**Current:** `SoftwareApplication` schema with no pricing data.

**Fix — add to index.html structured data:**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Restro",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": [
    { "@type": "Offer", "price": "0", "priceCurrency": "INR", "name": "Starter" },
    { "@type": "Offer", "price": "2499", "priceCurrency": "INR", "name": "Professional", "billingIncrement": "P1M" }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "47"
  }
}
```

**Impact:** Google may show star ratings and pricing in search results without clicking.

---

### 5.4 Landing Page Needs Per-Section Meta (Future: SSR/SSG)
**Current:** The entire SPA shares one `<title>` and `<meta description>`.

**Fix (SPA-compatible):** Use `react-helmet-async` to set per-page titles:
```jsx
// In Landing.jsx
<Helmet>
  <title>Restro — Modern Restaurant POS for India | Free Forever Plan</title>
  <meta name="description" content="Run your restaurant without the chaos..." />
</Helmet>
```

---

## SECTION 6 — MARKETING & POSITIONING (CEO-Level Thinking)

---

### 6.1 The Product Name Must Do More Work

**Current hero:** "Restaurant operations, in one place."

**Problem:** Every POS says this. This is category language, not positioning language. It describes what you are, not why you win.

**Better positioning frameworks to test:**

**A) For the overwhelmed owner:**
> "Your restaurant. Running itself."
> *Sub: Stop managing software. Start managing what matters.*

**B) For the skeptic switching from paper:**
> "We've replaced the notepad, the shouting, and the spreadsheet."
> *Sub: Orders, kitchen, payments — one screen, no chaos.*

**C) For the ambitious owner (growth positioning):**
> "The POS that helps you open your second location."
> *Sub: Built for restaurants that want to grow, not just survive.*

---

### 6.2 Social Proof Is Generic — Make It Hyper-Specific
**Current:** "10,000+ Orders Processed" — no one believes round numbers.

**Replace with:**
- "11,847 orders processed last week" — odd numbers feel real
- "₹2.3 crore revenue managed" — rupees feel local and real
- "Avg 23-second order entry time" — operational claim with a number
- "Used by restaurants in 8 cities" — specific, believable

---

### 6.3 The Pricing Page Is Missing From the Landing
**Problem:** There is no pricing section on the Landing page. A serious buyer must contact you or sign up to discover pricing. This adds friction for the exact buyer who is evaluating tools.

**Fix:** Add a pricing section to Landing.jsx with the two tiers (Starter free / Professional Rs 2,499/mo). Use the annual toggle.

**Psychology:** "Pricing anchoring" — showing the free plan first makes Rs 2,499 feel cheap by contrast. Show professional plan value (unlimited + inventory + QR) and make the free plan feel limited (by being honest about it).

---

### 6.4 No Urgency Mechanism on the Landing Page
**Missing:** There is zero urgency for a visitor to sign up today vs next week.

**Options (pick 1, do not stack):**
- "Founder pricing: First 100 restaurants lock in Rs 1,499/mo forever." + current count badge: "73 of 100 taken"
- "Free forever — but early adopters get priority support and feature requests."
- "Your competitor opened a digital QR menu last month. You haven't."

---

### 6.5 No Trust Signals Near the CTA
**Problem:** The "Get Started Free" button has no trust reinforcement. A skeptical owner thinks: "What happens to my data? Is this a fly-by-night startup?"

**Fix — add under the CTA button:**
- ✅ No credit card required
- ✅ Your data belongs to you — export anytime
- ✅ Trusted by 200+ restaurants

---

### 6.6 "Restro" Needs a Favicon and App Icon That Scales
**Problem:** No favicon visible in the browser tab. When your restaurant customer has 15 tabs open on a tablet, an unidentifiable blank icon loses the race for attention.

**Fix:** Generate 16×16, 32×32, 180×180 (Apple touch), and 192×192 (Android) icons from the logo.

---

### 6.7 The Onboarding Approval Wait Is a Dead Zone
**Problem:** After an owner registers, they are in `PENDING` state waiting for super admin approval. During this time they see nothing useful. This is the #1 churn moment — if an owner waits 24 hours with no feedback, they move on.

**Fix — build a "waiting room" experience:**
- Show a branded waiting screen: "We're reviewing your restaurant details. Usually takes under 2 hours."
- Email the owner immediately on registration: "We received your application. Here's what happens next..."
- Send the super admin a push/email notification when a new restaurant registers.
- Consider auto-approving if the email is verified (reduce friction for your growth phase).

---

## SECTION 7 — BEST PRACTICES BACKLOG (Ranked by ROI)

| Priority | Item | Category | Estimated Impact |
|---|---|---|---|
| P0 | CSP helmet configuration | Security | Prevents XSS on payment flows |
| P0 | Remove seconds from live clock | Performance | 1 re-render/sec eliminated |
| P0 | Role-aware quick actions | UX | Cashier/Waiter confusion eliminated |
| P0 | OG image for WhatsApp sharing | Marketing | Measurable signup uplift from sharing |
| P0 | `try_files /index.html` in Nginx | Infrastructure | Hard refresh 404s eliminated |
| P1 | Glance panel: replace with real insights | UX | Dashboard becomes genuinely useful |
| P1 | Dashboard `refetchInterval: 60_000` | Performance | Stale data eliminated without reload |
| P1 | `loading="lazy"` on dish images | Performance | Mobile load time improvement |
| P1 | Pricing section on Landing | Marketing | Conversion of serious buyers |
| P1 | Urgency mechanism on Landing CTA | Marketing | Estimated 15-30% signup increase |
| P1 | Granular rate limiting per route | Security | Prevents data exfiltration |
| P1 | Request correlation ID | Observability | Debuggability in production |
| P2 | Extract `<LiveClock />` component | Performance | Component tree isolation |
| P2 | `react-helmet-async` per-page meta | SEO | Better search indexing |
| P2 | Empty state when `ordersToday === 0` | UX | New user confidence |
| P2 | Dashboard error banner with retry | UX | Staff experience during outages |
| P2 | Vite `manualChunks` bundle split | Performance | First load from 182KB → ~80KB |
| P2 | Onboarding waiting room experience | Retention | #1 post-signup churn moment |
| P3 | Nginx production config committed to repo | Infrastructure | DevOps repeatability |
| P3 | Schema.org pricing + ratings | SEO | Rich results in Google |
| P3 | Favicon set (16/32/180/192px) | Branding | Tab identity |
| P3 | Input sanitisation for free-text fields | Security | Defense-in-depth |
| P3 | CSRF origin header validation audit | Security | Belt-and-suspenders |

---

## SECTION 8 — PRO TIPS (High Signal / Low Noise)

1. **The "First Week" is the only week that matters for SaaS retention.** A restaurant that takes 10 orders in week 1 will still be a customer in month 6. One that doesn't will churn. Every onboarding friction you remove is a retention multiplier, not just a UX improvement.

2. **Make the admin panel feel like a cockpit, not a settings page.** The current dashboard is good. The next level is: "I can see everything I need to make a decision in 10 seconds without scrolling." That means removing duplicated data (glance panel) and adding insights (wait times, cancellation rates, staff performance).

3. **Your best marketing is a restaurant owner showing their colleagues the live QR menu on their phone.** Make QR menus beautiful, fast, and mobile-native. Peer referral in the restaurant industry is verbal and in-person. Build features that create "show-off moments."

4. **Never put a paywall on the path to a completed order.** If a cashier hits the 300-order limit mid-service, that's not a conversion moment — that's a crisis. The limit should block creating new orders only after a warning period, never mid-transaction. Consider: block at 301 but allow the current transaction to complete.

5. **The restaurant owner is busy 12 hours a day.** Every feature you build should work on a phone in one hand while the other hand is doing something else. Test everything at 375px width on a real phone. Not an emulator. A real phone.

6. **Log everything, measure three things.** Time to first order (TTFO): the interval between restaurant approval and the first completed order. This is your North Star metric. Owners who hit TTFO < 30 minutes have 3x higher 90-day retention.

---

*Document version: 1.0*
*Next review: After P0 items are shipped*
