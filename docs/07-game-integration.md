# 07 — Game Integration

## How games are added

1. Prepare a package that follows [08-upload-guidelines.md](08-game-upload-guidelines.md).
2. Admin creates a game record and assigns category/tags/licence.
3. Admin uploads the ZIP; the worker extracts and records files.
4. Admin sets `entry_file` (auto-detected as `index.html` at archive root, otherwise chosen
   from the file list) and publishes.
5. The portal reads `player_url` from the API and embeds it. No code changes.

## Player contract

The portal renders:

```tsx
<iframe
  src={game.player_url}
  title={`Play ${game.title}`}
  sandbox="allow-scripts allow-pointer-lock allow-fullscreen"
  allow="fullscreen; gamepad; autoplay"
  referrerPolicy="no-referrer"
/>
```

- `allow-same-origin` is deliberately omitted. A `null`-origin frame cannot read portal
  cookies, `localStorage`, or parent DOM even if the browser has a bug in sandboxing.
- Games that require persistent local state must use IndexedDB/storage allowed by the
  browser for opaque origins, or post messages to the portal (v1 does not proxy storage).
- Fullscreen is triggered by a portal button calling `requestFullscreen()` on the iframe
  wrapper; the sandbox token `allow-fullscreen` plus `allow="fullscreen"` is required.

## Required game-side behaviour

- Entry document must be `index.html` or an explicit file inside the package; all assets
  must be relative paths. No external script/CDN dependencies (they would break offline/CSP).
- The game should post lifecycle messages to the parent:

```js
parent.postMessage({ source: 'gameportal', event: 'ready' }, '*');
parent.postMessage({ source: 'gameportal', event: 'score', score: 1250 }, '*');
```

The portal validates `event.source === iframe.contentWindow`, checks
`data.source === 'gameportal'`, and forwards allowed events to
`POST /api/sessions/{token}/events` with the session token obtained at launch.
Games that do not post messages still produce session start/end analytics from the portal.

## Host headers

Every response from `/g/{slug}/{path}` includes:

```
Content-Security-Policy: default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors https://app.example.com
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: ALLOW-FROM is obsolete; frame-ancestors is authoritative
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
Cache-Control: public, max-age=3600, immutable  (file responses with hashed names)
Set-Cookie: never
```

`frame-ancestors` is built from `APP_FRONTEND_URL`; no wildcard. In local dev it is
`http://localhost:4300`.

## Path safety

- Requested path is normalised and matched against the `game_files.path` index for the
  published game; arbitrary storage keys cannot be requested.
- Paths containing `..`, null bytes, backslashes or absolute prefixes are rejected.
- `Content-Type` is taken from the stored MIME, never from user-supplied headers.
- HTML files are delivered with the CSP above; binary assets use `nosniff`.

## Player page states

| State | UI |
|-------|----|
| Loading | skeleton with game title |
| Ready | iframe + toolbar (fullscreen, how-to-play, report) |
| Error | message with retry; no blank iframe |
| Disabled/unpublished | 404-style "Game unavailable" page |

## Testing a game locally

```bash
# Place a test package in /tmp and upload as admin
curl -F 'package=@/tmp/my-game.zip' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  http://localhost:8400/api/admin/games/1/upload
# Poll until status=published, then open the player_url in the portal
```
