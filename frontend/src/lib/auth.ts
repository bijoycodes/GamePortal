import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminUser } from "@/types/api";
import { ApiError, serverFetch } from "./api";
import { getServerEnv, isSecureCookieApp } from "./env";

/** Sanctum tokens expire after 30 days (docs/13-configuration.md). */
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getAdminToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(getServerEnv().authCookieName)?.value ?? null;
}

export async function setAdminToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: getServerEnv().authCookieName,
    value: token,
    httpOnly: true,
    secure: isSecureCookieApp(),
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
}

export async function clearAdminToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: getServerEnv().authCookieName, path: "/" });
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const token = await getAdminToken();
  if (!token) return null;

  try {
    const user = await serverFetch<AdminUser>("/api/admin/me", {
      token,
      cache: "no-store",
    });
    return user.role === "admin" ? user : null;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");
  return user;
}
