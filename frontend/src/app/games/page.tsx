import { Suspense } from "react";
import type { Metadata } from "next";
import { CategoryChips } from "@/components/CategoryChips";
import { EmptyState } from "@/components/EmptyState";
import { GameCard } from "@/components/GameCard";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { TagIcon } from "@/components/icons";
import { emptyPaginator } from "@/lib/api";
import { safeFetch } from "@/features/catalog/safe-fetch";
import { parseCatalogParams, toPlainParams, type RawSearchParams } from "@/features/catalog/params";
import type { Category, GameResource, Paginator, Tag } from "@/types/api";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Browse games",
  description: "Search and filter the GamePortal catalogue by category, tag and popularity.",
};

interface GamesPageProps {
  searchParams: Promise<RawSearchParams>;
}

const sortLabels = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest first" },
  { value: "title", label: "Title A–Z" },
] as const;

export default async function GamesPage({ searchParams }: GamesPageProps) {
  const params = parseCatalogParams(await searchParams);
  const plain = toPlainParams(params);

  const [games, categories, tags] = await Promise.all([
    safeFetch<Paginator<GameResource>>("/api/games", emptyPaginator(params.per_page), { query: { ...params } }),
    safeFetch<Paginator<Category>>("/api/categories", emptyPaginator(50), { query: { per_page: 50 } }),
    safeFetch<Paginator<Tag>>("/api/tags", emptyPaginator(50), { query: { per_page: 50 } }),
  ]);
  const unavailable = games.unavailable || categories.unavailable || tags.unavailable;

  return (
    <div className="page-shell">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Browse games</h1>
        <p className="muted mt-1">
          {games.value.meta.total} {games.value.meta.total === 1 ? "game" : "games"} available
        </p>
      </div>

      {unavailable && (
        <p role="status" className="panel mb-6 border-amber-800 p-4 text-sm text-amber-200">
          The catalogue API is temporarily unavailable. Results will return when it responds.
        </p>
      )}

      <div className="panel mb-8 space-y-5 p-5">
        <Suspense fallback={<div className="h-10 w-full max-w-xl animate-pulse rounded-lg bg-slate-800" />}>
          <SearchBar initialValue={params.q ?? ""} />
        </Suspense>
        <CategoryChips categories={categories.value.data} params={plain} />

        <div className="flex flex-wrap items-center gap-2">
          <span className="muted flex items-center gap-1">
            <TagIcon className="h-4 w-4" />
            Tags:
          </span>
          {tags.value.data.map((tag) => {
            const active = tag.slug === params.tag;
            const search = new URLSearchParams();
            for (const [key, value] of Object.entries(plain)) {
              if (value && key !== "tag" && key !== "page") search.set(key, value);
            }
            if (!active) search.set("tag", tag.slug);
            const encoded = search.toString();
            return (
              <a
                key={tag.id}
                href={encoded ? `/games?${encoded}` : "/games"}
                aria-current={active ? "true" : undefined}
                className={`rounded-full border px-2.5 py-1 text-xs no-underline ${
                  active
                    ? "border-brand-500 bg-brand-600 text-white"
                    : "border-slate-700 text-slate-300 hover:border-brand-600"
                }`}
              >
                {tag.name}
              </a>
            );
          })}
        </div>

        <form action="/games" method="get" className="flex flex-wrap items-center gap-2">
          {Object.entries(plain).map(([key, value]) =>
            value && key !== "sort" && key !== "page" ? (
              <input key={key} type="hidden" name={key} value={value} />
            ) : null,
          )}
          <label htmlFor="sort" className="muted">
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={params.sort} className="input max-w-48">
            {sortLabels.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-secondary">
            Apply
          </button>
        </form>
      </div>

      {games.value.data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {games.value.data.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No games match your filters"
          description="Try a different search term or clear the filters to see the full catalogue."
          action={{ label: "Clear filters", href: "/games" }}
        />
      )}

      <Pagination meta={games.value.meta} pathname="/games" params={plain} />
    </div>
  );
}
