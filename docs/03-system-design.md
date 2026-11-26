# 03 — System Design

## Request flows

### Discovery

1. Browser requests `/games?category=puzzle&q=match`.
2. Next.js server component calls `GET /api/games?...` with `Cache-Control` hints.
3. Laravel `GameController@index` validates query params, applies filters with scopes,
   returns paginated `GameResource` objects.
4. Next.js renders cards with `thumbnail_url` from the API host; thumbnails may be
   proxied through an image-optimised route but are never treated as trusted HTML.

### Game launch

1. Player opens `/games/{slug}`; Next.js fetches `GET /api/games/{slug}`.
2. Client creates a session via `POST /api/games/{slug}/sessions` and receives an opaque
   `session_token`.
3. Player renders `<iframe src="{GAME_HOST}/g/{slug}/{entry_file}" sandbox="allow-scripts
   allow-pointer-lock allow-fullscreen">`.
4. Game host verifies status is `published`, resolves the requested path against stored
   `game_files`, streams bytes with security headers.
5. Frontend posts lifecycle events to `/api/sessions/{token}/events`.

### Upload and publish

1. Admin creates a draft game (`POST /api/admin/games`) → gets `id`, `uuid`, `slug`.
2. Admin uploads ZIP (`POST /api/admin/games/{id}/upload`, `multipart/form-data`).
3. Laravel validates size/MIME, stores raw file to `games/{uuid}/raw/{filename}.zip`,
   creates `game_uploads(status=pending)`, dispatches `ProcessGameUpload`.
4. Worker extracts into a temp directory, validates every entry (no absolute paths,
   no `..`, allowlisted extensions, max file count/size), writes files to
   `games/{uuid}/files/...`, records `game_files`, sets `upload.status=published`.
5. Admin reviews metadata, then `POST /api/admin/games/{id}/publish`. The game appears in
   discovery and becomes playable. Failure sets `status=failed` with `error_message` and is
   visible in the dashboard; no partial files are promoted.

## Data ownership

- PostgreSQL: metadata, users, tokens, sessions/events, audit log, queue jobs/cache.
- Object storage: raw ZIPs and extracted files only. Never store secrets or user data there.
- Next.js: no database, no direct storage credentials.

## Caching and invalidation

| Cache | Key | TTL | Invalidated by |
|-------|-----|-----|----------------|
| Laravel game list | `games:list:{hashed-query}` | 60s | Game/category/tag writes via `Cache::forget` + tag flush |
| Next.js ISR | route-level `revalidate = 60` | 60s | Redeploy or manual revalidation hook (documented in ops runbook) |
| Browser API responses | `public, max-age=30` on read-only GETs | 30s | Not applied to admin/auth routes |

## Consistency and failure handling

- Publish/unpublish are single DB transactions; the public status flag is the source of truth.
- Game host checks status on every request, so disabling takes effect immediately even if
  caches or CDN hold old HTML.
- Upload processing is idempotent: re-running a failed job clears extracted files for that
  upload before writing again.
- Event ingestion is best-effort for analytics; failures are logged and never block gameplay.

## Scaling path

1. Add API replicas behind a load balancer; sessions/tokens live in PostgreSQL/Sanctum.
2. Scale queue workers separately for upload bursts.
3. Point `GAME_HOST_URL` at a CDN fronting the game-host origin with cache for immutable
   file paths; keep `Cache-Control: no-store` on the directory/entry response if dynamic
   headers are needed.
4. Partition `game_events` by month when volume exceeds the single-table threshold; the
   repository-query layer isolates this change (see `app/Repositories`).
