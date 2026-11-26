"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, browserFetch, getErrorMessage } from "@/lib/api";

export interface AdminResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (value: T | null) => void;
}

/** Loads a same-origin admin proxy URL and redirects to login when the token expires. */
export function useAdminResource<T>(path: string | null): AdminResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    browserFetch<T>(path)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) {
          window.location.assign("/admin/login");
          return;
        }
        setError(getErrorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [path, version]);

  return { data, loading, error, reload, setData };
}
