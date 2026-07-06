# Deployment

V1 target: one VM (or container host) + managed extras.

| Piece | Where | Notes |
|---|---|---|
| API (NestJS) | Docker via [../docker](../docker/) | `DATABASE_URL`, `JWT_SECRET`, `ADMIN_PASSWORD` env vars required in prod |
| PostgreSQL | managed (RDS/Neon/Supabase) or the compose `db` service | turn off TypeORM `synchronize` and use migrations before real customers |
| Admin (Next.js) | Vercel, or `next start` behind nginx | |
| Mobile apps | Play Store / App Store via Flutter build | point at the API with `--dart-define=API_URL=` |
| Uploads | Cloudflare R2 / S3 | replace the local-disk seam in `apps/api/src/uploads` |
| Push | Firebase Cloud Messaging | plug into `apps/api/src/notifications` |

Checklist before first real deployment:
- [ ] Change `JWT_SECRET`, admin password, DB password
- [ ] TypeORM migrations instead of `synchronize`
- [ ] Real SMS gateway for OTP (AuthService)
- [ ] Payment gateway (PaymentsService)
- [ ] R2/S3 for uploads; FCM for push
- [ ] nginx + TLS in front (see [../nginx](../nginx/))
