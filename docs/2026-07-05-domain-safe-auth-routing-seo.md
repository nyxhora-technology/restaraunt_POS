# Domain-Safe Authentication, App Routing, and SEO

**Completed:** July 5, 2026 at 7:16 PM IST  
**Project:** Restaurant POS System

## Outcome

The public website and authenticated POS are now separated cleanly. The landing
page remains at `/`, all protected product screens use `/app/*`, anonymous
session discovery no longer generates expected `401` errors, and Google OAuth
availability is validated by the backend.

## Implemented

- Added the `/app/*` namespace for owner, dashboard, orders, tables, menu,
  inventory, QR management, settings, onboarding, and platform administration.
- Added compatibility redirects from every previous private route.
- Replaced the protected restaurant-context session probe with Better Auth's
  non-error `get-session` endpoint.
- Deduplicated development session bootstrap with TanStack Query.
- Restricted the POS-shaped skeleton to authenticated application routes.
- Added safe internal `returnTo` handling for email and Google sign-in.
- Added a public Google-auth capability response and fail-fast provider
  validation without exposing credentials.
- Made backend environment loading independent of the launch directory.
- Removed hardcoded production domains from frontend, backend, and Nginx
  runtime configuration.
- Added `PUBLIC_SITE_URL`, `SEO_INDEXING_ENABLED`, and `GOOGLE_AUTH_ENABLED`
  configuration contracts.
- Made SEO non-indexable by default until a real HTTPS domain is configured.
- Added build-time canonical, robots, sitemap, Open Graph, and structured-data
  generation.
- Added prerendered HTML for `/`, `/terms`, and `/privacy`.
- Added a single-origin Nginx deployment template with security and
  `X-Robots-Tag` headers.
- Deferred Socket.IO initialization until authentication.
- Removed frontend lint errors encountered during production verification.

## Verification

- Frontend production build: passed.
- Frontend ESLint: passed with no errors.
- Prisma schema validation and backend syntax checks: passed.
- Better Auth anonymous session endpoint: HTTP 200.
- Google social-provider initiation: HTTP 200 with an authorization URL.
- Full tenant, waiter, takeaway, payment, and super-admin smoke test: passed.
- Browser checks confirmed:
  - no API or Socket.IO calls on `/`;
  - no POS skeleton on public or auth pages;
  - no browser console errors;
  - protected `/app/*` redirects preserve a safe return path;
  - legacy private URLs remain compatible.

## Domain Activation

Until a domain is selected, keep:

```env
SEO_INDEXING_ENABLED=false
PUBLIC_SITE_URL=
```

When the final domain is ready, configure its HTTPS origin, authorize the exact
Google callback URL, and then enable SEO indexing.
