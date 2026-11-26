import { NextResponse } from "next/server";
import { getAdminToken, clearAdminToken } from "@/lib/auth";
import { serverFetch } from "@/lib/api";

export async function POST() {
  const token = await getAdminToken();
  if (token) {
    try {
      await serverFetch("/api/admin/logout", { method: "POST", token, cache: "no-store" });
    } catch {
      // Revocation failures must not prevent clearing the local session.
    }
  }
  await clearAdminToken();
  return new NextResponse(null, { status: 204 });
}
