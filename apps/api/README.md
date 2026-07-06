# HomeFlow API (NestJS)

REST backend for the HomeFlow platform: Auth, Booking, Payment, Notification
services over PostgreSQL. Full endpoint contract: [docs/api-design.md](../docs/api-design.md).

## Run

```powershell
cd backend
npm run start:dev        # dev with watch, http://localhost:4000
```

No database setup needed to start: without `DATABASE_URL` it uses a local SQLite
file (`homeflow-dev.sqlite`). To use PostgreSQL:

```powershell
$env:DATABASE_URL = "postgres://user:pass@localhost:5432/homeflow"
npm run start:dev
```

## Try the flow (dev OTP is always `123456`)

```bash
# login
curl -X POST localhost:4000/auth/otp/verify -H "content-type: application/json" \
  -d '{"phone":"+919876543210","otp":"123456","name":"You"}'

# book (use the accessToken from above)
curl -X POST localhost:4000/bookings -H "authorization: Bearer <token>" \
  -H "content-type: application/json" \
  -d '{"serviceIds":["ac-service"],"address":"Flat 302, Madhapur, Hyderabad","date":"2026-07-06","timeSlot":"12:00 – 14:00"}'
```

Seeded demo providers (log in with role preserved): `+919000000001` (Ravi, AC
Repair), `+919000000002` (Suresh, Electrician), `+919000000003` (Lakshmi, Cleaning).

## What's mock vs real

- **Real:** dispatch (first-accept-wins with 409 on races), one-step lifecycle
  enforcement, 20% commission math, one-review-per-booking, notification feed.
- **Dev-mode:** OTP is fixed `123456` (SMS gateway plugs into `AuthService`),
  payments record instantly (gateway plugs into `PaymentsService`), pushes are
  DB rows (FCM plugs into `NotificationsService.notify`).
