# HomeFlow

Mobile-first home services platform. Customers book electricians, AC repair, and
house cleaning from their phones; providers get jobs in a separate app; operations
run from a web admin panel.

📄 Start here: [docs/architecture/overview.md](docs/architecture/overview.md) ·
[product spec](docs/product-spec-v1.md) · [API contract](docs/api/api-design.md) ·
[DB schema](docs/database/database-schema.md)

## Monorepo

| Path | What | Stack | Status |
|---|---|---|---|
| [apps/customer-app](apps/customer-app/) | Customer app | Flutter | ✅ Wired to API (OTP login, live bookings) |
| [apps/provider-app](apps/provider-app/) | Provider app | Flutter | ✅ Wired to API (offers, jobs, earnings, schedule) |
| [apps/admin-web](apps/admin-web/) | Admin panel | Next.js | ✅ Wired to API (login, live ops, reports) |
| [apps/api](apps/api/) | REST API | NestJS + PostgreSQL | ✅ Complete for V1, E2E-tested |
| [packages/ui](packages/ui/) | Shared Flutter theme + formatters | Dart | used by both apps |
| [packages/types](packages/types/) · [shared](packages/shared/) · [utils](packages/utils/) | Shared TS contract/constants/helpers | TS | starters |
| [infrastructure/](infrastructure/) | docker compose (postgres+api), nginx, deployment | | |
| [scripts/](scripts/) | E2E API suites + provider simulator | Node | `node scripts/e2e-booking.mjs` |

## Quick start (dev)

```powershell
# 1. API (SQLite dev DB, seeds itself; dev OTP is 123456)
cd apps\api; npm run start:dev            # http://localhost:4000

# 2. Customer app
cd apps\customer-app; flutter run -d chrome

# 3. Simulate the provider side (until the provider app is wired)
node scripts\provider-sim.mjs             # run repeatedly to advance the job

# 4. Admin panel
cd apps\admin-web; npm run dev            # http://localhost:3000
```

Tooling: Flutter SDK at `D:\tools\flutter`, Node.js LTS. Installs go on the D: drive.
