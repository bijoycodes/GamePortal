# GamePortal frontend

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 portal and admin UI.

The authoritative contract is in [`../docs/`](../docs/00-index.md): API shapes
(`06-api-reference.md`), player sandbox rules (`07-game-integration.md`), security
controls (`09-security.md`) and configuration (`13-configuration.md`).

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:4300
npm run typecheck
npm run lint
npm run test           # Vitest unit/component tests (no backend needed)
npm run e2e            # Playwright; starts the in-repo mock API + Next dev server
npm run build
```

On a fresh machine, install the browser once with `npx playwright install chromium`.

The Laravel API must be running for manual development. `npm run e2e` starts a
test-only mock API so no backend is required. It uses dedicated ports 3100 (app)
and 8100 (mock API); override them with `E2E_APP_PORT` and `E2E_API_PORT`. E2E also uses
`.next-e2e` as its build directory so it can run while `npm run dev` is active. See
`playwright.config.ts` and `e2e/mock-api.mjs`.

For access from another device, set `NEXT_ALLOWED_DEV_ORIGINS` to that device's
hostname/IP (no scheme or port) and use the dev machine IP in the `NEXT_PUBLIC_*`
URLs. Next 16 otherwise blocks cross-origin HMR/font requests. See
[`../docs/13-configuration.md`](../docs/13-configuration.md).
