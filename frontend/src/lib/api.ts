import type { ApiErrorEnvelope, FieldErrors, Paginator } from "@/types/api";
import { getPublicEnv, getServerEnv } from "./env";

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: QueryParams;
  /** Bearer token for Laravel admin endpoints; injected only from server code. */
  token?: string | null;
  headers?: Record<string, string>;
  /** ISR window for server GET requests. Defaults to 60 seconds. */
  revalidate?: number;
  cache?: "no-store" | "force-cache";
  signal?: AbortSignal;
  keepalive?: boolean;
}

type NextRequestInit = RequestInit & { next?: { revalidate?: number } };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly errors: FieldErrors;
  readonly requestId: string | null;

  constructor(
    message: string,
    status: number,
    options: { errors?: FieldErrors; code?: string | null; requestId?: string | null } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options.code ?? null;
    this.errors = options.errors ?? {};
    this.requestId = options.requestId ?? null;
  }

  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normaliseErrors(value: unknown): FieldErrors {
  if (!isRecord(value)) return {};
  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(value)) {
    if (Array.isArray(messages)) {
      result[field] = messages.filter((message): message is string => typeof message === "string");
    }
  }
  return result;
}

function defaultMessage(status: number): string {
  const messages: Record<number, string> = {
    400: "The request could not be understood.",
    401: "Please sign in to continue.",
    403: "You do not have permission to do that.",
    404: "The requested resource was not found.",
    409: "This change conflicts with existing data.",
    413: "The uploaded file is too large.",
    422: "Please correct the highlighted fields.",
    429: "Too many requests. Please try again shortly.",
  };
  return messages[status] ?? (status >= 500 ? "The server could not complete the request." : "Request failed.");
}

export async function parseErrorResponse(response: Response): Promise<ApiError> {
  const requestId = response.headers.get("X-Request-Id");
  let envelope: ApiErrorEnvelope | null = null;

  try {
    const raw = await response.text();
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed) && typeof parsed.message === "string") {
        envelope = {
          message: parsed.message,
          errors: isRecord(parsed.errors) ? (parsed.errors as ApiErrorEnvelope["errors"]) : undefined,
          code: typeof parsed.code === "string" ? parsed.code : undefined,
        };
      }
    }
  } catch {
    // A non-JSON error body still becomes a documented-looking error envelope.
  }

  return new ApiError(envelope?.message ?? defaultMessage(response.status), response.status, {
    errors: normaliseErrors(envelope?.errors),
    code: envelope?.code,
    requestId,
  });
}

export function buildQuery(params: QueryParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

function isSameOriginProxy(path: string): boolean {
  return path.startsWith("/api/auth/") || path.startsWith("/api/admin/");
}

function createInit(options: ApiRequestOptions): NextRequestInit {
  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined && options.method !== "GET") {
    if (options.body instanceof FormData || options.body instanceof Blob || options.body instanceof ArrayBuffer) {
      body = options.body as BodyInit;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  return {
    method: options.method ?? "GET",
    headers,
    body,
    credentials: "omit",
    signal: options.signal,
    keepalive: options.keepalive,
  };
}

async function parseSuccess<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const raw = await response.text();
  if (!raw) return undefined as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ApiError("The API returned an invalid response.", response.status, {
      requestId: response.headers.get("X-Request-Id"),
    });
  }
}

/** Server-side fetch against `API_URL`, with ISR and optional admin Bearer token. */
export async function serverFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { apiUrl } = getServerEnv();
  const url = `${apiUrl}${path.startsWith("/") ? path : `/${path}`}${buildQuery(options.query)}`;
  const init = createInit(options);
  init.credentials = "omit";
  if ((options.method ?? "GET") === "GET" && options.cache !== "no-store") {
    init.next = { revalidate: options.revalidate ?? 60 };
  } else if (options.cache === "no-store") {
    init.cache = "no-store";
  }

  const response = await fetch(url, init);
  if (!response.ok) throw await parseErrorResponse(response);
  return parseSuccess<T>(response);
}

/**
 * Browser fetch. Public API calls go to `NEXT_PUBLIC_API_URL`; admin/auth calls
 * use same-origin proxy routes so the HttpOnly token never reaches JavaScript.
 */
export async function browserFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const proxy = isSameOriginProxy(path);
  const base = proxy ? "" : getPublicEnv().apiUrl;
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}${buildQuery(options.query)}`;
  const init = createInit(options);
  init.credentials = proxy ? "same-origin" : "omit";

  const response = await fetch(url, init);
  if (!response.ok) throw await parseErrorResponse(response);
  return parseSuccess<T>(response);
}

export function emptyPaginator<T>(perPage = 12): Paginator<T> {
  return {
    data: [],
    links: { first: null, last: null, prev: null, next: null },
    meta: { current_page: 1, from: null, last_page: 1, per_page: perPage, total: 0 },
  };
}

export function getErrorMessage(error: unknown, field?: string): string {
  if (error instanceof ApiError) {
    if (field) {
      const fieldMessage = error.fieldError(field);
      if (fieldMessage) return fieldMessage;
    }
    const firstField = Object.values(error.errors)[0]?.[0];
    return firstField ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function getFieldErrors(error: unknown): FieldErrors {
  return error instanceof ApiError ? error.errors : {};
}
