# HomeFlow — V1 Product Spec

> "I'm building a mobile-first company." Most customers book home services from
> their phones, not a desktop. Three surfaces: **Customer app**, **Provider app**,
> **Admin panel (web)**.

---

## 1. Customer App

### Home Screen

```
Good Morning 👋
What service do you need today?

🔍 Search...
──────────────────────────
⚡ Electrician   ❄️ AC Repair   🧹 House Cleaning
──────────────────────────
📅 My Bookings   ⭐ My Favorites   💬 Support
──────────────────────────
Special Offers
```

### Service Catalog (V1)

| ⚡ Electrician | ❄️ AC Repair | 🧹 House Cleaning |
|---|---|---|
| Fan Repair | AC Installation | Full Home Cleaning |
| Light Installation | AC Service | Kitchen Cleaning |
| Switch Repair | AC Cleaning | Bathroom Cleaning |
| Socket Repair | Gas Refilling | Sofa Cleaning |
| Wiring | Cooling Issue | Carpet Cleaning |
| Door Bell | Water Leakage | Window Cleaning |
| MCB Repair | Compressor Repair | |
| Emergency Service | | |

Each category page lists its sub-services with a single **[ Book Now ]** CTA.

### Booking Flow — no unnecessary steps

```
Select Service
  ↓
Choose Address
  ↓
Choose Date
  ↓
Choose Time
  ↓
Price Estimate
  ↓
Confirm Booking
  ↓
Professional Assigned
  ↓
Track Live
  ↓
Payment
  ↓
Review
```

### Bottom Navigation

`🏠 Home · 📅 Bookings · ❤️ Favorites · 💬 Support · 👤 Profile`

Simple — users understand it immediately.

---

## 2. Provider App (separate app)

### Home Screen
- Today's Jobs
- Upcoming Jobs
- Completed Jobs
- Total Earnings
- Online / Offline toggle
- Profile

### Incoming Booking Card
```
New Booking
  Customer Name
  Address
  Service
  Estimated Earnings
  [ Accept ]   [ Decline ]
```

---

## 3. Admin Panel (web)

- Dashboard
- Customers
- Providers
- Bookings
- Payments
- Reviews
- Coupons
- Reports
- Support

---

## 4. Technology Stack (decided 2026-07-05)

| Layer | Choice |
|---|---|
| Customer App | Flutter |
| Provider App | Flutter |
| Backend | NestJS |
| Database | PostgreSQL |
| Admin Panel | React + Next.js |
| Notifications | Firebase Cloud Messaging |
| Storage | Cloudflare R2 or AWS S3 |
| Maps | Google Maps |

Tooling installs go on the **D: drive** (Flutter SDK: `D:\tools\flutter`).

Repo layout:

```
d:\homeflow
├── apps/
│   ├── customer/    # Flutter customer app
│   └── provider/    # Flutter provider app (later)
├── backend/         # NestJS API (later)
├── admin/           # Next.js admin panel (later)
└── docs/
```

---

## 5. Open Questions (to resolve before build)

These are not in the spec yet but the booking flow depends on them:

1. **Auth** — phone OTP is the norm for this market; email/password adds friction.
2. **Pricing model** — is "Price Estimate" a fixed catalog price per sub-service,
   or an inspection-then-quote flow? Changes the payment step and provider payout logic.
3. **Provider assignment** — auto-dispatch to nearest online provider, broadcast
   to many with first-accept-wins, or manual admin assignment? V1 needs exactly one.
4. **What happens on Decline / no acceptance** — re-dispatch window, customer
   notification, cancellation path.
5. **Cancellation & reschedule** — by customer and by provider; refund rules.
6. **Payments** — gateway choice (UPI-first?), cash-on-completion allowed in V1?
7. **Emergency Service** — same flow with priority dispatch, or separate SLA + surge price?
8. **Service area** — single city at launch? Pincode allowlist keeps this simple.
