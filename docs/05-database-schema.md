# 05 — Database Schema

PostgreSQL 15+. All tables use `bigint` primary keys, `timestamps` (`created_at`,
`updated_at`) unless noted, and soft deletes only where stated. Enums are stored as
`varchar` with application-level enum classes plus DB check constraints where useful, so
adding a state does not require a DB migration (documented decision DR-006).

## Entity relationship summary

```
users 1───* games (created_by/updated_by)
categories 1───* games
games *───* tags (game_tag)
games 1───* game_files
games 1───* game_uploads
games 1───* game_sessions
game_sessions 1───* game_events
users 1───* game_sessions (nullable)
users 1───* audit_logs (nullable)
```

## `users`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| name | varchar(120) | required |
| email | varchar(255) | unique, lowercase |
| password | varchar(255) | bcrypt via cast |
| role | varchar(20) | `admin` or `player`, default `player`, check constraint |
| email_verified_at | timestamp null | |
| remember_token | varchar(100) null | |
| created_at, updated_at | timestamp | |

## `personal_access_tokens`

Laravel Sanctum default schema (id, tokenable_type, tokenable_id, name, token unique,
abilities text, last_used_at, expires_at, timestamps). Indexed on `token`.

## `categories`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| name | varchar(120) | required |
| slug | varchar(140) | unique |
| description | text null | |
| icon | varchar(120) null | icon name/key, not raw HTML |
| is_active | boolean | default true |
| sort_order | integer | default 0 |
| timestamps | | |

## `tags`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| name | varchar(80) | unique |
| slug | varchar(100) | unique |
| timestamps | | |

## `games`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | uuid | unique, used in storage paths |
| title | varchar(180) | required |
| slug | varchar(200) | unique |
| description | text null | |
| instructions | text null | shown in player page |
| category_id | bigint FK null | `categories.id` null on delete |
| thumbnail_path | varchar(512) null | storage path, signed URL generated at read |
| status | varchar(20) | `draft`,`published`,`disabled`,`archived`; default `draft`; indexed |
| featured | boolean | default false |
| orientation | varchar(20) | `landscape`,`portrait`,`any`; default `any` |
| width | integer null | intrinsic game width |
| height | integer null | intrinsic game height |
| entry_file | varchar(512) null | relative path inside extracted files, e.g. `index.html` |
| version | varchar(40) | default `1.0.0` |
| developer | varchar(120) null | |
| release_year | smallint null | 1980.. current+1 |
| license_name | varchar(120) null | |
| license_url | varchar(512) null | validated http(s) |
| attribution | text null | |
| settings | jsonb | default `{}` — validated against `config/game-settings.schema.json` |
| published_at | timestamp null | |
| created_by, updated_by | bigint FK null | `users.id` null on delete |
| deleted_at | timestamp null | soft deletes |
| timestamps | | |

Indexes: `unique(slug)`, `unique(uuid)`, `(status, published_at desc)`,
`(category_id, status)`, `(featured, status)`, GIN on `settings`.

## `game_tag`

| Column | Type | Notes |
|--------|------|-------|
| game_id | bigint FK | cascade delete |
| tag_id | bigint FK | cascade delete |

Composite PK `(game_id, tag_id)`.

## `game_files`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| game_id | bigint FK | cascade delete |
| upload_id | bigint FK null | `game_uploads.id` set null on delete |
| path | varchar(512) | relative path, no leading slash |
| disk | varchar(40) | `games` (current storage disk name) |
| mime | varchar(120) | |
| size | bigint | bytes |
| sha256 | char(64) | integrity check |
| is_entry | boolean | default false |
| timestamps | | |

Unique `(game_id, path)`.

## `game_uploads`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| game_id | bigint FK | cascade delete |
| uploader_id | bigint FK null | users.id null on delete |
| original_filename | varchar(255) | |
| raw_path | varchar(512) | private object key |
| disk | varchar(40) | |
| status | varchar(20) | `pending`,`processing`,`published`,`failed` |
| error_message | text null | user-safe summary |
| file_count | integer | default 0 |
| total_size | bigint | default 0 |
| processed_at | timestamp null | |
| timestamps | | |

Index `(game_id, created_at desc)`.

## `game_sessions`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| game_id | bigint FK | cascade delete |
| user_id | bigint FK null | nullable (anonymous play) |
| session_token | varchar(64) | unique, opaque random (base64url, 48 bytes) |
| started_at | timestamp | |
| ended_at | timestamp null | |
| duration_seconds | integer | default 0 |
| referrer | varchar(512) null | sanitised host only |
| timestamps | | |

Indexes: `unique(session_token)`, `(game_id, started_at desc)`.

## `game_events`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| game_id | bigint FK | cascade delete |
| session_id | bigint FK null | `game_sessions.id` null on delete |
| type | varchar(40) | `start`,`end`,`score`,`level_complete`,`custom` |
| metadata | jsonb | default `{}`; max 8KB enforced in request validation |
| occurred_at | timestamp | client-provided within ±5 minutes of server time |
| created_at | timestamp | no updated_at (append-only) |

Indexes: `(game_id, occurred_at desc)`, `(session_id, occurred_at)`, `(type)`.

## `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| user_id | bigint FK null | null on delete |
| action | varchar(80) | e.g. `game.published`, `game.uploaded` |
| subject_type | varchar(120) | e.g. `App\Models\Game` |
| subject_id | bigint null | |
| metadata | jsonb | default `{}` (no secrets) |
| ip | varchar(45) null | |
| user_agent | varchar(512) null | |
| created_at | timestamp | append-only |

Index `(created_at desc)`, `(subject_type, subject_id)`.

## Queue/cache tables

Laravel defaults: `jobs` (queue workload), `failed_jobs`, `job_batches`, `cache`,
`cache_locks`, `sessions` (database driver if used). Managed by Laravel migrations; no custom
columns. The `jobs` table must use Laravel's `reserved_at` column; an early migration used
`reserve_time`, which broke the database queue. Migration `2026_11_25_000010_fix_queue_tables`
repairs existing databases and adds `failed_jobs`.

## Retention

- `game_events`: 12 months online, then archived/deleted by scheduled job (documented in
  ops runbook).
- `game_sessions`: 24 months.
- `audit_logs`: 24 months.
- Raw upload ZIPs: retained until a newer successful upload replaces them or admin deletes
  them; extracted files for disabled games are retained for fast re-publish.
