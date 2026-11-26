import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, browserFetch, buildQuery, getErrorMessage, parseErrorResponse, serverFetch } from "./api";

function fakeResponse(status: number, body?: unknown, headers: Record<string, string> = {}): Response {
  const normalised: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) normalised[name.toLowerCase()] = value;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => normalised[name.toLowerCase()] ?? null,
    },
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildQuery", () => {
  it("skips empty values and encodes parameters", () => {
    expect(buildQuery({ q: "a b", category: "action", page: undefined, per_page: 12, tag: "" })).toBe(
      "?q=a+b&category=action&per_page=12",
    );
    expect(buildQuery()).toBe("");
  });
});

describe("parseErrorResponse", () => {
  it("parses the documented error envelope", async () => {
    const error = await parseErrorResponse(
      fakeResponse(
        422,
        { message: "The given data was invalid.", errors: { title: ["The title field is required."] }, code: "VALIDATION_ERROR" },
        { "X-Request-Id": "req-123" },
      ),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.message).toBe("The given data was invalid.");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.fieldError("title")).toBe("The title field is required.");
    expect(error.requestId).toBe("req-123");
  });

  it("falls back for non-JSON and unknown errors", async () => {
    const response = {
      ok: false,
      status: 500,
      headers: { get: () => null },
      text: async () => "<html>broken</html>",
    } as unknown as Response;
    const error = await parseErrorResponse(response);
    expect(error.message).toBe("The server could not complete the request.");
    expect(error.errors).toEqual({});
  });
});

describe("serverFetch", () => {
  it("injects the admin Bearer token and uses ISR for GET", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await serverFetch("/api/admin/games", { token: "secret-token" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { next?: { revalidate?: number } }];
    expect(url).toBe("http://localhost:8400/api/admin/games");
    expect(init.headers).toMatchObject({ Authorization: "Bearer secret-token" });
    expect(init.next).toEqual({ revalidate: 60 });
  });

  it("throws ApiError for a failed response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(404, { message: "Not found." })));
    await expect(serverFetch("/api/games/missing")).rejects.toMatchObject({ status: 404, message: "Not found." });
  });
});

describe("browserFetch", () => {
  it("calls the public API directly and same-origin proxy routes for admin", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await browserFetch("/api/games");
    await browserFetch("/api/admin/games");

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8400/api/games");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "omit" });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/admin/games");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ credentials: "same-origin" });
  });

  it("returns undefined for 204 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(204)));
    await expect(browserFetch("/api/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });
});

describe("getErrorMessage", () => {
  it("prefers field errors", () => {
    const error = new ApiError("Invalid", 422, { errors: { email: ["Required"] } });
    expect(getErrorMessage(error)).toBe("Required");
    expect(getErrorMessage(error, "email")).toBe("Required");
    expect(getErrorMessage(new Error("network"))).toBe("network");
  });
});
