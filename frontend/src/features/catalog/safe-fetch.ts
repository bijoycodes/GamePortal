import { ApiError, serverFetch, type ApiRequestOptions } from "@/lib/api";

export interface SafeFetchResult<T> {
  value: T;
  unavailable: boolean;
}

/**
 * Catalogue reads must not break `next build` when the API is not running yet.
 * HTTP errors still propagate to the error boundary; only transport failures
 * produce the fallback, and the UI labels it as unavailable.
 */
export async function safeFetch<T>(
  path: string,
  fallback: T,
  options: ApiRequestOptions = {},
): Promise<SafeFetchResult<T>> {
  try {
    return { value: await serverFetch<T>(path, options), unavailable: false };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return { value: fallback, unavailable: true };
  }
}
