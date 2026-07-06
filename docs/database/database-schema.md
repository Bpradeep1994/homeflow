# HomeFlow — Database Schema (V1)

TypeORM entities in `backend/src/entities/`. PostgreSQL in production
(`DATABASE_URL`), SQLite file in dev. All money columns are integer rupees;
all enums are stored as portable `text`.

## users

| Your field | Column | Type | Notes |
|---|---|---|---|
| UserID | `id` | uuid PK | |
| Name | `name` | text, nullable | set on first login or profile edit |
| Phone | `phone` | text, unique | login identity (OTP) |
| Email | `email` | text, unique, nullable | for password login / receipts |
| Password | `passwordHash` | text, nullable | bcrypt; null = OTP-only account; never serialized |
| Role | `role` | `customer` \| `provider` \| `admin` | |
| Status | `status` | `ACTIVE` \| `BLOCKED` | blocked users cannot log in, book, or accept |
| CreatedAt | `createdAt` | timestamp | |

## provider_profile

One row per provider, FK to `users` — auth/identity stays on users, the
vocation lives here.

| Your field | Column | Type | Notes |
|---|---|---|---|
| ProviderID | `id` | uuid PK | |
| UserID | `userId` | FK → users, unique | |
| Experience | `experienceYears` | int | |
| Services | `services` | json string[] | category names; providers can serve several |
| City | `city` | text | plus `serviceAreas` json — localities within the city |
| VerificationStatus | `verificationStatus` | NONE / PENDING / APPROVED / REJECTED | |
| Rating | `rating` | float | denormalized average, updated on each review |

Also: `idDocumentUrl`, `jobsDone`, `online`, `createdAt`. Dispatch only offers
bookings to APPROVED profiles whose `services` include the booked category and
whose user is ACTIVE.

## service_category / sub_service (Services)

- `service_category`: `id` (slug PK), `name`, `emoji`

| Your field | Column | Notes |
|---|---|---|
| ServiceID | `id` | slug PK, e.g. `ac-service` |
| Category | `categoryId` | FK → service_category |
| Name | `name` | |
| Price | `price` | int rupees; visit charge when `quoteOnVisit` |
| Duration | `durationMinutes` | typical job length, drives slot planning |
| Description | `description` | shown on the service card |

Also: `quoteOnVisit`, `emergency`, `active` (admin kill-switch).

## booking

`id` (HF-… PK), `customerId` FK, `providerId` FK nullable, `services` M:N join
table, `address`, `date`, `timeSlot`,
`status (PENDING/ASSIGNED/ON_THE_WAY/IN_PROGRESS/COMPLETED/CANCELLED)`,
`amount`, `declinedBy (json)`, `history (json status timeline)`, `createdAt`.

## payment

`id` (uuid PK), `bookingId` FK unique, `method (UPI/CARD/CASH)`, `amount`,
`commission` (20%), `payout` (80%), `status (PAID/REFUNDED)`,
`settledAt` (null until the weekly payout batch), `createdAt`.

## review

| Your field | Column | Notes |
|---|---|---|
| ReviewID | `id` | uuid PK |
| BookingID | `bookingId` | FK → booking, unique — one review per booking |
| CustomerID | `customerId` | FK → users |
| ProviderID | `providerId` | FK → users |
| Rating | `rating` | int 1–5, validated |
| Comment | `comment` | optional |

Plus `createdAt`. Writing a review refreshes the provider profile's
denormalized `rating` average and notifies the provider.

## saved_address / favorite / ticket

- `saved_address`: `id`, `userId` FK, `label`, `line`, `createdAt` — customer address book.
- `favorite`: `id`, `customerId` FK, `providerId` FK (unique pair), `createdAt`.
- `ticket`: `id`, `userId` FK, `subject`, `message`, `bookingId?`,
  `priority (HIGH/MEDIUM/LOW)`, `status (OPEN/PENDING/RESOLVED)`, timestamps.

`review` also carries `photos (json[])`, `reported`, `reportReason` for moderation.

## notification

`id` (uuid PK), `userId`, `title`, `body`, `read`, `createdAt` — the in-app
feed; push/SMS/email delivery happens at write time via channel stubs.

## Auth endpoints backed by this schema

- `POST /auth/otp/request` + `/auth/otp/verify` — registration & login (dev OTP `123456`)
- `POST /auth/login` — email + password (seeded admin: `admin@homeflow.in` / `admin123`)
- `POST /auth/password/reset` — OTP-verified password (re)set, optionally attaching an email
