# HomeFlow Provider App (HomeFlow Pro)

Flutter app for professionals. V1 runs on mock data
([lib/data/job_store.dart](lib/data/job_store.dart)) — real dispatch arrives via
the NestJS backend + Firebase Cloud Messaging later.

## Run

```powershell
cd apps\provider
flutter run -d chrome
```

Toggle **Online** on the dashboard — a simulated booking offer arrives a few
seconds later with a 30-second Accept/Decline countdown.

## Structure

```
lib/
├── main.dart                    # app entry
├── theme.dart                   # indigo Material 3 theme + ₹/date formatting
├── models/models.dart           # Job, JobStatus, IncomingBooking
├── data/job_store.dart          # ChangeNotifier job state + mock jobs + offer pool
└── screens/
    ├── root_nav.dart            # bottom nav: Home · Jobs · Earnings · Profile
    ├── dashboard_screen.dart    # stat cards, online/offline, today's schedule
    ├── incoming_booking_sheet.dart  # New Booking offer w/ countdown + Accept/Decline
    ├── jobs_screen.dart         # Today / Upcoming / Completed tabs
    ├── earnings_screen.dart     # total, weekly, payment history
    ├── profile_screen.dart      # verification badge, skills, payouts, docs
    └── widgets/job_card.dart    # shared job card w/ status progression button
```
