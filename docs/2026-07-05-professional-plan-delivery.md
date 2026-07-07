# Professional Plan Delivery and Product Differentiation

**Completed:** July 5, 2026 at 7:36 PM IST  
**Project:** Restro Restaurant POS

## Delivered

- Added server-enforced CSV exports for orders and inventory, restricted to
  owners/managers with the `EXPORT` entitlement.
- Enforced plan analytics retention at the query layer: Starter 7 days,
  Professional 90 days, and Enterprise 365 days.
- Added `/app/analytics` with daily paid revenue, revenue-ranked dishes,
  weekday/hour order heatmap, payment-method split, and completion rate.
- Added a purpose-built Starter analytics preview with an explicit Professional
  unlock state instead of a generic empty page.
- Added advance table reservations with tenant-isolated CRUD, collision
  protection, table schedule context, and a professional agenda/form workspace.
- Added Starter reservation and export lock states without hiding discoverability.
- Added downloadable/printable receipt gating for completed paid orders.
- Added inline Starter usage indicators for menu items, active tables, and staff
  seats using server-calculated counts.
- Added a low-stock dashboard signal card for Professional restaurants and a
  concrete product preview for Starter.
- Added the public QR-menu plan signal and persistent Restro branding on Starter
  menus.
- Synchronized backend and frontend entitlement maps for `EXPORT`,
  `ANALYTICS_EXTENDED`, `STAFF_INVITE`, and `RESERVATIONS`.
- Added the `Reservation` data model and applied it to the configured development
  database.

## Professional UI decisions

- Analytics uses a compact operational workspace rather than generic dashboard
  tiles.
- Locked screens show the real shape and value of the product behind the lock.
- Usage warnings state exact consumption and remaining capacity.
- Upgrade language is factual and tied to a specific capability; it does not use
  fabricated customer counts or unsupported urgency claims.
- Revenue charts and heatmaps use native CSS, keeping the feature dependency-free
  and the route bundle small.

## Verification

- Prisma schema formatting and validation: passed.
- Prisma client generation: passed.
- Development database schema synchronization: passed.
- Backend syntax checks for app, export, analytics, and reservation modules:
  passed.
- Frontend ESLint: passed with four pre-existing non-blocking warnings.
- Production frontend build and public-page prerender: passed.
- Backend health, Google capability, and anonymous session endpoints: HTTP 200.
- Full tenant/waiter/takeaway/payment/superadmin smoke flow: passed.
- Export, analytics, and reservation endpoints reject anonymous access with
  HTTP 401.
- Direct entitlement check confirms Starter export is disabled, Professional
  export/reservations are enabled, and analytics retention is 7/90 days.
- Browser check confirms anonymous `/app/analytics` preserves the route in a
  safe `returnTo` value and renders the professional sign-in screen.

## Operational note

`DEV_UNLOCK_FEATURES` can expose paid functionality during local development.
Set `VITE_DEV_UNLOCK_FEATURES=false` and `DEV_UNLOCK_FEATURES=false` when manually
verifying Starter lock states.
