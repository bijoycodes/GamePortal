/** Environment access is centralised so values are read at call time (test-friendly). */

export interface ServerEnv {
  apiUrl: string;
  appUrl: string;
  authCookieName: string;
}

export interface PublicEnv {
  apiUrl: string;
  appUrl: string;
  gameHost: string | null;
  siteName: string;
}

const DEFAULT_API_URL = "http://localhost:8400";
const DEFAULT_APP_URL = "http://localhost:4300";
const DEFAULT_COOKIE_NAME = "gp_admin_token";
const DEFAULT_SITE_NAME = "GamePortal";

function trimOr(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function getServerEnv(): ServerEnv {
  return {
    apiUrl: trimOr(process.env.API_URL, DEFAULT_API_URL).replace(/\/+$/, ""),
    appUrl: trimOr(process.env.NEXT_PUBLIC_APP_URL, DEFAULT_APP_URL).replace(/\/+$/, ""),
    authCookieName: trimOr(process.env.AUTH_COOKIE_NAME, DEFAULT_COOKIE_NAME),
  };
}

export function getPublicEnv(): PublicEnv {
  return {
    apiUrl: trimOr(process.env.NEXT_PUBLIC_API_URL, DEFAULT_API_URL).replace(/\/+$/, ""),
    appUrl: trimOr(process.env.NEXT_PUBLIC_APP_URL, DEFAULT_APP_URL).replace(/\/+$/, ""),
    gameHost: process.env.NEXT_PUBLIC_GAME_HOST?.trim() || null,
    siteName: trimOr(process.env.NEXT_PUBLIC_SITE_NAME, DEFAULT_SITE_NAME),
  };
}

export function isSecureCookieApp(): boolean {
  return getServerEnv().appUrl.startsWith("https://");
}
