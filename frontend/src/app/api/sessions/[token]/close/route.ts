import { NextResponse, type NextRequest } from "next/server";
import { ApiError, serverFetch } from "@/lib/api";

/** 64-char base64url opaque session token (docs/05 and docs/06). */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Beacon-friendly same-origin endpoint. Browsers can only POST a beacon, while the
 * Laravel contract uses PATCH to close a session, so this route performs the PATCH.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ message: "Invalid session token.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid session payload.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (
    !isRecord(payload) ||
    typeof payload.duration_seconds !== "number" ||
    payload.duration_seconds < 0 ||
    payload.duration_seconds > 86_400 ||
    typeof payload.ended_at !== "string"
  ) {
    return NextResponse.json({ message: "Invalid session payload.", code: "VALIDATION_ERROR" }, { status: 422 });
  }

  try {
    await serverFetch(`/api/sessions/${encodeURIComponent(token)}`, {
      method: "PATCH",
      body: { duration_seconds: payload.duration_seconds, ended_at: payload.ended_at },
      cache: "no-store",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502;
    const message = error instanceof ApiError ? error.message : "Unable to close the session.";
    return NextResponse.json({ message, code: error instanceof ApiError ? error.code : undefined }, { status });
  }
}
