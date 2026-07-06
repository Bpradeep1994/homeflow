# src layout

```
main.ts               # bootstrap: CORS, validation, port 4000
app.module.ts         # DB config (Postgres via DATABASE_URL, SQLite fallback), JWT
entities/             # User, catalog, Booking, Payment, Review, Notification
auth/                 # phone OTP → JWT (dev OTP: 123456), AuthGuard
catalog/              # GET /catalog + seed (catalog, demo providers)
bookings/             # create → dispatch → accept/decline → lifecycle
payments/             # pay after completion, 20% commission split
reviews/              # review once per completed booking, provider avg
notifications/        # stored feed; NotificationsService.notify() = FCM seam
```
