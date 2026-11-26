# 18 — Operations Runbook

## 1. Add a game (no deploy)

1. Log in at `/admin`, choose **Games → New**.
2. Fill metadata, upload thumbnail, save (draft).
3. Upload ZIP, poll until upload status is `published`.
4. Open preview from admin, verify iframe, then **Publish**.
5. Confirm game appears in `/games` and `GET /api/games/{slug}` returns 200.

## 2. Disable a game quickly

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.example.com/api/admin/games/123/disable
```

Discovery hides it immediately; game host returns 404 on next request. Audit log records
`game.disabled`.

## 3. Replace a game version

Upload a new ZIP to the same game; after success, bump `version`, verify in player, then keep
or delete the old upload. No CDN purge needed if file paths include the game UUID and new
filenames; if reusing filenames, purge prefix `games/{uuid}/` (see deployment §CDN).

## 4. Rollback a game

1. Disable the game.
2. In admin, select the previous successful upload in the game detail's upload history and
   choose **Make active** (restores `game_files` pointers to that upload).
3. Publish again. If the older upload was deleted, re-upload the package.

## 5. Rotate credentials

- Admin tokens: `DELETE FROM personal_access_tokens WHERE ...` or user logout-all in admin;
  tokens are bearer credentials and must be rotated if exposed.
- R2 keys: create new token, update env on API + worker, restart, revoke old token.
- Database password: update secret, restart services; no app code change.

## 6. Security checklist (monthly)

- [ ] `composer audit` and `npm audit --audit-level=high` clean
- [ ] Only `published` games served from game host (spot-check 3 slugs)
- [ ] Game host response has CSP + no `Set-Cookie`
- [ ] Player iframe sandbox attribute unchanged
- [ ] Admin users use strong passwords; unused tokens revoked
- [ ] Audit log reviewed for unexpected publishes/uploads
- [ ] Backups restored to a scratch DB within last 30 days

## 7. Retention jobs

Laravel scheduler runs daily at 02:00 UTC:
- `analytics:prune` deletes events older than 12 months, sessions older than 24 months.
- `audit:prune` deletes audit rows older than 24 months.
- `cache:prune-game-lists` flushes stale hashed list keys.

Verify with `php artisan schedule:list` and worker logs.

## 8. Incident: malicious game reported

1. Disable game (§2).
2. Purge CDN prefix for that game UUID.
3. Revoke any tokens created by the uploader account; review audit log.
4. Keep the raw ZIP for forensics (do not delete upload), then replace package after review.
5. Update `docs/09-security.md` if a new attack path was found, add regression test.
