"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { AlertIcon, FullscreenIcon, PlayIcon } from "@/components/icons";
import { getPublicEnv } from "@/lib/env";
import type { GameResource } from "@/types/api";
import { isSafePlayerUrl } from "./player-url";
import { useGameSession } from "./useGameSession";

export interface GamePlayerProps {
  game: GameResource;
}

export function GamePlayer({ game }: GamePlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const session = useGameSession({ gameId: game.id, slug: game.slug, iframeRef });
  const { appUrl } = getPublicEnv();
  const safeUrl = isSafePlayerUrl(game.player_url, appUrl);

  useEffect(() => {
    function onFullscreenChange(): void {
      setFullscreen(document.fullscreenElement === wrapperRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function toggleFullscreen(): Promise<void> {
    setFullscreenError(null);
    try {
      if (document.fullscreenElement === wrapperRef.current) {
        await document.exitFullscreen();
      } else if (wrapperRef.current?.requestFullscreen) {
        await wrapperRef.current.requestFullscreen();
      } else {
        setFullscreenError("Fullscreen is not supported by this browser.");
      }
    } catch {
      setFullscreenError("Fullscreen was blocked by the browser. Try again with a click.");
    }
  }

  if (!safeUrl) {
    return (
      <ErrorState
        title="Game unavailable"
        message="This game does not provide a safe, separate-origin player URL."
        retryHref="/games"
        retryLabel="Back to games"
      />
    );
  }

  return (
    <section aria-label={`Play ${game.title}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="muted flex items-center gap-2" aria-live="polite">
          <PlayIcon className="h-4 w-4 text-brand-300" />
          {session.status === "starting" && "Starting your session…"}
          {session.status === "ready" && "Session active — have fun!"}
          {session.status === "error" && "Playback continues; analytics are unavailable."}
        </p>
        <button type="button" onClick={toggleFullscreen} className="btn-secondary" aria-pressed={fullscreen}>
          <FullscreenIcon className="h-4 w-4" />
          {fullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>
      </div>
      {session.error && (
        <p className="muted mb-2 flex items-center gap-1.5 text-amber-300">
          <AlertIcon className="h-4 w-4" />
          {session.error}
        </p>
      )}
      {fullscreenError && (
        <p role="alert" className="muted mb-2 text-amber-300">
          {fullscreenError}
        </p>
      )}

      <div
        ref={wrapperRef}
        className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black shadow-2xl"
      >
        <iframe
          ref={iframeRef}
          src={game.player_url}
          title={`Play ${game.title}`}
          sandbox="allow-scripts allow-pointer-lock allow-fullscreen"
          allow="fullscreen; gamepad; autoplay"
          referrerPolicy="no-referrer"
          className="h-full w-full border-0"
        />
      </div>

      <details className="panel mt-4 p-4">
        <summary className="cursor-pointer font-semibold text-slate-100">How to play</summary>
        <p className="muted mt-3 whitespace-pre-line">
          {game.instructions ??
            "Use the controls shown inside the game. Press the fullscreen button for a larger play area."}
        </p>
      </details>
    </section>
  );
}
