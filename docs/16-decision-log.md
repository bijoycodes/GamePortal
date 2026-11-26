# 16 — Decision Log

Format: `DR-NNN — title — date — status`. Superseded decisions stay here with a pointer to the replacement.

### DR-001 — Split Next.js frontend and Laravel API — 2026-11-25 — accepted
Keeps rendering separate from admin writes and allows independent scaling. Cost: cross-origin
API configuration and CORS. Alternative (Laravel Blade monolith) rejected because game-origin
isolation and modern player UX are easier in Next.js.

### DR-002 — Cloudflare R2 via S3 driver — 2026-11-25 — accepted
Zero egress fees suit game file delivery. Using Flysystem S3 driver avoids custom SDK code.
Local disk is used in dev via the same disk abstraction.

### DR-003 — Separate game host origin — 2026-11-25 — accepted
Game files are untrusted executable content. A separate origin with no cookies and strict
CSP limits blast radius. Implemented as `/g/*` on a distinct hostname pointing at the API app
in dev, fronted by CDN in prod.

### DR-004 — Iframe sandbox without `allow-same-origin` — 2026-11-25 — accepted
`allow-scripts` + `allow-same-origin` would let a game remove its sandbox. Trade-off: opaque
origin limits persistent storage, documented in game integration guide.

### DR-005 — ZIP upload processed by queue job — 2026-11-25 — accepted
Extraction is CPU/I/O heavy and must not block web requests. Failed jobs are visible via
`game_uploads.status` and retryable.

### DR-006 — Status enums in application layer, not native PostgreSQL enums — 2026-11-25 — accepted
Adding a state is a code + docs change without a migration. Check constraints protect known
states. If enum evolution becomes frequent, revisit with an expand/contract migration.

### DR-007 — Sanctum bearer tokens for admin, HttpOnly cookie in browser — 2026-11-25 — accepted
API stays stateless for tooling; browser token is hidden from JS by a same-origin Next.js
route that injects the header server-side for admin pages. CORS credentials disabled.

### DR-008 — Append-only analytics with opaque session tokens — 2026-11-25 — accepted
No player accounts required; tokens limit casual spam. Metrics directional, not billing-grade.

### DR-009 — No image processing library — 2026-11-25 — accepted
Thumbnails are validated by MIME/size and rendered as images; dimensions are advisory metadata.
Adding intervention/gd processing would increase attack surface and deployment complexity.

### DR-010 — Shared markdown docs instead of a wiki — 2026-11-25 — accepted
Docs live with code, are reviewable in PRs, and are the single source for AI agents. Numbered
files avoid ambiguity; `docs/00-index.md` is the entry point.

### DR-011 — In-memory SQLite for the backend test suite — 2026-11-25 — accepted
`backend/phpunit.xml` forces `DB_CONNECTION=sqlite` and `DB_DATABASE=:memory:` so automated
tests run without a local database server. Migrations stay portable and PostgreSQL-only GIN
indexes are guarded; local runtime, staging and production remain on PostgreSQL, and CI should
run the suite against PostgreSQL when it is available.

### DR-016 — Repair the database queue schema — 2026-11-25 — accepted
Publishing Star Catch through the real admin upload pipeline exposed a latent bug: the initial
`jobs` migration used `reserve_time` instead of Laravel's required `reserved_at`, and there was
no `failed_jobs` table, so queued uploads stayed `pending` on a real database worker. Tests had
missed it because controller tests use `Queue::fake()` and PHPUnit runs `QUEUE_CONNECTION=sync`.
The base migration is corrected, a repair migration adds `failed_jobs` for existing databases,
and `QueueSchemaTest` asserts jobs can be persisted on the database driver. No schema change is
needed for PostgreSQL users who already had Laravel's default queue tables.

### DR-015 — LAN-friendly dev origins with isolated game hostname — 2026-11-25 — accepted
A LAN browser at `10.10.10.246` was blocked from Next 16 dev assets/HMR, and the API was
unreachable because it bound only `127.0.0.1`. `next.config.ts` now reads
`NEXT_ALLOWED_DEV_ORIGINS` (hostname only, dev-only), browser-facing env URLs use the dev
machine IP, and both Laravel servers bind `0.0.0.0`. The game host stays on a distinct
hostname (`10.10.10.246.nip.io`) rather than the app IP, preserving the cookie isolation
required by DR-003. With Docker unavailable, local runtime uses a SQLite fallback;
staging/production remain PostgreSQL.

### DR-014 — Dedicated local ports to avoid Caddy conflicts — 2026-11-25 — accepted
The developer's local Caddy instance owns `:80`, `:3000`, `:8080`–`:8083` and forwards PHP
to `127.0.0.1:9000`. GamePortal therefore binds web `:4300`, API `:8400` and the isolated
game host `:8401`; E2E stays on `:3100`/`:8100`. Docker Compose no longer maps `:8401` on
both the API and game containers (a pre-existing collision) — only the game host publishes
it. Env examples, Laravel/PHPUnit defaults, frontend defaults, nginx upstreams, smoke script,
tests and docs were updated together.

### DR-013 — Next.js 16 and Vitest 5 security upgrades — 2026-11-25 — accepted
`npm audit` reported a high advisory in Next 15's bundled PostCSS and critical/moderate
advisories in Vitest 3's worker/mocker dependencies. Upgraded to `next ^16.4.6` and
`vitest ^5.1.1`; renamed `vitest.config.ts` to `.mts` for native ESM and set
`tsconfig.json` `jsx: "react-jsx"` so Vite 8's Oxc transform compiles test TSX. Next 16
build, 27 Vitest tests and 10 Playwright tests pass; `npm audit` reports zero vulnerabilities.

### DR-012 — Laravel 12 instead of Laravel 11 — 2026-11-25 — accepted
The initial implementation used Laravel 11, but `composer audit` reported five advisories
(including CRLF injection and signed-URL path confusion) with no fix on the 11.x line.
Upgraded to `laravel/framework ^12.61` before release: all 72 backend tests and Pint pass and
`composer audit` is clean. Sanctum 4 and Collision 8 remain compatible. README and dependency
docs were updated in the same change.
