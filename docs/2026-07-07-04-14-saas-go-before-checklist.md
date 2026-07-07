# SaaS Go-Before Checklist

Date and time: 2026-07-07 04:14 +05:30

## Purpose

Use this checklist before approving any production launch of the Restaurant POS SaaS.

There are two launch levels:

1. Controlled one-restaurant pilot.
2. Public SaaS launch.

The one-restaurant pilot can go live with tighter operational control. Public SaaS launch requires stronger automation, legal readiness, monitoring, and support processes.

## Decision rule

Do not launch if any hard blocker is open.

For a controlled one-restaurant pilot, medium-risk items may be accepted only if:

- the restaurant is explicitly informed;
- there is daily manual monitoring;
- there is a rollback plan;
- production data is backed up;
- support is available during operating hours.

## Hard blockers

These must be complete before any real restaurant uses the system.

| Area | Checklist item | Status |
| --- | --- | --- |
| Backend security | Write limiter runs before handled write routes | Done |
| Backend security | Auth/session protected APIs cannot be bypassed by direct calls | Required |
| Staff security | `mustChangePassword` is enforced on backend | Done |
| Config | Production startup fails if required secrets are missing | Done |
| Database | Prisma migration baseline exists | Done |
| Database | Production DB is separate from dev/staging DB | Required |
| Database | Backup policy is enabled | Required |
| Database | Restore has been tested at least once | Required |
| Payments | Online payments disabled unless Razorpay keys and webhook are tested | Required |
| Payments | Duplicate Razorpay callbacks do not corrupt payment/order state | Done |
| Deployment | HTTPS is enabled for frontend and backend | Required |
| Deployment | `FRONTEND_URL` and `BETTER_AUTH_URL` use HTTPS in production | Done by validation |
| Verification | Backend validation passes | Required before deploy |
| Verification | Frontend lint and build pass | Required before deploy |
| Verification | Staging smoke test passes | Required before pilot |

## Environment checklist

Set and verify these before production startup.

### Required for production

- `NODE_ENV=production`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET` with at least 32 characters
- `FRONTEND_URL` using HTTPS
- `BETTER_AUTH_URL` using HTTPS
- `SUPER_ADMIN_EMAIL`

### Optional features

Only enable these after testing.

- `ONLINE_PAYMENTS_ENABLED=true`
  - Requires `RAZORPAY_KEY_ID`
  - Requires `RAZORPAY_KEY_SECRET`
  - Requires `RAZORPAY_WEBHOOK_SECRET`
  - Requires Razorpay webhook URL configured to the production backend
- `STAFF_EMAIL_INVITES_ENABLED=true`
  - Requires `RESEND_API_KEY`
  - Requires verified `RESEND_FROM`
  - Requires invite email delivery test
- `GOOGLE_AUTH_ENABLED=true`
  - Requires `GOOGLE_CLIENT_ID`
  - Requires `GOOGLE_CLIENT_SECRET`
  - Requires production callback URL configured in Google Cloud

## Database checklist

Before pilot:

- Create a fresh production database.
- Confirm it is not the same database used for dev or staging.
- Apply Prisma migration baseline only after reviewing the target DB state.
- Confirm daily automated backups.
- Run one restore test into a temporary database.
- Record who has DB access.
- Remove unnecessary shared credentials.

Before public SaaS:

- Add documented migration procedure.
- Add rollback procedure.
- Add database-size monitoring.
- Add slow-query monitoring.
- Add retention policy for audit logs, orders, and exports.

## One-restaurant pilot smoke checklist

Run this on staging first. Run on production only with real setup data and without destructive test scripts.

| Flow | Expected result | Status |
| --- | --- | --- |
| Superadmin login | Superadmin can access platform admin | Pending |
| Restaurant approval | Restaurant can be approved/suspended/reviewed | Pending |
| Owner login | Owner can access dashboard | Pending |
| Staff invite | Staff can be created under restaurant | Pending |
| Temporary password | Staff must change password before using system | Pending |
| Dining areas | Areas can be created, edited, archived | Pending |
| Tables | Tables can be created, assigned to areas, updated | Pending |
| Menu | Categories, items, and variants can be created | Pending |
| Dine-in order | Order can be placed for table | Pending |
| Kitchen flow | Order moves through accepted/preparing/ready | Pending |
| Waiter flow | Order can be served | Pending |
| Cash payment | Payment marks order paid and releases table | Pending |
| Takeaway order | Takeaway order can be created and completed | Pending |
| QR menu | Public QR menu loads and respects plan gating | Pending |
| Health check | `/api/health` confirms DB connectivity | Pending |

## Payment go-live checklist

Keep online payments off until every item below is complete.

- Razorpay live keys are configured.
- Webhook secret is configured.
- Webhook URL points to production backend.
- Signature verification passes.
- Remote Razorpay payment amount matches order total.
- Duplicate webhook delivery returns safe existing payment state.
- Failed payment does not mark order paid.
- Paid order releases table.
- Receipt/reprint flow works.
- Refund/cancellation policy is documented.

## Operational checklist

Before pilot:

- Deployment target is selected and documented.
- Rollback method is documented.
- Backend logs are available.
- Frontend error reports can be collected manually or automatically.
- Uptime monitor checks backend health endpoint.
- Daily backup status is checked.
- Support contact is available to the restaurant.

Before public SaaS:

- Centralized logging.
- Error alerting.
- Uptime alerting.
- Payment failure alerting.
- Database backup alerting.
- Incident response process.
- Admin/support playbook.
- Rate-limit monitoring.
- Abuse/spam monitoring.

## Legal and public-site checklist

Before pilot:

- Replace placeholder legal/support email addresses.
- Confirm business name.
- Confirm support email.
- Confirm refund/cancellation policy if payments are enabled.

Before public SaaS:

- Final Terms of Service.
- Final Privacy Policy.
- Cookie/tracking disclosure if analytics are used.
- Data processing and retention policy.
- Payment terms.
- Support/SLA policy.
- Public contact page.

## Known limitations to accept only for pilot

These are acceptable only for a controlled one-restaurant pilot, not for broad SaaS launch.

- Money fields still use `Float`.
- Inventory should be treated as beta unless strict stock accounting is verified.
- Manual support is required for launch week.
- Staging smoke must be completed before using real restaurant data.
- Legal copy still needs final business-specific details before public marketing.

## Final go/no-go signoff

### Controlled one-restaurant pilot

Go only when:

- all hard blockers are closed;
- staging smoke checklist passes;
- production DB backup and restore are verified;
- online payments are either disabled or fully tested;
- restaurant launch contact is assigned.

Current recommendation: conditional go after staging smoke and production environment setup.

### Public SaaS launch

Go only when:

- pilot has run successfully;
- monitoring and alerting are in place;
- legal pages are finalized;
- payment/refund operations are documented;
- migration/rollback process is tested;
- support process is ready.

Current recommendation: no-go for public SaaS until operational, legal, and monitoring items are complete.
