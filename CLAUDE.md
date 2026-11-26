# CLAUDE.md — GamePortal Agent Instructions

This file is the entry point for Claude (and any AI assistant) working in this repository.
It is intentionally short. The authoritative information lives in `docs/`.

## First read

1. `docs/00-index.md` — documentation map and current implementation status
2. `docs/02-architecture.md` — boundaries, tech stack, runtime topology
3. `docs/04-folder-structure.md` — where code belongs
4. `docs/05-database-schema.md` — data model
5. `docs/06-api-reference.md` — HTTP contract shared by frontend and backend
6. `docs/11-development-workflow.md` — commands and incremental workflow
7. `docs/16-decision-log.md` — why things are the way they are

## Non-negotiable rules

- **Docs first.** Every feature, dependency, environment variable, migration, endpoint,
  architectural decision and configuration change must be documented in `docs/`
  in the same change that introduces it.
- **No placeholders.** Do not leave `TODO`, `FIXME`, stub handlers, empty components,
  fake data in production code, or commented-out code. If something is intentionally
  deferred, record it in `docs/19-roadmap.md` with an owner and rationale.
- **Shared contract.** The frontend must not invent API shapes. Use `docs/06-api-reference.md`
  and the TypeScript types in `frontend/src/types/api.ts`. Backend changes to response
  shape require a docs update and a frontend type update in the same change.
- **Game isolation.** Game files are never bundled into the Next.js app. They are served
  from the separate `GAME_HOST` origin with sandbox headers. Never weaken
  `docs/09-security.md`.
- **Validation at boundaries.** Laravel FormRequests validate all writes; the frontend
  validates forms before submit and renders server errors.
- **Tests with features.** Add backend tests for endpoints/services and frontend tests for
  utilities/components. Run the relevant suite before declaring a step complete.
- **Avoid needless dependencies.** Prefer platform features (Laravel Storage, Next.js app
  router, native fetch) over new packages. Any new dependency needs a `docs/14-dependencies.md` entry.

## Common commands

```bash
# Backend (Laravel)
cd backend && composer install && cp .env.example .env && php artisan key:generate
cd backend && php artisan migrate --seed
cd backend && php artisan test
cd backend && php artisan serve --host=127.0.0.1 --port=8000

# Frontend (Next.js)
cd frontend && npm install && cp .env.example .env.local
cd frontend && npm run dev
cd frontend && npm run test
cd frontend && npm run typecheck

# Local infrastructure
docker compose up -d
```

See `docs/12-deployment.md` for production and `docs/11-development-workflow.md`
for the incremental build order.

## Reporting

When a task is finished, update `docs/00-index.md` status table and produce a short
implementation report: what changed, how to run it, how to test it, and any known limits
linked from the docs.
