# HomeFlow Customer App

Flutter app for booking home services, wired to the NestJS API
([lib/api/client.dart](lib/api/client.dart)): OTP login, live catalog, real
bookings with cancel/pay/review. Offers and the address book are still local.

## Run

Start the API first (`cd appspi && npm run start:dev`), then:

```powershell
D:\tools\flutter\bin\flutter run -d chrome    # web preview (API on localhost:4000)
```

- Dev OTP is always **123456** (shown as a hint in the login screen).
- Android emulator reaches the host API automatically via `10.0.2.2`.
- Physical phone: `flutter run --dart-define=API_URL=http://<your-pc-ip>:4000`.
- Simulate the provider side: `node scripts/provider-sim.mjs`
  (run 1× to accept your booking, then 3× more to reach COMPLETED — then Pay
  and Review light up in the app).

## Structure

```
lib/
├── main.dart                  # app entry
├── theme.dart                 # Material 3 theme + ₹/date formatting
├── models/models.dart         # ServiceCategory, SubService, Booking, …
├── data/catalog.dart          # mock catalog, offers, addresses, bookings
└── screens/
    ├── root_nav.dart          # bottom nav: Home · Bookings · Favorites · Support · Profile
    ├── home_screen.dart       # greeting, search, categories, offers
    ├── category_screen.dart   # sub-service selection + Book Now
    ├── booking_flow_screen.dart   # Address → Date → Time → Price → Confirm
    ├── booking_confirmed_screen.dart
    ├── bookings_screen.dart   # upcoming / completed tabs
    ├── favorites_screen.dart
    ├── support_screen.dart
    └── profile_screen.dart
```
