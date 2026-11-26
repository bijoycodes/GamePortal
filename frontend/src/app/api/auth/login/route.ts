import { NextResponse, type NextRequest } from "next/server";
import { ApiError, parseErrorResponse, serverFetch } from "@/lib/api";
import { setAdminToken } from "@/lib/auth";
import type { AdminLoginRequest, AdminLoginResponse } from "@/types/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid login payload.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (
    !isRecord(body) ||
    typeof body.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
    typeof body.password !== "string" ||
    body.password.length === 0
  ) {
    return NextResponse.json(
      { message: "Enter a valid email address and password.", code: "VALIDATION_ERROR" },
      { status: 422 },
    );
  }

  const credentials: AdminLoginRequest = { email: body.email, password: body.password };

  try {
    const result = await serverFetch<AdminLoginResponse>("/api/admin/login", {
      method: "POST",
      body: credentials,
      cache: "no-store",
    });
    if (!result.token || result.user?.role !== "admin") {
      return NextResponse.json({ message: "This account is not an administrator.", code: "FORBIDDEN" }, { status: 403 });
    }
    await setAdminToken(result.token);
    return NextResponse.json({ user: result.user });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message, errors: error.errors, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json({ message: "The authentication service is unavailable." }, { status: 502 });
  }
}
