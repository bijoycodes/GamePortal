# 01 — Requirements and Scope

## Product goal

A browser-based gaming portal where players discover and play HTML5 games instantly,
and administrators add, update, categorize, publish, disable and manage games **without
changing application code**.

## Personas

| Persona | Needs |
|---------|-------|
| Player | Browse/search/filter games, see thumbnails and metadata, launch a game, resume later |
| Editor/Admin | Upload a game package, edit metadata, assign categories/tags, publish or disable, view basic analytics |
| Developer/Operator | Deploy independently scalable API and web tiers, rotate credentials, audit changes, extend safely |

## Functional requirements

### FR-1 Game catalogue (data-driven)
- Central record per game: title, slug, description, instructions, category, tags,
  thumbnail, developer, licence, attribution, release year, orientation, dimensions,
  version, settings JSON, status and timestamps.
- Categories and tags are managed through the admin API, not hardcoded.
- Game-specific settings (e.g. `requireFullscreen`, `backgroundColor`, `publisherId`,
  `customCss`) are stored as validated JSON on the game record.

### FR-2 Publishing lifecycle
- States: `draft` → `published` → `disabled` → `archived`.
- Only `published` games appear in public discovery and are playable.
- Disabling a game keeps its data and analytics but immediately removes it from the portal.

### FR-3 Discovery
- Paginated listing with full-text-ish search over title/description/developer,
  category filter, tag filter, sorting (`popular`, `newest`, `title`).
- Category listing and tag listing endpoints.
- Game detail endpoint with metadata and safe player URL.

### FR-4 Player
- Responsive layout, iframe player, fullscreen action, loading/error states.
- Iframe is sandboxed and hosted on a separate origin from the portal.

### FR-5 Uploads and file isolation
- Admin uploads a ZIP containing a self-contained HTML5 game.
- Files are stored on an object-storage disk (Cloudflare R2 via S3-compatible API in
  production; local disk in development).
- Raw package and extracted files are tracked in `game_uploads` / `game_files`.
- Extraction rejects path traversal, disallowed extensions and oversized packages.
- Uploaded games are never served from the application origin.

### FR-6 Admin dashboard
- Token-based login (Sanctum), role check, game/category/tag management screens.
- Publish/disable controls, upload progress/status, basic analytics, audit trail.

### FR-7 Analytics
- Record session start/end and lightweight custom events (e.g. `score`, `level_complete`).
- Aggregate views: plays, unique players, sessions, average duration, top games.

### FR-8 Quality
- Validation, consistent error envelopes, structured logs, automated tests, docs kept in sync.

## Non-functional requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | API p95 < 200 ms for catalogue reads with 10k games; pagination capped at 50 |
| NFR-2 | Web tier and API tier deploy independently; static assets on CDN |
| NFR-3 | Adding a game requires zero code changes and zero redeploys |
| NFR-4 | Game origin cannot read portal cookies, localStorage or DOM |
| NFR-5 | All write endpoints authenticated/authorized and audited |
| NFR-6 | 99.9% availability target for discovery; game availability depends on object storage |
| NFR-7 | PHP 8.2+, Node 20+, PostgreSQL 15+ |

## Non-goals (v1)

- Multi-tenancy / white-label portals
- Payments, user profiles with avatars, social features
- In-game leaderboards beyond raw event capture
- Editor for game source code (upload ZIP only)
- Automatic virus scanning (integration point documented, not implemented)

Explicit non-goals are not placeholders; they are out-of-scope decisions recorded in
[decision log](16-decision-log.md).
