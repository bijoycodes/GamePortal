import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { GameCard } from "@/components/GameCard";
import { Pagination } from "@/components/Pagination";
import { ApiError, serverFetch } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { parseCatalogParams, type RawSearchParams } from "@/features/catalog/params";
import type { Category, GameResource, Paginator } from "@/types/api";

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await serverFetch<Category>(`/api/categories/${encodeURIComponent(slug)}`, { cache: "no-store" });
    return { title: category.name, description: category.description ?? undefined };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const pageParams = parseCatalogParams(await searchParams);

  let category: Category;
  try {
    category = await serverFetch<Category>(`/api/categories/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const games = await serverFetch<Paginator<GameResource>>("/api/games", {
    query: { category: slug, per_page: pageParams.per_page, page: pageParams.page },
  });

  return (
    <div className="page-shell">
      <nav aria-label="Breadcrumb" className="muted mb-4 flex items-center gap-2 text-sm">
        <Link href="/categories">Categories</Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-300">{category.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{category.name}</h1>
        <p className="muted mt-2 max-w-2xl">{category.description ?? "Browse the games in this category."}</p>
        <p className="muted mt-2">{formatNumber(games.meta.total)} published games</p>
      </header>

      {games.data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {games.data.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No games in this category"
          description="Published games assigned to this category will appear here."
          action={{ label: "Browse all games", href: "/games" }}
        />
      )}

      <Pagination meta={games.meta} pathname={`/categories/${slug}`} params={{}} />
    </div>
  );
}
