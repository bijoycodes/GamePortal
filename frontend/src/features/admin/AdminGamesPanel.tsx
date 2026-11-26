"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { StatusBadge } from "@/components/StatusBadge";
import { browserFetch, getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AdminGame, GameStatus, Paginator } from "@/types/api";
import { ApiErrorBanner } from "./ApiErrorBanner";
import { AdminLoading } from "./AdminLoading";
import { useAdminResource } from "./useAdminResource";

interface Filters {
  q: string;
  status: string;
  category: string;
}

const statuses: Array<GameStatus | ""> = ["", "draft", "published", "disabled", "archived"];

export function AdminGamesPanel({ categories }: { categories: { id: number; name: string }[] }) {
  const [draft, setDraft] = useState<Filters>({ q: "", status: "", category: "" });
  const [filters, setFilters] = useState<Filters>({ q: "", status: "", category: "" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const query = new URLSearchParams({ per_page: "15" });
  if (filters.q) query.set("q", filters.q);
  if (filters.status) query.set("status", filters.status);
  if (filters.category) query.set("category", filters.category);
  const path = `/api/admin/games?${query.toString()}`;
  const { data, loading, error, reload } = useAdminResource<Paginator<AdminGame>>(path);

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFilters({ ...draft });
  }

  async function act(game: AdminGame, action: "publish" | "disable" | "archive" | "delete"): Promise<void> {
    if (action === "delete" && !window.confirm(`Delete "${game.title}"? It will be disabled immediately.`)) return;
    setActionError(null);
    setBusyId(game.id);
    try {
      const isDelete = action === "delete";
      await browserFetch(`/api/admin/games/${game.id}${isDelete ? "" : `/${action}`}`, {
        method: isDelete ? "DELETE" : "POST",
      });
      reload();
    } catch (cause) {
      setActionError(getErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <ApiErrorBanner message={error} />
      <ApiErrorBanner message={actionError} />

      <form onSubmit={applyFilters} className="panel flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label htmlFor="admin-game-q" className="label">
            Search
          </label>
          <input
            id="admin-game-q"
            className="input"
            maxLength={120}
            placeholder="Title, developer or description"
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor="admin-game-status" className="label">
            Status
          </label>
          <select
            id="admin-game-status"
            className="input"
            value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value })}
          >
            {statuses.map((status) => (
              <option key={status || "all"} value={status}>
                {status || "All statuses"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-game-category" className="label">
            Category
          </label>
          <select
            id="admin-game-category"
            className="input"
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Apply filters
        </button>
      </form>

      {loading && !data ? (
        <AdminLoading label="Loading games…" />
      ) : data && data.data.length > 0 ? (
        <>
          <div className="panel overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Game</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((game) => (
                  <tr key={game.id}>
                    <td>
                      <Link href={`/admin/games/${game.id}/edit`} className="font-semibold">
                        {game.title}
                      </Link>
                      <p className="muted text-xs">{game.slug}</p>
                    </td>
                    <td>
                      <StatusBadge status={game.status} />
                    </td>
                    <td className="whitespace-nowrap text-slate-400">{formatDate(game.updated_at)}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link href={`/admin/games/${game.id}/edit`} className="btn-secondary px-2 py-1 text-xs">
                          Edit
                        </Link>
                        {game.status !== "published" && (
                          <button
                            type="button"
                            className="btn-secondary px-2 py-1 text-xs"
                            disabled={busyId === game.id}
                            onClick={() => act(game, "publish")}
                          >
                            Publish
                          </button>
                        )}
                        {game.status === "published" && (
                          <button
                            type="button"
                            className="btn-secondary px-2 py-1 text-xs"
                            disabled={busyId === game.id}
                            onClick={() => act(game, "disable")}
                          >
                            Disable
                          </button>
                        )}
                        {game.status !== "archived" && (
                          <button
                            type="button"
                            className="btn-secondary px-2 py-1 text-xs"
                            disabled={busyId === game.id}
                            onClick={() => act(game, "archive")}
                          >
                            Archive
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-danger px-2 py-1 text-xs"
                          disabled={busyId === game.id}
                          onClick={() => act(game, "delete")}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            meta={data.meta}
            pathname="/admin/games"
            params={{ q: filters.q, status: filters.status, category: filters.category }}
          />
          <p className="muted text-center">
            {data.meta.total} {data.meta.total === 1 ? "game" : "games"} found
          </p>
        </>
      ) : (
        <EmptyState
          title="No games found"
          description="Adjust the filters or create a new draft to get started."
          action={{ label: "Create a game", href: "/admin/games/new" }}
        />
      )}
    </div>
  );
}
