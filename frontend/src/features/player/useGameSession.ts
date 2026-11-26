"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { browserFetch, getErrorMessage } from "@/lib/api";
import { clamp } from "@/lib/format";
import type { GameEventRequest, GameEventResponse, GameSession } from "@/types/api";
import { isValidGameMessageEvent, parseGameMessage } from "./messages";

export type SessionStatus = "starting" | "ready" | "error";

export interface UseGameSessionOptions {
  gameId: number;
  slug: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

export interface GameSessionController {
  status: SessionStatus;
  token: string | null;
  error: string | null;
  postEvent: (event: GameEventRequest) => Promise<void>;
  closeSession: () => void;
}

export function useGameSession({ gameId, slug, iframeRef }: UseGameSessionOptions): GameSessionController {
  const [status, setStatus] = useState<SessionStatus>("starting");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const closedRef = useRef<boolean>(false);

  const postEvent = useCallback(async (event: GameEventRequest): Promise<void> => {
    const currentToken = tokenRef.current;
    if (!currentToken || closedRef.current) return;
    try {
      await browserFetch<GameEventResponse>(`/api/sessions/${encodeURIComponent(currentToken)}/events`, {
        method: "POST",
        body: event,
        keepalive: true,
      });
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }, []);

  const closeSession = useCallback((): void => {
    const currentToken = tokenRef.current;
    if (!currentToken || closedRef.current) return;
    closedRef.current = true;

    const endedAt = new Date().toISOString();
    void postEvent({ type: "end", metadata: {}, occurred_at: endedAt });

    const payload = JSON.stringify({
      duration_seconds: clamp(Math.round((Date.now() - startedAtRef.current) / 1000), 0, 86_400),
      ended_at: endedAt,
    });
    const closeUrl = `/api/sessions/${encodeURIComponent(currentToken)}/close`;
    const blob = new Blob([payload], { type: "application/json" });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(closeUrl, blob);
    } else {
      void fetch(closeUrl, { method: "POST", body: blob, credentials: "omit", keepalive: true });
    }
  }, [postEvent]);

  useEffect(() => {
    let cancelled = false;
    closedRef.current = false;
    setStatus("starting");
    setError(null);

    async function startSession(): Promise<void> {
      try {
        const session = await browserFetch<GameSession>(`/api/games/${encodeURIComponent(slug)}/sessions`, {
          method: "POST",
          body: { referrer: window.location.origin },
        });
        if (cancelled) return;
        tokenRef.current = session.session_token;
        startedAtRef.current = new Date(session.started_at).getTime() || Date.now();
        setToken(session.session_token);
        setStatus("ready");
      } catch (cause) {
        if (cancelled) return;
        setStatus("error");
        setError(getErrorMessage(cause));
      }
    }

    void startSession();
    return () => {
      cancelled = true;
    };
  }, [gameId, slug]);

  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (!isValidGameMessageEvent(event, iframeRef.current)) return;
      const payload = parseGameMessage(event.data);
      if (!payload) return;
      void postEvent(payload);
    }

    function onPageHide(): void {
      closeSession();
    }

    window.addEventListener("message", onMessage);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
    };
  }, [iframeRef, postEvent, closeSession]);

  return { status, token, error, postEvent, closeSession };
}
