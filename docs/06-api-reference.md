# 06 — API Reference

Base URL: `API_URL` (production: `https://api.example.com`). All responses are JSON.
Timestamps are ISO-8601 UTC (`2026-01-15T10:30:00.000000Z`).

## Conventions

### Success envelopes

- Single resource: the resource object at the root.
- Collection: Laravel paginator shape:

```json
{
  "data": [/* resources */],
  "links": {"first": "...", "last": "...", "prev": null, "next": "..."},
  "meta": {"current_page": 1, "from": 1, "last_page": 3, "per_page": 12, "total": 30}
}
```

- Action response: `{"message": "...", "data": {...}}` where useful.

### Error envelope

```json
{
  "message": "The given data was invalid.",
  "errors": {"title": ["The title field is required."]},
  "code": "VALIDATION_ERROR"
}
```

Status codes: `200`, `201` created, `204` no content, `400` bad request,
`401` unauthenticated, `403` forbidden, `404` not found, `409` conflict,
`413` payload too large, `422` validation, `429` rate limited, `500` server error.
All unexpected errors are logged with a correlation id returned as `X-Request-Id`.

### Auth

Admin endpoints require `Authorization: Bearer <sanctum_token>` and the `admin` role.
Public endpoints are unauthenticated. Analytics event endpoints use an opaque
`session_token` instead of a user token.

---

## Public endpoints

### `GET /api/health`

Returns `{"status":"ok","version":"1.0.0"}`. Used by smoke checks.

### `GET /api/games`

Query parameters:

| Param | Type | Rules |
|-------|------|-------|
| `q` | string | max 120, searched over title, description, developer |
| `category` | string | category slug |
| `tag` | string | tag slug |
| `sort` | enum | `popular`, `newest`, `title` (default `popular`) |
| `per_page` | int | 1..50 (default 12) |
| `page` | int | >=1 |

Response: paginated **GameResource** (see shape below). Only `status=published` games.

### `GET /api/games/{slug}`

Returns **GameResource** for a published game, otherwise 404. Includes `player_url`
computed from `GAME_HOST_URL`.

### `GET /api/categories`

Returns paginated categories (`id`, `name`, `slug`, `description`, `icon`, `game_count`),
only `is_active=true`, sorted by `sort_order` then `name`.

### `GET /api/categories/{slug}`

Returns a single active category with `game_count`.

### `GET /api/tags`

Returns paginated tags (`id`, `name`, `slug`, `game_count`).

### `POST /api/games/{slug}/sessions`

Creates an anonymous play session. Body optional: `{"referrer":"https://example.com"}`
(host is sanitised). Response `201`:

```json
{"id": 12, "session_token": "<64-char opaque token>", "started_at": "..."}
```

### `PATCH /api/sessions/{session_token}`

Body: `{"duration_seconds": 120, "ended_at": "..."}`. Response: session summary.
`duration_seconds` 0..86400; `ended_at` within ±5 minutes of server time.

### `POST /api/sessions/{session_token}/events`

Body:

```json
{
  "type": "score",
  "metadata": {"score": 1250},
  "occurred_at": "2026-01-15T10:31:00.000Z"
}
```

Allowed `type`: `start`, `end`, `score`, `level_complete`, `custom`.
`metadata` is an object, serialised JSON <= 8192 bytes, no nested arrays deeper than 3.
Response `201`: `{"id": 99, "type": "score", "occurred_at": "..."}`.

---

## Admin endpoints (auth + admin role)

### Auth

`POST /api/admin/login` — body `{"email","password"}`; response
`{"token":"...","user":{"id","name","email","role"}}`. Rate limited 5/min.
`POST /api/admin/logout` — revokes current token; `204`.
`GET /api/admin/me` — current admin user.

### Games

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/games` | List all statuses; filters `status`, `q`, `category`, `per_page`, `page` |
| POST | `/api/admin/games` | Create draft (see payload) |
| GET | `/api/admin/games/{id}` | Full admin game (includes uploads, files, entry_file) |
| PUT/PATCH | `/api/admin/games/{id}` | Update metadata (partial allowed) |
| DELETE | `/api/admin/games/{id}` | Soft delete; disabled immediately |
| POST | `/api/admin/games/{id}/publish` | Set status `published`, set `published_at` |
| POST | `/api/admin/games/{id}/disable` | Set status `disabled` |
| POST | `/api/admin/games/{id}/archive` | Set status `archived` |
| POST | `/api/admin/games/{id}/upload` | `multipart/form-data` ZIP upload |
| GET | `/api/admin/games/{id}/uploads` | Upload history for a game |
| DELETE | `/api/admin/uploads/{uploadId}` | Delete an upload and its files |

**Create/update payload** (fields optional on update):

```json
{
  "title": "Neon Runner",
  "slug": "neon-runner",
  "description": "A fast endless runner.",
  "instructions": "Arrow keys to move.",
  "category_id": 2,
  "tag_ids": [1, 3],
  "orientation": "landscape",
  "width": 1280,
  "height": 720,
  "version": "1.0.0",
  "developer": "Studio Example",
  "release_year": 2025,
  "license_name": "MIT",
  "license_url": "https://opensource.org/license/mit",
  "attribution": "Art by ...",
  "featured": false,
  "settings": {"requireFullscreen": false, "backgroundColor": "#0f172a"},
  "thumbnail": "<file: image/jpeg|png|webp, max 2MB>"
}
```

Validation highlights: `title` 1..180; `slug` lowercase kebab `^[a-z0-9]+(?:-[a-z0-9]+)*$`;
`width`/`height` 1..8192; `release_year` 1980..2027; `license_url` http(s);
`settings` object with allowlisted keys from `config/game-settings.schema.json`.
Slug collision → `409` with `errors.slug`.

**Upload response** `202`:

```json
{
  "message": "Upload queued for processing.",
  "data": {"id": 7, "game_id": 3, "status": "pending", "original_filename": "game.zip"}
}
```

Poll `GET /api/admin/games/{id}` for `latest_upload.status` /
`game.entry_file`.

### Categories and tags

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/categories` | All categories including inactive |
| POST | `/api/admin/categories` | `{name, slug?, description?, icon?, is_active?, sort_order?}` |
| PUT/PATCH | `/api/admin/categories/{id}` | Update |
| DELETE | `/api/admin/categories/{id}` | Delete if no games; otherwise `409` |
| GET | `/api/admin/tags` | All tags |
| POST | `/api/admin/tags` | `{name, slug?}` |
| PUT/PATCH | `/api/admin/tags/{id}` | Update |
| DELETE | `/api/admin/tags/{id}` | Detach from games then delete |

### Analytics and audit

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/analytics/overview?days=30` | `{plays, unique_players, sessions, avg_duration_seconds, timeseries:[{date, plays}], top_games:[{id,title,plays}]}` |
| GET | `/api/admin/analytics/games/{id}?days=30` | Per-game metrics + daily series |
| GET | `/api/admin/audit-logs?per_page=25&page=1` | Paginated audit records |

### Game host (separate origin, not `/api`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/g/{slug}` | Redirect (302) to `/g/{slug}/{entry_file}` |
| GET | `/g/{slug}/{path}` | Stream a stored file with sandbox security headers |

Only published games are served. Unknown path or game → `404` plain text. Here documents
the browser-facing contract only; production deployments should front this route with a CDN
on its own hostname. See [07-game-integration.md](07-game-integration.md).

## Resource shapes

### GameResource

```json
{
  "id": 3,
  "uuid": "9f1c...",
  "title": "Neon Runner",
  "slug": "neon-runner",
  "description": "...",
  "instructions": "...",
  "category": {"id": 2, "name": "Action", "slug": "action"},
  "tags": [{"id": 1, "name": "arcade", "slug": "arcade"}],
  "thumbnail_url": "https://api.example.com/storage/games/.../thumb.jpg",
  "status": "published",
  "featured": true,
  "orientation": "landscape",
  "width": 1280,
  "height": 720,
  "version": "1.0.0",
  "developer": "Studio Example",
  "release_year": 2025,
  "license": {"name": "MIT", "url": "...", "attribution": "..."},
  "settings": {"requireFullscreen": false},
  "player_url": "https://games.example.com/g/neon-runner/index.html",
  "published_at": "...",
  "created_at": "...",
  "updated_at": "..."
}
```

Admin variant adds `entry_file`, `deleted_at`, `uploads` (array), `files` (array of
`{id,path,mime,size,is_entry}`), `created_by`, `updated_by`.
