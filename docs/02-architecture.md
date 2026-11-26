# 02 — Architecture

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Portal web app | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 | Fast SSR/ISR discovery pages, typed UI, low CSS overhead; patched PostCSS dependency |
| API / admin backend | Laravel 12 (PHP 8.2+), PHPUnit 11 | Mature validation, auth, queues, storage abstraction; patched security advisories |
| Database | PostgreSQL 15+ | JSONB game settings, transactional integrity, indexing |
| Object storage | Cloudflare R2 via S3-compatible API (local disk in dev) | Cheap egress, no bandwidth fees, isolated game files |
| Auth | Laravel Sanctum (API tokens) | Simple token auth for admin dashboard |
| Runtime | Docker Compose for local; independent web/API/worker processes in production | tiers scale separately |

## Runtime topology

```
                Browser
                   |
        +----------+-----------+
        |                      |
  APP ORIGIN             GAME ORIGIN
  (Next.js :4300)        (games.example.com / :8401)
        |                      |
        | HTTPS                | sandbox headers, no cookies
        v                      v
  Laravel API (:8400)     GameHostController
  /api/*  (JSON)          /g/{slug}/{path}
        |                      |
        +----------+-----------+
                   |
          +--------+---------+
          |                  |
    PostgreSQL          Object storage (R2)
    metadata/analytics   raw ZIPs + extracted game files
          |
     Queue worker (upload processing)
```

### Trust zones

1. **App zone** (`NEXT_PUBLIC_APP_URL`): renders HTML, holds admin token in an
   `HttpOnly` cookie set by the frontend server route, never serves game files.
2. **API zone** (`API_URL`): owns business rules, auth, database and storage credentials.
   CORS allows only the app origin for direct browser calls; same-origin proxy routes are
   preferred where possible.
3. **Game zone** (`NEXT_PUBLIC_GAME_HOST` / `GAME_HOST_URL`): untrusted executable content.
   Separate origin, no shared cookies, strict CSP and `frame-ancestors`, served through
   Laravel only from published games.
4. **Storage zone**: private bucket; nothing is public. All bytes flow through the game
   host controller with explicit headers.

## Modularity rules

- Game behaviour is data: adding a game = new row + uploaded files, never a code change.
- Laravel modules are grouped by concern under `app/Http/Controllers/Api`, `app/Services`,
  `app/Jobs`, `app/Models`, with form requests and API resources at the boundaries.
- Frontend feature folders under `frontend/src/features/<feature>` contain components and
  hooks; shared UI lives in `frontend/src/components`.
- All API shapes are declared once in `docs/06-api-reference.md` and mirrored in
  `frontend/src/types/api.ts`.
- No direct database access from Next.js; all data goes through the API.

## Scalability choices

- Catalogue reads are paginated and optionally cached (Laravel cache, TTL 60s), with cache
  keys invalidated on game writes.
- Upload processing is a queue job so web workers are not blocked by ZIP extraction.
- Object storage paths are deterministic (`games/{uuid}/raw/...`, `games/{uuid}/files/...`),
  enabling CDN caching and cheap purges per game.
- Analytics writes are append-only and batched by the queue where volume warrants it; v1
  writes synchronously with short transactions to keep the dashboard simple.
- Next.js discovery pages use ISR (`revalidate = 60`); player page is dynamic because the
  session token is created client-side.

## Why not a monolith?

A single Laravel-blade app would be simpler but would couple portal rendering to admin
writes and make it harder to isolate game execution on its own origin. The split keeps the
game origin free of user accounts and cookies, which is the central security requirement.
See [decision log](16-decision-log.md) for trade-offs.
