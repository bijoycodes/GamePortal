# 12 — Deployment

## Environments

| Env | App URL | API URL | Game host | Storage |
|-----|---------|---------|-----------|---------|
| local | http://localhost:4300 | http://localhost:8400 | http://127.0.0.1:8401 (same Laravel app, different host + port) | local disk |
| staging | https://staging.example.com | https://api.staging.example.com | https://games.staging.example.com | R2 test bucket |
| production | https://play.example.com | https://api.example.com | https://games.example.com | R2 prod bucket |

The game host **must** be a different registrable host or carefully separated subdomain with
no shared cookies. `session.cookie_domain` must not include the game host.

## Production topology

- **Web tier**: Next.js standalone server (or Vercel), 2+ instances, `NEXT_PUBLIC_*` build-time vars.
- **API tier**: Laravel PHP-FPM behind nginx, 2+ instances, shared PostgreSQL, shared R2 bucket.
- **Worker tier**: `php artisan queue:work --tries=3 --backoff=10` for upload jobs; scale on queue depth.
- **Game tier**: nginx → PHP-FPM route `/g/*` behind CDN, separate hostname, TLS, no cookies.
- **Scheduler**: one instance runs `php artisan schedule:run` every minute (retention, cache warm).

## Build and release

```bash
# API image
docker build -f docker/Dockerfile.api -t gameportal-api .
# Web image
docker build -f docker/Dockerfile.web -t gameportal-web .

# Release steps
1. php artisan migrate --force            # run once per release, before traffic cutover
2. php artisan config:cache && php artisan route:cache
3. php artisan queue:restart
4. roll web tier, then API tier
5. bash scripts/smoke.sh https://api.example.com https://play.example.com
```

Migrations must be additive/backwards-compatible for one release (expand/contract), since
old and new app versions overlap during rollout.

## Cloudflare R2 setup

1. Create bucket `gameportal-games`, private.
2. Create API token with Object Read & Write scoped to the bucket.
3. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
   `R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com`, `R2_URL` (optional public
   signer base).
4. Set `FILESYSTEM_DISK=games` so uploads use the `games` disk.
5. Optional: attach a custom domain to the bucket **only** for non-sensitive signed assets;
   game files still stream through the game host for header control.

## CDN for game host

- Cache `GET /g/{slug}/{path}` for immutable assets (filename + version hash recommended).
- Do not cache `GET /g/{slug}` redirect longer than 60s so disabling is fast.
- Forward `Content-Security-Policy` and do not strip security headers.
- Purge by prefix `games/{uuid}/` when replacing a game package.

## Rollback

- App rollback: redeploy previous image; do not reverse additive migrations.
- Game rollback: `POST /api/admin/games/{id}/disable`, point to previous upload (ops runbook).
- Data rollback: PostgreSQL PITR per platform policy; audit logs help identify the change window.

## Health checks

- API: `GET /api/health` → 200 JSON.
- Web: `GET /` → 200 HTML.
- Worker: `php artisan queue:failed` empty and heartbeat from scheduler.

## Secrets

Use platform secret manager (Docker secrets, GitHub Actions secrets, cloud secret store).
Never bake `.env` into images. Rotate `SANCTUM` tokens by deleting rows; rotate R2 keys by
updating env and restarting workers.
