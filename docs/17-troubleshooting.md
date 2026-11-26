# 17 — Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `SQLSTATE[08006]` connection refused | Postgres not running / wrong env | `docker compose -f docker/docker-compose.yml up -d postgres`, check `DB_*` in `backend/.env` |
| `php artisan key:generate` says already set | `.env` has APP_KEY | intentional; only regenerate if you want to invalidate encrypted data |
| API returns CORS error in browser | `APP_FRONTEND_URL` mismatch | set exact origin (scheme + host + port), `php artisan config:clear` |
| Admin login 401 with correct password | token cached in cookie from old env | clear `gp_admin_token` cookie, log in again |
| Upload stuck at `pending` | queue worker not running, or legacy `jobs` table schema | start `php artisan queue:work`, run `php artisan migrate` (migration `...000010_fix_queue_tables` adds `reserved_at`/`failed_jobs`), inspect `jobs`/`failed_jobs` |
| Upload `failed` with "unsafe path" | archive contains `../` or absolute path | repackage with relative paths (docs/08) |
| Game iframe blank | CSP blocks external script or missing entry | bundle assets locally, check `entry_file`, inspect browser console on game host |
| `Refused to frame ... frame-ancestors` | `APP_FRONTEND_URL`/`GAME_HOST_URL` mismatch | set `APP_FRONTEND_URL` to the portal origin, clear config cache |
| Thumbnail broken in prod | private bucket URL unsigned/expired | ensure `thumbnail_url` comes from API (temporary signed URL), check R2 credentials |
| `Class "ZipArchive" not found` | PHP zip extension missing | install `php-zip`, rebuild API image |
| Tests fail with `Storage::fake` mismatch | disk name changed | use `Storage::fake('games')` and set `FILESYSTEM_DISK=games` in `phpunit.xml` |
| Next.js build fails env missing | `API_URL` unset | copy `.env.example` to `.env.local`, rebuild |
| Playwright cannot reach game host | ports not exposed | start API on :8400 and game host on 127.0.0.1:8401, see docker compose |
| `EADDRINUSE` on 3000/8080/8083/9000 | another local service (e.g. Caddy) owns the port | GamePortal never binds these; use :4300 web, :8400 API, :8401 game host |
| `Blocked cross-origin request to /_next/hmr` or font 403 | Next 16 dev-origin protection | set `NEXT_ALLOWED_DEV_ORIGINS=<hostname-ip>` in `frontend/.env.local` and restart dev (hostname only, no scheme/port) |
| API 500 with `SQLSTATE[08006] ... Connection refused` | PostgreSQL not running | start Postgres via Docker, or use the SQLite local fallback in [13-configuration.md](13-configuration.md), then `php artisan migrate --seed --force` |
| LAN device cannot reach API/game host | bound only to 127.0.0.1, or browser-facing URLs still use localhost | start Laravel with `--host=0.0.0.0`, use the dev machine IP in public URLs, and keep the game host on a different hostname |

## Getting help

1. Reproduce with the exact commands in `docs/11-development-workflow.md`.
2. Capture `X-Request-Id` from the failing response and find it in logs.
3. Check `docs/00-index.md` to see if the area is implemented yet.
4. Include env versions (`php -v`, `node -v`, `psql --version`) in any report.
