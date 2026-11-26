# 09 — Security

## Threat model

| Threat | Control |
|--------|---------|
| Malicious game reads portal cookies/localStorage | Separate game origin + iframe sandbox without `allow-same-origin` + no cookies on game host |
| Malicious game navigates top window | `frame-ancestors` CSP, sandbox without `allow-top-navigation` |
| Path traversal to arbitrary storage objects | Requested paths matched against indexed `game_files` only; normalization + reject `..`/null/backslash |
| Malicious ZIP (traversal, PHP, symlink, zip bomb) | Extension/path allowlist, size/count limits, no symlinks, worker isolation, failure cleanup |
| XSS via game metadata | React escapes values; no `dangerouslySetInnerHTML`; CSP on app; URLs validated http(s) |
| XSS via thumbnail | Images only, served with `Content-Disposition: inline` and correct MIME, no SVG |
| CSRF on admin API | Bearer token in `Authorization` header (not cookie) for API calls; admin UI stores token in HttpOnly cookie and reads it via a same-origin Next.js server route |
| Credential stuffing | Sanctum login throttled 5/min per IP+email; bcrypt hashes |
| Privilege escalation | `role=admin` middleware on every admin route + policy checks on game ownership-aware actions |
| Analytics spam | Opaque session token required, event size/type limits, rate limit 60/min/token |
| Data exfiltration via events | Metadata size limit, no arbitrary URLs stored, audit log redaction of secrets |
| SQL injection | Eloquent query builder/parameter binding only |
| Mass assignment | `$fillable` on models; FormRequests whitelist fields |

## Sandbox configuration

`iframe sandbox="allow-scripts allow-pointer-lock allow-fullscreen"`:

- `allow-scripts` is required for HTML5 games.
- `allow-same-origin` is intentionally absent; combined with `allow-scripts` it would allow
  a frame to remove its own sandbox.
- `allow-forms`, `allow-popups`, `allow-top-navigation` and `allow-modals` are absent.
- Game host CSP additionally restricts network origins and forbids plugins/base tag hijack.
- `EnsureGameHost` rejects any `/g/*` request whose `Host` header does not match `GAME_HOST_URL`
  with a plain-text 404; this check is bypassed only when `app()->environment('testing')`.

## Storage security

- R2 bucket is private. No public URLs; Laravel signs temporary URLs for thumbnails.
- API credentials are server-side only (`R2_*` env vars). Never exposed to Next.js or browser.
- Game host uses the same API credentials but only reads keys present in `game_files` for
  published games.
- Object keys include the game UUID, preventing collisions between tenants/games.

## Audit logging

Every admin mutation writes `audit_logs` with action, subject, actor, IP, user agent and
non-secret metadata. Implemented via `AuditService` called from controllers (explicit, not
model observers, to avoid logging unrelated reads).

## Error handling and logging

- Global exception handler converts validation errors to the documented envelope and logs
  unexpected exceptions with request id.
- Logs are structured JSON in production (`LOG_CHANNEL=stderr` in containers), with stack
  traces only in logs, never in responses.
- `X-Request-Id` header is echoed on all responses for support correlation.

## Security checks in CI

- `composer audit` and `npm audit --audit-level=high`.
- PHPUnit regression tests: unpublished game cannot be streamed, traversal path rejected,
  non-admin cannot CRUD, unsafe ZIP rejected, event metadata oversize rejected.
- Playwright check: iframe has expected `sandbox` attribute and game host sends CSP header.
- Manual checklist: `docs/18-operations-runbook.md` §6.

## Known limitations (v1)

- No antivirus scanning of packages; integration point is documented but out of scope.
- Opaque-origin frames may have limited localStorage support; games must not depend on it.
- Analytics events are unauthenticated by design; treat metrics as directional, not billing data.
