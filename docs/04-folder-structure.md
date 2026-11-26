# 04 — Folder Structure

```
gameplatform/
├── .github/workflows/ci.yml         # backend, frontend and contract checks
├── README.md                       # quick start, links to docs
├── CLAUDE.md                       # Claude-specific instructions
├── AGENTS.md                       # all-agent rules
├── docs/                           # authoritative documentation (numbered)
├── docker/
│   ├── docker-compose.yml          # postgres + api + web + worker for local dev
│   ├── Dockerfile.api              # PHP-FPM image
│   ├── Dockerfile.web              # Next.js standalone image
│   └── nginx/                      # reverse proxy/game-origin config templates
├── backend/
│   ├── app/
│   │   ├── Console/Commands/        # artisan helpers (e.g. reindex/purge cache)
│   │   ├── Enums/                   # GameStatus, EventType, UploadStatus
│   │   ├── Http/
│   │   │   ├── Controllers/Api/     # Public, Admin, GameHost, Analytics controllers
│   │   │   ├── Middleware/          # ForceJson, role guard, game-host headers
│   │   │   ├── Requests/            # FormRequests = validation boundary
│   │   │   └── Resources/           # JSON resource shapes (single source of API shape)
│   │   ├── Jobs/                    # ProcessGameUpload, AggregateDailyStats
│   │   ├── Models/                  # Eloquent models + scopes
│   │   ├── Policies/                # authorization
│   │   ├── Repositories/            # query encapsulation (discovery, analytics)
│   │   ├── Services/                # GameUploadService, GameFileService, AnalyticsService
│   │   └── Providers/               # AppServiceProvider, AuthServiceProvider
│   ├── bootstrap/app.php
│   ├── config/                      # app, auth, database, filesystems, cors, sanctum, logging
│   ├── database/
│   │   ├── factories/               # test factories
│   │   ├── migrations/
│   │   └── seeders/
│   ├── public/index.php             # front controller (also serves game-host route)
│   ├── routes/api.php               # /api/* + /g/* game host
│   ├── storage/app/                 # local dev object storage (gitignored)
│   ├── tests/Feature/               # endpoint tests
│   ├── tests/Unit/                  # services/enums
│   ├── phpunit.xml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                     # App Router pages + layouts
│   │   │   ├── admin/               # dashboard, games, categories, tags, analytics
│   │   │   ├── games/[slug]/        # game detail/player
│   │   │   ├── categories/[slug]/   # category browse
│   │   │   └── api/auth/            # server-side token cookie routes
│   │   ├── components/              # shared UI (Header, GameCard, Pagination, etc.)
│   │   ├── features/                # feature-scoped components/hooks
│   │   │   ├── catalog/
│   │   │   ├── player/
│   │   │   └── admin/
│   │   ├── lib/                     # api client, auth, formatters, env
│   │   ├── types/api.ts             # TS mirror of docs/06-api-reference.md
│   │   └── test/                    # test setup + fixtures
│   ├── public/                      # static images/icons only (never game files)
│   ├── e2e/                         # Playwright specs
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── vitest.config.mts             # ESM config for Vitest 5 / Vite 8
│   └── .env.example
├── config/
│   ├── game-package-policy.json     # shared allowlists/limits used by docs & tests
│   └── cors.json                    # canonical CORS allowlist (docs source)
├── scripts/
│   ├── check-docs.sh                # fails on TODO/placeholder markers in tracked code
│   ├── smoke.sh                     # health + public API smoke test
│   ├── make-sample-game.sh          # generates a valid ZIP for local upload testing
│   └── make-star-catch.sh           # packages the playable Star Catch demo for upload
├── assets/
│   ├── README.md                    # brand/documentation asset policy
│   └── games/star-catch/            # source for the playable Star Catch demo
├── tests/
│   └── contract/api-contract.test.mjs  # cross-stack contract assertions
└── logs/
    └── .gitkeep                     # runtime logs are gitignored (see .gitignore)
```

## Placement rules

- New endpoint → routes + FormRequest + Resource + Controller + Service (if business logic)
  + Feature test + `docs/06-api-reference.md` update.
- New table → migration + model + factory + seeder (if demo data) + `docs/05-database-schema.md`.
- New shared UI → `components/`; feature-specific UI → `features/<feature>/`.
- Game files → object storage only. `frontend/public` and `backend/public` never contain
  uploaded games.
- Temporary files → system temp dir via `sys_get_temp_dir()`, always cleaned in `finally`.
