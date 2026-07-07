# Production Readiness Implementation - One Restaurant Launch

Date and time: 2026-07-07 04:08 +05:30

## Scope

This implementation prepares the POS system for a controlled private production launch with one approved restaurant. It is not a full public SaaS launch certification.

## Changes implemented

### Backend request safety

- Moved the `/api` write limiter before the handled API route mounts.
- The limiter now applies to `POST`, `PUT`, `PATCH`, and `DELETE` before normal controllers run.
- Kept Razorpay webhook raw-body handling intact; the limiter does not parse or consume the body.
- Added graceful shutdown for `SIGTERM` and `SIGINT`.
- Shutdown now stops the HTTP server, closes Socket.IO, disconnects Prisma, and force-exits after a timeout if cleanup hangs.

Why: the previous write limiter was mounted after the API routes, so successful write requests bypassed it.

### Production configuration validation

- Added production startup validation for `DATABASE_URL`.
- Required `BETTER_AUTH_SECRET` to be explicitly set and at least 32 characters in production.
- Added `ONLINE_PAYMENTS_ENABLED`.
- Added `STAFF_EMAIL_INVITES_ENABLED`.
- Required Razorpay key, secret, and webhook secret when online payments are enabled in production.
- Required Resend configuration when staff email invites are enabled in production.
- Updated backend `.env.example` with the new feature flags.

Why: production should fail fast when required operational secrets are missing instead of failing during live restaurant operations.

### Staff password enforcement

- Added backend enforcement for `mustChangePassword`.
- Allowed password-change-required users to access only:
  - `/api/restaurant/context`;
  - `/api/restaurant/staff/change-password`;
  - `/api/auth/*`.
- Blocked normal protected restaurant operations until the temporary password is changed.

Why: frontend-only enforcement can be bypassed by direct API calls.

### Payment launch hardening

- Added online payment feature gating through `ONLINE_PAYMENTS_ENABLED`.
- Made payment completion idempotent by checking existing payments by `paymentId` and `orderId`.
- Added duplicate-write recovery for Prisma unique constraint conflicts.
- Kept Razorpay signature and remote payment verification before online payments are marked paid.

Why: duplicate Razorpay callbacks or repeated client confirmations should not create inconsistent order/payment state.

### Email launch gating

- Added outbound email gating through `STAFF_EMAIL_INVITES_ENABLED`.
- When disabled, email send attempts are logged and skipped.

Why: production should not silently depend on Resend unless email delivery is deliberately configured and tested.

### Prisma migration baseline

- Added a generated baseline migration:
  - `pos-backend/prisma/migrations/20260707000000_initial_baseline/migration.sql`
- The migration was generated from the current Prisma schema only.
- No migration was applied to any live, staging, or production database.

Why: production deployment needs a reproducible database baseline instead of relying only on `schema.prisma`.

### CI baseline

- Added GitHub Actions workflow:
  - `.github/workflows/production-readiness.yml`
- Backend job runs:
  - `npm ci`;
  - `npm run check`;
  - `npm audit --omit=dev`.
- Frontend job runs:
  - `npm ci`;
  - `npm run lint`;
  - `npm run build`;
  - `npm audit --omit=dev`.

Why: production-readiness checks should run consistently before merge/deploy.

## Files changed by this implementation

- `.github/workflows/production-readiness.yml`
- `pos-backend/.env.example`
- `pos-backend/app.js`
- `pos-backend/config/config.js`
- `pos-backend/config/email.js`
- `pos-backend/config/socket.js`
- `pos-backend/controllers/paymentController.js`
- `pos-backend/middlewares/requireAuth.js`
- `pos-backend/prisma/migrations/20260707000000_initial_baseline/migration.sql`
- `docs/2026-07-07-04-08-production-readiness-one-restaurant.md`

## Verification performed

### Passed

- `npm run check` from `pos-backend`
  - Result: passed.
  - Prisma schema is valid.
  - `app.js` syntax check passed.
- `node --check app.js`
  - Result: passed.
- `node --check config/config.js`
  - Result: passed.
- `node --check config/socket.js`
  - Result: passed.
- `node --check config/email.js`
  - Result: passed.
- `node --check middlewares/requireAuth.js`
  - Result: passed.
- `node --check controllers/paymentController.js`
  - Result: passed.
- `npx prisma validate`
  - Result: passed.
- Production config validation with safe local placeholder values
  - Result: passed.
  - Confirmed `ONLINE_PAYMENTS_ENABLED=false` and `STAFF_EMAIL_INVITES_ENABLED=false`.
- Static limiter-order check
  - Result: passed.
  - `apiLimiter`, `writeLimiter`, and `adminLimiter` are mounted before `/api/payment/webhook` and normal route mounts.
- `npm run lint` from `pos-frontend`
  - Result: passed with 4 existing warnings.
- `npm run build` from `pos-frontend`
  - Result: passed.
  - Existing Browserslist/caniuse-lite freshness warning remains.
- Backend `npm audit --omit=dev`
  - Result: 0 vulnerabilities.
- Frontend `npm audit --omit=dev`
  - Result: 0 vulnerabilities.
- `git diff --check`
  - Result: no whitespace errors.
  - Existing warning: `pos-frontend/src/pages/PlatformAdmin.jsx` CRLF will be replaced by LF when Git touches it.

## Not performed

- Did not run `npm run smoke`.
- Did not run destructive table-combination checks.
- Did not apply Prisma migrations to any database.
- Did not start the backend against the configured remote database.

Reason: the existing smoke/table scripts create and delete test data, and the configured database may be a remote Neon database. These actions require an explicit staging/test database approval before execution.

## Known remaining limitations

- Money fields still use Prisma `Float`.
  - Acceptable only for a controlled pilot if totals are manually monitored.
  - Recommended follow-up: migrate money to integer minor units or Prisma `Decimal`.
- Inventory updates are still not certified as strict accounting.
  - Treat inventory as beta unless the first restaurant depends on exact stock control.
- Legal pages still need confirmed production business/legal contact details before public launch.
- Full end-to-end smoke verification still needs a staging database.
- Operational readiness still requires deployment-side work:
  - database backups;
  - restore test;
  - uptime monitoring;
  - backend error log monitoring;
  - rollback process.

## First restaurant launch checklist

- Configure production environment:
  - `NODE_ENV=production`;
  - `DATABASE_URL`;
  - `BETTER_AUTH_SECRET` with at least 32 characters;
  - HTTPS `FRONTEND_URL`;
  - HTTPS `BETTER_AUTH_URL`;
  - `SUPER_ADMIN_EMAIL`.
- Keep `ONLINE_PAYMENTS_ENABLED=false` unless Razorpay key, secret, webhook secret, and webhook URL are tested.
- Keep `STAFF_EMAIL_INVITES_ENABLED=false` unless Resend is configured and invite delivery is tested.
- Apply the Prisma migration only to a fresh production database, or reconcile it first if the database already has tables.
- Run staging smoke flow before live launch:
  - superadmin approval;
  - owner/admin login;
  - staff invite;
  - forced password change;
  - dining area/table setup;
  - menu setup;
  - dine-in order;
  - kitchen/waiter progression;
  - cash payment;
  - table release;
  - takeaway order;
  - QR public menu;
  - health endpoint.

## Go/no-go status

Status: conditional go for a controlled one-restaurant pilot after staging smoke verification and production environment setup.

Not yet a go for open public SaaS launch.
