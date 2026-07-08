# Restaurant POS System — Product Decision Log

> **Purpose:** This document records every significant UX, workflow, and technical decision made during our improvement session. For each decision we document: what the old behaviour was, why it was a problem in a real restaurant environment, and what we decided to do instead.

---

## 1. Order Lifecycle — Removing ACCEPTED / REJECTED Steps

### Before

The order status flow had **6 steps**:

```
PENDING → ACCEPTED → PREPARING → READY → SERVED → COMPLETED (on payment)
```

Staff also had a "REJECTED" button to reject orders outright.

**UI buttons shown on every open order:**
- Mark as ACCEPTED
- Mark as PREPARING
- Mark as REJECTED
- Mark as CANCELLED

### Why It Was a Problem

| Problem | Real-world impact |
|---------|-------------------|
| PENDING → ACCEPTED is a redundant step | In a physical restaurant the kitchen either starts cooking or doesn't. Nobody "accepts" an order in a separate step |
| 6 status transitions = 6 button presses per order | In a busy kitchen with 20+ simultaneous orders, extra clicks cause real delays |
| "REJECTED" is dangerous in a dine-in context | The customer is sitting at the table. You don't "reject" their order — you modify it or cancel it |
| Too many buttons confused junior staff | Cashiers and waiters saw all buttons; they didn't know which one was their job |
| Owner login showed same complex UI as kitchen | Role-based simplification was not applied to the Order Status section |

### Decision

**Reduce to 3 active steps:**

```
PENDING → PREPARING → READY → SERVED → COMPLETED (on payment)
```

- Remove `ACCEPTED` and `REJECTED` from all allowed transitions
- `CANCELLED` remains available at any step as an emergency escape hatch
- Different roles see different buttons (see Role section below)
- `COMPLETED` is auto-triggered by the payment action, not a manual button

### What Changed (Files)

| File | Change |
|------|--------|
| `pos-backend/controllers/orderController.js` | Removed ACCEPTED/REJECTED from `allowedTransitions` for all roles |
| `pos-frontend/src/components/orders/OrderDetailsModal.jsx` | Updated `transitions` map — no ACCEPTED/REJECTED for any role |
| `pos-frontend/src/components/dashboard/RecentOrders.jsx` | Same `transitions` map update |
| `pos-frontend/src/components/dashboard/KitchenDashboard.jsx` | Removed REJECTED action button from kitchen cards |
| `pos-frontend/src/components/home/RecentOrders.jsx` | Removed ACCEPTED from `inProgressStatuses` filter |
| `pos-frontend/src/pages/Orders.jsx` | Removed ACCEPTED from in-progress counter and filter |

---

## 2. Role-Based Order Controls

### Before

All roles (Owner, Manager, Cashier, Waiter, Kitchen) saw the same set of status buttons on an order. No role differentiation.

### Why It Was a Problem

- A **Waiter** doesn't need to move an order from PENDING to PREPARING — that's the kitchen's job
- A **Kitchen** staff should never be able to take payments or mark SERVED — that's front-of-house
- An **Owner** login showing all historical status steps (ACCEPTED, etc.) added noise

### Decision

Each role has a **minimal permission set** — they only see the buttons they are allowed to press:

| Role | Can Do |
|------|--------|
| OWNER | PENDING→PREPARING, PREPARING→READY, READY→SERVED, any→CANCELLED |
| MANAGER | Same as OWNER |
| KITCHEN | PENDING→PREPARING, PREPARING→READY only |
| CASHIER | READY→SERVED, PENDING→CANCELLED |
| WAITER | READY→SERVED, PENDING→CANCELLED |

Payment buttons (Pay Cash / Pay Online) only appear for OWNER, MANAGER, CASHIER.

---

## 3. Kitchen Display — Audio Alerts for Order Modifications

### Before

When a customer changed their order (e.g. "actually, 6 chai instead of 4"), the UI on the kitchen screen silently updated. The kitchen staff had no way of knowing an order they were already working on had changed unless they happened to look at the screen at exactly the right moment.

### Why It Was a Problem

- Kitchen staff look at their screen **once** when an order arrives, then focus on cooking
- A silent UI update is invisible to someone actively cooking
- In a noisy kitchen environment, a notification toast or badge is equally invisible
- The kitchen may already have the old quantity in their head ("4 chai")
- This was identified as the most dangerous real-world gap: **order is served wrong**

### Decision

Two separate audio sounds + a visual diff panel on the kitchen card:

1. **New order arrives** → plays `new-order.wav`
2. **Existing order is modified** (items added, removed, or quantity changed) → plays `order-modified.wav` (a distinctly different sound so kitchen knows this is a *change*, not a *new* order)
3. **Order marked Ready** → plays `order-served.wav` (optional feedback)

**Visual diff** on the kitchen card:
- Yellow amber border + `⚠ Order Updated` banner
- Per-item change list: `+ Chai: +2`, `↑ Maggi: 4 → 6`, `− Samosa (removed)`
- "Got it" button to dismiss the diff once acknowledged

**Audio consent banner** shown first (browser policy requires user gesture before audio).

**Mute toggle** available in the kitchen header for when audio is not needed.

### What Changed (Files)

| File | Change |
|------|--------|
| `pos-backend/controllers/orderController.js` | Emits `order:items-updated` socket event with full `changedItems` diff |
| `pos-frontend/src/hooks/useRealtimeSync.js` | Listens to `order:items-updated`, dispatches `kitchen:order-items-updated` DOM event |
| `pos-frontend/src/components/dashboard/KitchenDashboard.jsx` | Receives DOM event, stores diff in state, plays audio, shows yellow banner |
| `pos-frontend/public/sounds/` | Three WAV audio files: `new-order.wav`, `order-modified.wav`, `order-served.wav` |

---

## 4. Kitchen Display — Kanban Board Layout

### Before

The kitchen had a basic list view of orders. No visual grouping by status. No clear sense of pipeline.

### Why It Was a Problem

- Kitchen staff can't see at a glance which orders are new vs. in progress vs. done
- No visual priority (age/urgency) indicator
- Staff had to read every order to understand what to do next

### Decision

Full **3-column Kanban board**:

| Column | Color | Orders Shown |
|--------|-------|-------------|
| New Orders | 🟡 Amber | PENDING |
| Preparing | 🟣 Purple | PREPARING |
| Ready for Pickup | 🟢 Green | READY |

Each card shows:
- Order number + table/takeaway label
- Time since order was placed (goes red after 15 min, amber after 8 min)
- Full item list with quantities and variant labels
- Kitchen notes
- One primary action button (Start Cooking or Mark Ready)
- Update diff banner when items change

---

## 5. Inventory Alert System

### Before

Inventory alerts had no UI to configure the threshold. There was a fixed percentage-based alert.

### Why It Was a Problem

- A restaurant might track items in kg, ml, or pieces — a percentage threshold doesn't always make sense
- "Alert at 30% remaining" of 100 kg = 30 kg. "Alert at 30% remaining" of 5 litres = 1.5 litres. Very different real-world meanings
- No visual preview of what the alert would actually trigger at

### Decision

**Two alert modes** with card-based toggle (no dropdown):

| Mode | How it works |
|------|-------------|
| **By Percentage** | Alert fires when `currentStock / totalStock ≤ threshold%` |
| **By Quantity** | Alert fires when `currentStock ≤ reorderPoint` (absolute units) |

**Live preview line** below the input:
- Percentage mode: *"🔔 Alert fires when stock drops below 3.0 kg (30% of 10)"*
- Quantity mode: *"🔔 Alert fires when stock ≤ 5 kg"*

Two alert levels: `WARNING` (yellow) and `CRITICAL` (red, at half the threshold). Deduplication logic prevents repeated alerts for the same item.

---

## 6. Table Reservation — Party Size Mismatch

### Before

All tables were shown as available to select regardless of party size. A table with 2 seats would appear equally clickable for a party of 10.

### Why It Was a Problem

- Staff would seat a party at a table that's too small, causing awkwardness
- No visual cue that a table is technically available but won't fit the guests

### Decision

When a guest count is entered:
- Tables that are available **but too small** are moved to a **dimmed "Too small for party" section**
- They are non-clickable and visually separated
- An expandable toggle ("Show anyway") lets staff override if needed
- Tables with a reservation within the next **2 hours** get an orange ring + "Reserved Soon" badge and are disabled by default with a tooltip showing the reservation time

---

## 7. UI — Replacing Dropdowns with Visible Pill/Card Buttons

### Before

Several small fixed-option selections used `<select>` dropdowns or a custom `CustomSelect` component that hid all options until clicked.

**Affected fields:**
- Table shape (Circle / Square / Rectangle / Booth) — 4 options
- Table operational status (Available / Cleaning / Out of Service) — 3 options  
- Dining area climate (AC / Non-AC / Open-Air) — 3 options
- Dining area experience (Standard / Premium / VIP) — 3 options
- Inventory alert mode (By % / By Quantity) — 2 options
- Staff role selection in Create Staff form

### Why It Was a Problem

- A dropdown **hides** choices until clicked — you don't know what options exist
- For 2–4 fixed options, a dropdown adds an unnecessary interaction step
- Role selection especially: you need to see what each role can do *before* picking it

### Decision

**Visible pill/card buttons for all small fixed sets:**

- Shape, Status, Climate, Experience → horizontal pill button row (one click to select)
- Inventory alert mode → card buttons with description text
- Staff role → card grid with role name, description, and full permission checklist (green ✓ / red ✗), similar to Discord's role UI

`CustomSelect` (dropdown) kept only for **dynamic/large lists** (e.g. Dining Area assignment, Menu Item linking — lists that can have many user-created entries).

---

## 8. Dark Mode — Instant Theme Switching

### Before

Toggling dark/light mode on the **Admin workspace** required a page refresh to take effect. The dashboard pages worked fine (instant), but PlatformAdmin did not.

### Why It Was a Problem

- Inconsistent behaviour across pages
- Confusing for users who expect theme changes to be immediate

### Decision / Fix

`PlatformAdmin.jsx` now sets both:
- `document.documentElement.style.colorScheme` (for browser chrome)
- `document.documentElement.setAttribute("data-theme", theme)` (for CSS custom property cascade)

on every theme change, matching exactly how the main dashboard handles it.

---

## 9. Notification Panel

### Before

The bell icon in the header had no functional notification panel. Clicking it did nothing, or showed a placeholder.

### Decision

Full sliding notification panel (right drawer):

1. **Pending Orders** — Shows count of PENDING orders. Clicking navigates to Orders page.
2. **Inventory Alerts** — Shows unread low-stock and critical-stock alerts with timestamps. Individual "mark read" + "mark all read". Fetched every 60 seconds + real-time socket refresh.

Badge count = pending orders + unread inventory alerts combined.

---

## Summary Table — Before vs. After

| Area | Before | After |
|------|--------|-------|
| Order steps | 6 (PENDING → ACCEPTED → PREPARING → READY → SERVED → COMPLETED) | 4 active (PENDING → PREPARING → READY → SERVED + auto COMPLETED on pay) |
| ACCEPTED status | Required step | Removed |
| REJECTED status | Button shown in UI | Removed |
| Kitchen new order alert | None | Audio (`new-order.wav`) |
| Kitchen order-changed alert | Silent UI update | Audio (`order-modified.wav`) + visual diff banner |
| Kitchen layout | List | 3-column Kanban |
| Inventory alert config | Fixed % only, no UI | By % or by quantity, card toggle, live preview |
| Table party-size check | None | Too-small tables demoted, reservation warning |
| Fixed-option dropdowns | Select element (hidden options) | Visible pill/card buttons |
| Staff role selection | Dropdown | Discord-style permission cards |
| Admin dark mode | Requires refresh | Instant |
| Notifications | No panel | Sliding drawer with orders + inventory alerts |
