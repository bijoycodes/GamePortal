"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserFetch, getErrorMessage } from "@/lib/api";
import type { GameStatus } from "@/types/api";
import { ApiErrorBanner } from "./ApiErrorBanner";

export interface GameActionsProps {
  gameId: number;
  title: string;
  status: GameStatus;
}

type Action = "publish" | "disable" | "archive" | "delete";

export function GameActions({ gameId, title, status }: GameActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: Action): Promise<void> {
    if (action === "delete" && !window.confirm(`Delete "${title}"? It will be disabled immediately.`)) return;
    setBusy(true);
    setError(null);
    try {
      await browserFetch(`/api/admin/games/${gameId}${action === "delete" ? "" : `/${action}`}`, {
        method: action === "delete" ? "DELETE" : "POST",
      });
      router.refresh();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel p-5" aria-labelledby="lifecycle-heading">
      <h2 id="lifecycle-heading" className="text-lg font-semibold text-white">
        Publishing lifecycle
      </h2>
      <p className="muted mt-1">Current status: {status}</p>
      <ApiErrorBanner message={error} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy || status === "published"} onClick={() => run("publish")}>
          Publish
        </button>
        <button type="button" className="btn-secondary" disabled={busy || status !== "published"} onClick={() => run("disable")}>
          Disable
        </button>
        <button type="button" className="btn-secondary" disabled={busy || status === "archived"} onClick={() => run("archive")}>
          Archive
        </button>
        <button type="button" className="btn-danger" disabled={busy} onClick={() => run("delete")}>
          Delete
        </button>
      </div>
    </section>
  );
}
