# 14 — Dependencies

Every dependency must justify its existence. Removing an unused dependency is preferred to adding another.

## Backend (Composer)

| Package | Version | Why | Alternatives rejected |
|---------|---------|-----|-----------------------|
| `laravel/framework` | ^12.61 | Application framework: routing, Eloquent, validation, queues, storage; minimum patched line for 2026 advisories | Symfony standalone would require rebuilding auth/storage; Laravel 11 is unpatched |
| `laravel/sanctum` | ^4.0 | API token auth for admin dashboard | Passport is heavier than needed |
| `league/flysystem-aws-s3-v3` | ^3.0 | S3-compatible driver for Cloudflare R2 | Custom SDK wrapper adds maintenance |
| `laravel/tinker` | ^2.9 | REPL for operations/debugging | dev-only |
| `phpunit/phpunit` | ^11.0 | Backend tests | native assertions insufficient |
| `fakerphp/faker` | ^1.23 | Realistic fixtures for tests/seeders | hand-written fixtures less varied |
| `mockery/mockery` | ^1.6 | Mocking in unit tests | PHPUnit mocks limited |
| `nunomaduro/collision` | ^8.0 | Readable CLI test output | dev-only |

No PDF, image-processing, or HTML-sanitizer package: thumbnails are validated by MIME/size
only and rendered as images, so no sanitization library is needed.

## Frontend (npm)

| Package | Version | Why |
|---------|---------|-----|
| `next` | ^16.4.6 | App Router, SSR/ISR, server routes for auth cookie; patched PostCSS |
| `react`, `react-dom` | ^19.0 | UI runtime required by Next.js |
| `tailwindcss`, `@tailwindcss/postcss` | ^4.0 | Utility CSS with minimal config |
| `typescript`, `@types/node`, `@types/react`, `@types/react-dom` | ^5 / latest | Type safety |
| `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` | ^5.1.1 / latest | Component and utility tests; patched worker/mocker advisories |
| `@playwright/test` | ^1.50 | E2E smoke of discovery/player/admin; test servers on :3100/:8100, separate from manual dev :4300/:8400/:8401 |

`npm run lint` uses `frontend/scripts/lint.mjs`, a zero-dependency scanner for unsafe
patterns and accidental debug statements. ESLint was deliberately omitted from v1; see
the dependency rationale above.

Not added intentionally: Redux/Zustand (server state via fetch + React enough), Axios
(native fetch), form libraries (controlled forms + server errors), icon packs (inline SVG only).

## System requirements

- PHP 8.2+ with `pdo_pgsql`, `zip`, `mbstring`, `openssl`, `intl`.
- Composer 2.x.
- Node.js 20+ and npm 10+.
- PostgreSQL 15+.
- Docker 24+ / Compose v2 for local infra.

## Upgrade policy

- Minor/patch updates: monthly, run full test suite and `composer audit`/`npm audit`.
- Major updates: planned phase, documented in `docs/19-roadmap.md` and decision log.
- Security advisories: patch immediately, record in decision log with CVE reference.
