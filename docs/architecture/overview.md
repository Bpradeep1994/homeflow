# HomeFlow — Architecture Overview

```
                    Customers                 Professionals
                        │                          │
                 Customer App (Flutter)    Provider App (Flutter)
                        │                          │
                        └──────────┬───────────────┘
                                   │  REST + JWT
                          Backend (NestJS) ───────── Admin Panel (Next.js)
                                   │
        ┌──────────────┬───────────┼───────────────┬──────────────┐
        │              │           │               │              │
      Auth          Booking     Payment       Notification     Reports
     Service        Service     Service         Service
        │              │           │               │
        └──────────────┴───────────┴───────────────┘
                                   │
                        PostgreSQL (TypeORM)
                                   │
                  Cloud Storage (R2/S3 — uploads seam)
```

## Key decisions

- **OTP-first auth.** Phone OTP is registration *and* login; passwords are
  optional (bcrypt) and used mainly by admins. Blocked users are rejected at login.
- **Dispatch = broadcast + first-accept-wins.** A new booking notifies every
  APPROVED, ACTIVE provider whose profile serves the category; the first accept
  assigns it (concurrent accepts get 409). Declines hide the offer per provider.
- **Enforced lifecycle.** `PENDING → ASSIGNED → ON_THE_WAY → IN_PROGRESS →
  COMPLETED → CLOSED` (+ `CANCELLED`), one step at a time; `CLOSED` fires
  automatically once payment and review both exist.
- **Money.** Integer rupees everywhere. 20% commission at payment time; payouts
  settle in a weekly admin batch; refunds blocked after settlement.
- **Dev-mode seams.** Fixed OTP `123456` (→ SMS gateway), instant payments
  (→ gateway), DB-row notifications with push/SMS/email channel stubs (→ FCM
  etc.), local-disk uploads (→ R2/S3), SQLite when `DATABASE_URL` is unset (→
  PostgreSQL). Each is one class swap.

## Repo layout

```
apps/         customer-app, provider-app (Flutter) · admin-web (Next.js) · api (NestJS)
packages/     ui (shared Flutter theme/formatters) · types, shared, utils (TS)
infrastructure/ docker (compose: postgres+api) · nginx · deployment
docs/         api/ · architecture/ · database/ · product-spec-v1.md
scripts/      e2e-*.mjs API test suites · provider-sim.mjs demo helper
```

## Status (July 2026)

- API: complete for V1 spec, exercised by four E2E suites in `scripts/`.
- Customer app: wired to the API (OTP login, live catalog/bookings/pay/review).
- Provider app & admin panel: full UI on mock data — wiring is the next step.
