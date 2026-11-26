# 13 — Configuration

## Backend (`backend/.env`)

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `APP_NAME` | yes | GamePortal | display name |
| `APP_ENV` | yes | local | environment |
| `APP_KEY` | yes | generated | encryption key |
| `APP_DEBUG` | yes | true locally | error detail (never true in prod) |
| `APP_URL` | yes | http://localhost:8400 | API origin; used for signed URLs and absolute links |
| `APP_FRONTEND_URL` | yes | http://localhost:4300 | allowed CORS origin and CSP `frame-ancestors` for the iframe |
| `LOG_CHANNEL` | yes | stack | logging channel (`stderr` in containers) |
| `LOG_LEVEL` | no | debug | minimum log level |
| `DB_CONNECTION` | yes | pgsql | |
| `DB_HOST` | yes | 127.0.0.1 | |
| `DB_PORT` | yes | 5432 | |
| `DB_DATABASE` | yes | gameplatform | test env uses `gameplatform_test` |
| `DB_USERNAME` | yes | gameportal | |
| `DB_PASSWORD` | yes | secret | |
| `BROADCAST_DRIVER` | no | log | unused in v1 |
| `CACHE_DRIVER` | yes | database | catalogue cache table |
| `FILESYSTEM_DISK` | yes | local | default disk; set `games` in prod |
| `QUEUE_CONNECTION` | yes | database | upload jobs |
| `SESSION_DRIVER` | yes | database | Laravel web sessions (Sanctum guard) |
| `MAIL_MAILER` | no | log | no outbound mail in v1 |
| `GAME_HOST_URL` | yes | http://127.0.0.1:8401 | origin embedded in `player_url`; must differ from app origin and cookie domain |
| `R2_ACCOUNT_ID` | prod | — | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | prod | — | R2 token id |
| `R2_SECRET_ACCESS_KEY` | prod | — | R2 token secret |
| `R2_BUCKET` | prod | gameportal-games | bucket name |
| `R2_ENDPOINT` | prod | — | S3-compatible endpoint |
| `R2_REGION` | no | auto | signing region |
| `R2_URL` | no | — | custom domain for signed temporary URLs |
| `MAX_UPLOAD_MB` | no | 50 | compressed package limit |
| `MAX_UNCOMPRESSED_MB` | no | 150 | extraction limit |
| `MAX_UPLOAD_FILES` | no | 500 | file count limit |
| `GAME_EVENT_RATE_LIMIT` | no | 60 | events/min/session |

## Frontend (`frontend/.env.local`)

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `API_URL` | yes | http://localhost:8400 | server-side API base URL |
| `NEXT_PUBLIC_API_URL` | yes | http://localhost:8400 | browser API base URL (same host in prod via proxy) |
| `NEXT_PUBLIC_APP_URL` | yes | http://localhost:4300 | canonical app origin |
| `NEXT_PUBLIC_GAME_HOST` | no | — | optional override; normally taken from `player_url` returned by API |
| `NEXT_PUBLIC_SITE_NAME` | no | GamePortal | header title |
| `AUTH_COOKIE_NAME` | no | gp_admin_token | HttpOnly cookie name for admin token |
| `NEXT_ALLOWED_DEV_ORIGINS` | no | — | dev only: comma-separated hostnames (no scheme/port) allowed to load Next dev assets/HMR |

### Development from another device (LAN)

Browser-facing URLs must point at the **dev machine**, not the browser's own `localhost`:

- `NEXT_PUBLIC_API_URL=http://<dev-machine-ip>:8400`
- `NEXT_PUBLIC_APP_URL=http://<dev-machine-ip>:4300`
- `APP_URL`, `APP_FRONTEND_URL` and `GAME_HOST_URL` in `backend/.env` must use the same
  reachable IP for the app/API, and a **different hostname** for the game host.
- Start both Laravel servers with `--host=0.0.0.0`; binding `127.0.0.1` is not reachable
  from another device.
- The game host must stay on a separate hostname (for example `<ip>.nip.io` or a hosts-file
  entry) so it cannot share cookies with the app origin. See DR-003 and DR-015.
- Set `NEXT_ALLOWED_DEV_ORIGINS=<dev-machine-ip>` and restart `npm run dev`, otherwise
  Next 16 blocks `/_next/hmr` and `/_next/font` requests from that hostname.

When Docker/PostgreSQL is unavailable, local development may set `DB_CONNECTION=sqlite`
and `DB_DATABASE=database/database.sqlite`, then run `php artisan migrate --seed --force`.
Staging and production must keep PostgreSQL; the automated test suite already uses SQLite.
Do not run `php artisan config:cache` in local dev: a cached config overrides the `env()`
values that `phpunit.xml` forces for tests. Run `php artisan config:clear` if you have
cached it, then restart the API and game-host processes.

## Config files

- `frontend/tsconfig.json`: `jsx: "react-jsx"` so Next 16 builds and Vite 8/Oxc transforms
  Vitest TSX consistently; `.next/dev/types/**/*.ts` is included for Next 16 typegen.
- `frontend/vitest.config.mts`: ESM config (`.mts` avoids Vite's native-loader warning),
  jsdom environment, `@` alias, test setup file.
- `frontend/next.config.ts`: `allowedDevOrigins` from `NEXT_ALLOWED_DEV_ORIGINS` so LAN/tunnel
  hostnames can load dev assets (dev-only), and `distDir` from `NEXT_DIST_DIR` so Playwright
  gets its own dev lock (`.next-e2e`) and can run beside `npm run dev`.
- `backend/config/app.php`: timezone UTC, providers, locale.
- `backend/config/auth.php`: `web` guard with Sanctum guard driver.
- `backend/config/cors.php`: allowed origins from `APP_FRONTEND_URL`, methods GET/POST/PUT/PATCH/DELETE, credentials false.
- `backend/config/database.php`: pgsql connection, `DB_*` env binding.
- `backend/config/filesystems.php`: `games` disk using `s3` driver with R2 env vars; `local` fallback.
- `backend/config/sanctum.php`: token expiration (30 days), stateful domains limited to app host.
- `backend/config/logging.php`: single file locally, stderr in containers.
- `backend/config/game-settings.php`: allowlisted setting keys and validators.
- `config/game-package-policy.json`: shared archive limits/allowlists used by docs and tests.
- `config/game-settings.schema.json`: JSON schema for game-specific settings.
- `config/cors.json`: canonical origin list (documentation source for CORS config).

## Local port allocation

GamePortal deliberately avoids ports held by common local Caddy/PHP-FPM installs.

| Service | Local port | Notes |
|---------|-----------|-------|
| Next.js web | 4300 | `npm run dev` / `npm run start` pass `-p 4300` |
| Laravel API | 8400 | `php artisan serve --host=0.0.0.0 --port=8400` when accessed from a LAN device |
| Isolated game host | 8401 | separate Laravel process on a different hostname (e.g. `<ip>.nip.io`) |
| PostgreSQL | 5432 | Docker Compose host mapping |
| Playwright test web | 3100 | E2E only, overridden with `E2E_APP_PORT` |
| Playwright mock API | 8100 | E2E only, overridden with `E2E_API_PORT` |

Do not bind GamePortal to `:80`, `:3000`, `:8080`–`:8083` or `:9000`; those are used by
the local Caddy instance and its PHP-FPM upstream. See DR-014 in the decision log.

## Changing configuration

1. Add variable to both `.env.example` files if applicable.
2. Add row to this document.
3. Update relevant config file with `env()` and a safe default.
4. Add a test if the variable changes security behaviour.
5. Update deployment docs if production operator must set it.
