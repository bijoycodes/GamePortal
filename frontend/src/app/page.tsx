import Link from "next/link";
import { Suspense } from "react";
import { CategoryChips } from "@/components/CategoryChips";
import { EmptyState } from "@/components/EmptyState";
import { GameCard } from "@/components/GameCard";
import { SearchBar } from "@/components/SearchBar";
import { emptyPaginator } from "@/lib/api";
import { safeFetch } from "@/features/catalog/safe-fetch";
import type { Category, GameResource, Paginator } from "@/types/api";

export const revalidate = 60;

export default async function HomePage() {
  const [popular, newest, categories] = await Promise.all([
    safeFetch<Paginator<GameResource>>("/api/games", emptyPaginator(12), { query: { sort: "popular", per_page: 12 } }),
    safeFetch<Paginator<GameResource>>("/api/games", emptyPaginator(8), { query: { sort: "newest", per_page: 8 } }),
    safeFetch<Paginator<Category>>("/api/categories", emptyPaginator(12), { query: { per_page: 12 } }),
  ]);

  const unavailable = popular.unavailable || newest.unavailable || categories.unavailable;
  const featured = popular.value.data.filter((game) => game.featured);
  const recent = newest.value.data.filter((game) => !featured.some((item) => item.id === game.id)).slice(0, 8);

  return (
    <div className="page-shell">
      <section className="panel mb-10 overflow-hidden px-6 py-12 sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">Instant play</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Find your next favourite browser game.
        </h1>
        <p className="muted mt-3 max-w-xl">
          No installs, no accounts. Browse the catalogue, pick a game and start playing in your browser.
        </p>
        <div className="mt-6">
          <Suspense fallback={<div className="h-10 w-full max-w-xl animate-pulse rounded-lg bg-slate-800" />}>
            <SearchBar />
          </Suspense>
        </div>
        <div className="mt-6">
          <CategoryChips categories={categories.value.data} />
        </div>
      </section>

      {unavailable && (
        <p role="status" className="panel mb-8 border-amber-800 p-4 text-sm text-amber-200">
          The catalogue API is temporarily unavailable. Published games will appear here once it responds.
        </p>
      )}

      <section aria-labelledby="featured-heading" className="mb-12">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="featured-heading" className="text-xl font-semibold text-white">
            Featured games
          </h2>
          <Link href="/games" className="text-sm">
            View all games
          </Link>
        </div>
        {featured.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No featured games yet"
            description="Editors have not highlighted any games. The full catalogue is still open."
            action={{ label: "Browse games", href: "/games" }}
          />
        )}
      </section>

      <section aria-labelledby="recent-heading">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="recent-heading" className="text-xl font-semibold text-white">
            Recently added
          </h2>
          <Link href="/games?sort=newest" className="text-sm">
            See newest
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recent.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No games published yet"
            description="Once games are published they will appear here automatically."
          />
        )}
      </section>
    </div>
  );
}
