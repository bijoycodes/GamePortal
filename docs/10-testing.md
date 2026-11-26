# 10 — Testing

## Test pyramid

| Level | Tool | Location | Covers |
|-------|------|----------|--------|
| Unit | PHPUnit 11 | `backend/tests/Unit` | Enums, services (pure logic), policy rules |
| Feature | PHPUnit 11 + RefreshDatabase | `backend/tests/Feature` | Routes, validation, auth, storage fake, queue fake |
| Component/unit | Vitest + Testing Library | `frontend/src/**/*.test.tsx` | Formatters, API client, GameCard, Player iframe attributes |
| Contract | Node script | `tests/contract/api-contract.test.mjs` | Docs and TS types stay in sync with route list |
| E2E | Playwright | `frontend/e2e` | Discovery, search, player launch, admin login/create/publish |

## Backend commands

```bash
cd backend
cp .env.example .env
php artisan key:generate
php artisan test                 # whole suite (uses phpunit.xml test DB)
php artisan test --filter=GameApiTest
php artisan test --coverage      # requires pcov/xdebug
```

Automated backend tests use in-memory SQLite (`DB_CONNECTION=sqlite`,
`DB_DATABASE=:memory:`) from `backend/phpunit.xml`, so a fresh checkout needs no database
server. Local runtime, staging and production use PostgreSQL; CI should run the suite against
PostgreSQL when available by overriding those two variables. Tests still use
`FILESYSTEM_DISK=local` with `Storage::fake('games')` in upload tests. Queue is faked with
`Queue::fake()`; the processing job is asserted rather than run for controller tests, and
tested directly in `ProcessGameUploadTest` with a generated ZIP fixture. `QueueSchemaTest` uses
the real database driver to prove jobs can be persisted after the queue-schema repair.

Key fixtures/factories: `GameFactory`, `CategoryFactory`, `TagFactory`, `UserFactory`,
`GameSessionFactory`. Seeders provide demo data for manual QA only; tests never rely on seeders.

## Frontend commands

```bash
cd frontend
npm ci
npm run typecheck       # tsc --noEmit
npm run lint            # zero-dependency source scanner (scripts/lint.mjs)
npm run test            # vitest run
npm run test:watch
npm run e2e             # playwright test (own servers on :3100/:8100 and distDir .next-e2e)
```

## Continuous integration

`.github/workflows/ci.yml` runs the backend job on PHP 8.3/8.4 (Composer audit, Pint,
PHPUnit on SQLite, PostgreSQL migration check), the frontend job on Node 20/22
(typecheck, lint, Vitest, production build, npm audit, Playwright), and a contract job
(markdown/router/type/env checks plus placeholder scan). All security audits must be clean;
known advisories require a decision-log entry and an upgrade, not a suppressed audit.

## Contract check

`node tests/contract/api-contract.test.mjs` parses `docs/06-api-reference.md` route table
and asserts every documented public/admin route exists in `backend/routes/api.php` and that
every TS type name in `frontend/src/types/api.ts` is referenced. This prevents doc drift.

## Required regression tests

- [x] unpublished game returns 404 from public API and game host
- [x] game host rejects `../` path and unknown file
- [x] non-admin receives 403 on admin routes
- [x] unsafe ZIP entry rejected, no files promoted
- [x] oversized event metadata rejected (422)
- [x] publish sets `published_at` and appears in discovery
- [x] disable removes game from discovery immediately
- [x] seeder installs a playable, indexed demo game and is idempotent
- [x] database queue schema accepts jobs (`reserved_at`, `failed_jobs`) and persists upload jobs
- [x] Star Catch upload completes on a real database queue and is served from the isolated host
- [x] full E2E create-and-publish flow (`frontend/e2e/admin-games.spec.ts`)

Checkboxes are updated as tests land; unchecked items are tracked work, not hidden placeholders.

## Definition of done for a feature

1. Test written before or with implementation.
2. `php artisan test` (affected suite) and `npm run typecheck && npm run test` pass.
3. Docs and status table updated.
