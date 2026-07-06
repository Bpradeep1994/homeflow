# HomeFlow API — V1 Contract

NestJS REST API. JWT bearer auth (phone OTP). All money in integer rupees.
Base URL (dev): `http://localhost:4000`

## Auth Service

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/auth/otp/request` | public | `{phone}` → sends OTP (dev: OTP is always `123456`, echoed in response) |
| POST | `/auth/otp/verify` | public | `{phone, otp, role?}` → `{accessToken, user}`; creates the user on first login |
| GET | `/auth/me` | any | current user profile |

Roles: `customer` (default), `provider` (pass `role: "provider"` on first verify), `admin` (seeded).

**No passwords by design** — OTP is both registration and login, so "password
reset" is just requesting a fresh OTP. Seeded logins (dev OTP `123456`):
admin `+919000000000`; approved providers `+919000000001/2/3`.

## User Management & Provider Verification

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/uploads` | any | multipart `file` (png/jpg/webp/pdf ≤5MB) → `{url}`; local disk now, R2/S3 later |
| POST | `/provider/verification` | provider | `{idDocumentUrl, skill, serviceAreas[]}` → `PENDING` |
| PATCH | `/provider/availability` | provider | `{online}` toggle |
| GET | `/admin/users?role=` | admin | list users |
| PATCH | `/admin/users/:id/block` | admin | `{blocked}` — blocked users cannot book/accept |
| GET | `/admin/verifications` | admin | pending provider verifications |
| POST | `/admin/verifications/:userId` | admin | `{decision: approve\|reject, reason?}` |

Only `APPROVED`, unblocked providers receive dispatch notifications, see offers,
or can accept. Dispatch additionally requires the provider to be **online**, not
on **holiday** for the booking date, and the slot to start inside their
**working hours**.

## Provider Features

| Method | Path | Who | Purpose |
|---|---|---|---|
| PATCH | `/provider/profile` | provider | `{photoUrl?, certificates?, workingStart?, workingEnd?, holidays?, serviceAreas?}` |
| POST | `/provider/jobs/:id/cancel` | provider | back out before starting → booking re-enters dispatch (never re-offered to the canceller) |
| GET | `/provider/payouts` | provider | now includes `today`, `thisWeek`, `thisMonth` breakdowns |

Verification submit also accepts optional `photoUrl` and `certificates[]`.

## Service Management (admin)

| Method | Path | Purpose |
|---|---|---|
| POST | `/admin/categories` | `{id, name, emoji}` |
| POST | `/admin/categories/:id/services` | `{id, name, price, quoteOnVisit?, emergency?}` |
| PATCH | `/admin/services/:id` | `{price?, active?, name?}` — inactive services are hidden and unbookable |

## Catalog

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/catalog` | public | categories with sub-services and prices (seeded) |

## Roles → capabilities

| Role | Can |
|---|---|
| Customer | register/login (OTP), book, cancel, reschedule, pay, review |
| Provider | verification profile, go online/offline, accept/decline offers, update job status, payouts view |
| Admin | verify providers, manage users (block), manage services/pricing, refunds & payout settlement, `GET /admin/reports` |

## Booking Service

Lifecycle (customer-facing label for PENDING is "Searching Provider"):

`PENDING → ASSIGNED → ON_THE_WAY → IN_PROGRESS → COMPLETED → CLOSED`, plus `CANCELLED`.

`CLOSED` is automatic: set when a completed booking has BOTH a successful
payment and a review.

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/bookings` | customer | `{serviceIds[], address, date, timeSlot}` → creates `PENDING` booking |
| GET | `/bookings` | customer | my bookings |
| GET | `/bookings/:id` | owner/assignee | booking detail incl. status history |
| POST | `/bookings/:id/cancel` | customer | allowed until job starts |
| POST | `/bookings/:id/reschedule` | customer | `{date, timeSlot}` while PENDING/ASSIGNED; provider notified |
| GET | `/provider/offers` | provider | open `PENDING` bookings I haven't declined |
| POST | `/provider/offers/:id/accept` | provider | first-accept-wins → `ASSIGNED` |
| POST | `/provider/offers/:id/decline` | provider | hides the offer for this provider |
| GET | `/provider/jobs` | provider | my assigned jobs |
| POST | `/provider/jobs/:id/status` | provider | `{status}` advance lifecycle one step |

## Payment Service

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/bookings/:id/pay` | customer | `{method: UPI\|CARD\|CASH}` after completion; records 20% commission + 80% payout |
| GET | `/payments` | any | my payments (customer) / payouts (provider) |
| GET | `/provider/payouts` | provider | `{totalEarned, pendingSettlement, settled, payments}` |
| POST | `/admin/payments/:id/refund` | admin | refund a payment (blocked once payout settled) |
| GET | `/admin/payouts` | admin | unsettled payouts grouped by provider |
| POST | `/admin/payouts/settle` | admin | weekly batch: mark all settled + notify providers |

## Reports (admin)

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/reports` | platform summary: users, provider verification/online counts, bookings by status + completion rate, revenue (collected/commission/payouts/pending/refunded), review average, top providers |

## Reviews

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/bookings/:id/review` | customer | `{rating 1-5, comment?}` once, after completion |
| GET | `/providers/:id/reviews` | public | provider's reviews + average |
| GET | `/providers/:id/score` | public | scorecard: avg, star distribution, jobs done, completion rate |

## Customer Account Features

| Method | Path | Who | Purpose |
|---|---|---|---|
| PATCH | `/auth/me` | any | `{name?, email?}` profile edit |
| GET/POST | `/addresses` · DELETE `/addresses/:id` | customer | saved address book |
| GET | `/favorites` | customer | favorite providers with profiles |
| POST/DELETE | `/favorites/:providerUserId` | customer | add / remove favorite |
| POST | `/bookings/:id/reschedule` | customer | `{date, timeSlot}` while PENDING/ASSIGNED |
| GET | `/payments/:id/invoice?token=` | owner | HTML invoice (token in query so browsers can open it) |
| POST | `/reviews/:id/report` | any | `{reason}` flag for moderation |
| GET | `/admin/reviews/reported` | admin | flagged reviews |
| POST | `/support/tickets` | any | `{subject, message, bookingId?, priority?}` raise complaint |
| GET | `/support/tickets` | any | my tickets |
| GET/PATCH | `/admin/tickets[/:id]` | admin | queue + `{status}` updates |

Reviews accept `photos: string[]` (URLs from `/uploads`, max 4).

## Admin Panel Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/reports` | dashboard summary (revenue, users, providers, bookings by status) |
| GET | `/admin/reports/trends` | 8-week revenue/bookings/customer-growth, cancellation rate, provider performance |
| GET | `/admin/bookings` · `/admin/payments` · `/admin/reviews` | platform-wide listings |
| GET/POST/PATCH | `/admin/coupons[/:code]` | coupon campaigns (`FLAT`/`PERCENT`, max uses, expiry, pause) |
| GET | `/coupons` | public: active, unexpired coupons (powers the app offers carousel) |

Admin panel auth: `POST /auth/login` with the seeded admin account; JWT held
client-side, all pages behind a login gate.

## Notification Service

Every event stores an in-app feed row, then fans out through three channel
stubs in `notifications.service.ts`: **push** (→ FCM), **sms** (→ MSG91/Twilio),
**email** (→ SES/Resend). Callers opt into SMS/email per event.

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/notifications` | any | my notifications, newest first |
| POST | `/notifications/read` | any | mark all read |

Events that notify: booking created (→ matching providers), accepted (→ customer),
each status change (→ customer), payment received (→ provider), review left (→ provider).

## Database

TypeORM entities: `User`, `ServiceCategory`, `SubService`, `Booking`,
`BookingService` (line items), `Payment`, `Review`, `Notification`.

- `DATABASE_URL` set → PostgreSQL (production path)
- unset → SQLite file `homeflow-dev.sqlite` (zero-install dev)

`synchronize: true` in dev; real migrations before production.
