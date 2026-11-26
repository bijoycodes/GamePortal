# 15 — Analytics

## Data collected

| Event | Producer | Payload |
|-------|----------|---------|
| session start | portal on game launch | game_id, started_at, sanitised referrer host |
| `start` | game postMessage or portal | optional metadata |
| `score` | game postMessage | `{score: number}` (number validated) |
| `level_complete` | game postMessage | `{level: number}` |
| `custom` | game postMessage | arbitrary small object (allowlisted keys only by size rule) |
| session end | portal on unload/close | duration_seconds, ended_at |

No IP addresses, precise location, or personal identifiers are stored in analytics tables.
IP is stored only in `audit_logs` for admin actions.

## Session token flow

1. `POST /api/games/{slug}/sessions` returns opaque 64-char token.
2. Portal keeps token in component state (not persisted across sessions by default).
3. Events POST to `/api/sessions/{token}/events` with `occurred_at` within ±5 min of server time.
4. `PATCH /api/sessions/{token}` closes the session using `navigator.sendBeacon` on unload
   where supported, falling back to `fetch({keepalive:true})`.

## Metrics

| Metric | Definition |
|--------|------------|
| plays | count of `game_sessions` |
| unique_players | distinct `user_id` when authenticated; anonymous sessions counted as distinct tokens (directional) |
| avg_duration_seconds | average `duration_seconds` of ended sessions |
| top_games | games ordered by session count in window |
| timeseries | daily session counts for window |

## Dashboard

- `/admin/analytics` shows 7/30/90-day window selector, KPI cards, daily bar chart (pure CSS/SVG, no chart library), top games table.
- `/admin/analytics/{gameId}` shows the same for a single game.

## Privacy and retention

- Analytics are aggregate and anonymous for players; no account required to play.
- `docs/05-database-schema.md` defines retention; scheduled cleanup job documented in ops runbook.
- Admin UI never displays raw event metadata beyond a recent-events table (first 8KB, escaped).

## Accuracy notes

- Beacon may be dropped by browsers on hard close; treat duration as a lower bound.
- CDNs caching player pages do not affect session creation (client-side POST).
