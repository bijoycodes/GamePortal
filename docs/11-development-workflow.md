# 11 — Development Workflow

## Build order (incremental)

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| 0 | Docs + repo skeleton + env templates | Docs index complete, folders exist |
| 1 | Laravel base: config, migrations, models, seeders, auth | `php artisan migrate --seed` on clean DB, tests green |
| 2 | Public discovery API + category/tag endpoints | Feature tests for filters/pagination |
| 3 | Admin CRUD + auth + audit + publish lifecycle | Admin feature tests green |
| 4 | Upload pipeline + game host | ZIP processing test + sandbox headers test |
| 5 | Analytics ingestion + overview APIs | Session/event + aggregation tests |
| 6 | Next.js portal shell, discovery pages, player | typecheck + Vitest + Playwright smoke |
| 7 | Next.js admin dashboard | E2E login + create + publish |
| 8 | Docker, CI, deployment docs, final report | `docker compose up -d`, smoke script passes |

Do not start a phase until the previous exit criterion passes. Update
`docs/00-index.md` after each phase.

## Local setup

```bash
# 1. infrastructure
docker compose -f docker/docker-compose.yml up -d postgres

# 2. API
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8400
php artisan queue:work --tries=3        # second terminal

# 3. web
cd frontend
npm ci
cp .env.example .env.local
npm run dev                             # http://localhost:4300
```

Default seeded admin: `admin@gameportal.test` / `password` (development only; never seed
this in production — seeder checks `app()->environment()`). The same seeder also creates
three catalogue entries and writes a real, self-contained tap-to-score HTML5 game into the
`games` disk for each of them, so `Neon Runner` and `Tile puzzler` are immediately playable
locally. `Retro Invaders` is seeded as a draft; publish it after reviewing its files.

### Accessing the dev server from another device

Next 16 blocks dev assets from hostnames other than the one it was started with. For LAN
access from `10.10.10.246`, set `NEXT_ALLOWED_DEV_ORIGINS=10.10.10.246` in
`frontend/.env.local`, replace localhost with `10.10.10.246` in `NEXT_PUBLIC_API_URL`
and `NEXT_PUBLIC_APP_URL`, and restart `npm run dev`. Bind both Laravel servers with
`--host=0.0.0.0` and keep the game host on a separate hostname (for example
`10.10.10.246.nip.io`) so cookies are never shared with the app. Full details:
[13-configuration.md](13-configuration.md).

If PostgreSQL is not available locally, use the documented SQLite fallback
(`DB_CONNECTION=sqlite`, `DB_DATABASE=database/database.sqlite`, then
`php artisan migrate --seed --force`); staging/production remain on PostgreSQL.

## Conventions

- Branches: `feature/<short-name>`, `fix/<short-name>`, `docs/<topic>`.
- Commits: `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `refactor: ...`.
- Every PR must answer: what changed, why, how tested, which docs changed.
- API change → update docs/types/tests first, then code.
- No direct `DB::table()` writes in controllers; use services/repositories.
- No `any` in TypeScript except in test helpers with an explanatory comment.
- Formatting: Laravel Pint (`vendor/bin/pint`) for PHP; TypeScript follows the repository's
  two-space/double-quote style. `npm run lint` runs the zero-dependency scanner in
  `frontend/scripts/lint.mjs` (no ESLint dependency was added intentionally).

## Code review checklist

- [ ] No secrets or absolute local paths committed
- [ ] New env vars in `.env.example` + `docs/13-configuration.md`
- [ ] New dependency in `docs/14-dependencies.md`
- [ ] New endpoint in `docs/06-api-reference.md` + contract test
- [ ] Error paths return documented envelope and are logged
- [ ] Admin mutation audited
- [ ] Docs status table updated
