import { defineConfig, devices } from "@playwright/test";

// Dedicated ports keep e2e runs away from GamePortal (4300/8400/8401) and Caddy (80/3000/8080-8083).
const apiPort = Number(process.env.E2E_API_PORT ?? 8100);
const appPort = Number(process.env.E2E_APP_PORT ?? 3100);
const apiBase = `http://127.0.0.1:${apiPort}`;
const appBase = `http://127.0.0.1:${appPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: appBase,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node e2e/mock-api.mjs",
      url: `${apiBase}/api/health`,
      env: { MOCK_API_PORT: String(apiPort) },
      // Never silently reuse another service that happens to hold the port.
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${appPort}`,
      url: appBase,
      env: {
        API_URL: apiBase,
        NEXT_PUBLIC_API_URL: apiBase,
        NEXT_PUBLIC_APP_URL: appBase,
        NEXT_PUBLIC_SITE_NAME: "GamePortal",
        AUTH_COOKIE_NAME: "gp_admin_token",
        NEXT_DIST_DIR: ".next-e2e",
      },
      // Never silently reuse another service that happens to hold the port.
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
