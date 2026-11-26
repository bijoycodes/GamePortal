import { NextResponse, type NextRequest } from "next/server";
import { ApiError, serverFetch, type QueryParams } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

/** Same-origin proxy: the HttpOnly token is exchanged for a Bearer header here. */
const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const token = await getAdminToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthenticated.", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { path } = await context.params;
  if (path.length === 0 || path.some((segment) => !SAFE_SEGMENT.test(segment))) {
    return NextResponse.json({ message: "Invalid admin path.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const query: QueryParams = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  let body: unknown;
  if (request.method !== "GET" && request.method !== "DELETE") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      body = await request.formData();
    } else {
      const text = await request.text();
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        return NextResponse.json({ message: "Invalid JSON body.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
    }
  }

  try {
    const result = await serverFetch(`/api/admin/${path.join("/")}`, {
      method: request.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      body,
      query,
      token,
      cache: "no-store",
    });
    if (result === undefined) return new NextResponse(null, { status: 204 });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message, errors: error.errors, code: error.code },
        { status: error.status, headers: error.requestId ? { "X-Request-Id": error.requestId } : undefined },
      );
    }
    return NextResponse.json({ message: "The API is unavailable." }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
