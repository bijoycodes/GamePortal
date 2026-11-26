# 08 — Game Upload Guidelines

## Package format

- ZIP archive, deflate or stored, max **50 MB** compressed and **150 MB** uncompressed.
- Max **500** files; max single file **25 MB**.
- Root must contain an HTML entry file (`index.html` preferred) or a clear single HTML file.
- All paths inside the archive must be relative, use `/` separators, and stay inside the
  root. Absolute paths, `..`, and Windows drive letters are rejected.
- Allowed extensions: `.html`, `.htm`, `.css`, `.js`, `.mjs`, `.json`, `.svg`, `.png`,
  `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.mp3`, `.ogg`, `.wav`, `.m4a`, `.mp4`,
  `.webm`, `.woff`, `.woff2`, `.ttf`, `.txt`.
- Rejected extensions (even inside ZIP): `.php`, `.phtml`, `.exe`, `.sh`, `.bat`, `.py`,
  `.jar`, `.zip`, `.html` with inline `<script src="http...">` is allowed only if CSP is
  respected — external origins are blocked by the game-host CSP, so bundle everything.
- No symlinks, no device files, no encrypted archives.
- Game code must not attempt network calls to third parties; CSP `connect-src 'self'`.

## Validation pipeline

1. HTTP layer: authenticated admin, MIME `application/zip`/`application/x-zip-compressed`,
   extension `.zip`, size <= 50 MB, timeout 60s.
2. `GameUploadService`: store raw bytes to private disk key
   `games/{uuid}/raw/{uploadId}-{sanitized-name}.zip`; create `game_uploads(pending)`.
3. `ProcessGameUpload` job: open ZIP with `ZipArchive`, iterate entries, validate path and
   extension, enforce totals, detect duplicate/case-colliding names, compute SHA-256 per
   file.
4. Write validated entries to `games/{uuid}/files/{relative-path}`; insert `game_files`.
5. Detect entry file: `index.html` at root, else the only root HTML file, else fail with a
   clear error.
6. On success: upload status `published`, set `games.entry_file`; on failure: delete any
   partial extracted prefix, set `status=failed` and `error_message`.

## Thumbnail guidelines

- Admin uploads a separate image: JPEG/PNG/WebP, <= 2 MB, minimum 480x270, 16:9 recommended.
- Stored at `games/{uuid}/thumbnails/{filename}`; URL is signed for private buckets.
- Never accept SVG thumbnails (script risk).

## Versioning and replacement

- Each upload creates a new `game_uploads` row; previous uploads remain until deleted.
- The `game_files` records point at the latest successful upload for the game.
- Increasing `games.version` is an admin action, not automatic; include the version in the
  package filename for clarity (e.g. `neon-runner-v1.2.0.zip`).
- Rollback = re-publish an older upload (ops runbook §4). v1 keeps files from all successful
  uploads, so rollback is a DB pointer change, not a new upload.

## Metadata checklist before publish

- [ ] Title and slug are unique and readable
- [ ] Category and at least one tag assigned
- [ ] Thumbnail uploaded
- [ ] Licence name/URL/attribution filled if required by the asset licence
- [ ] Instructions written for players
- [ ] Orientation and dimensions set (used for responsive aspect ratio)
- [ ] `settings` validated (see `config/game-settings.schema.json`)
- [ ] Game tested in the sandboxed iframe, not only by opening the HTML directly

## Error messages shown to admins

| Failure | Message |
|---------|---------|
| Too large | "Package exceeds the 50 MB upload limit." |
| Bad path | "Archive contains an unsafe path: {name}." |
| Bad extension | "Archive contains a disallowed file type: {extension}." |
| No entry | "No index.html or single root HTML entry file was found." |
| Corrupt ZIP | "The archive could not be opened." |

Internal exception details are logged, never returned verbatim.

## Generating a valid test package

```bash
bash scripts/make-sample-game.sh /tmp/gameportal-sample-game.zip
curl -F 'package=@/tmp/gameportal-sample-game.zip' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  http://localhost:8400/api/admin/games/1/upload
# Poll GET /api/admin/games/1 until latest_upload.status=published
```

The generated game posts `ready` and `score` messages using the protocol in
[07-game-integration.md](07-game-integration.md), so it exercises analytics as well as hosting.

A second, more substantial demo is available:
`bash scripts/make-star-catch.sh /tmp/star-catch.zip`, packaged from
`assets/games/star-catch/index.html`. It is a 30-second canvas game (catch 20 falling stars
with mouse, touch or arrow keys) that posts `ready`, `start`, `score` and `end` messages.
It is the game currently published locally as `/games/star-catch`.

`php artisan migrate --seed` installs the same tap-to-score game directly into the local
`games` disk with indexed `game_files` rows, so the seeded games are playable without an
admin upload. This seeded path is for local/development/testing environments only.
