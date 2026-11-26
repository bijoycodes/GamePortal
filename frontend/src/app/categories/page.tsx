import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { GridIcon } from "@/components/icons";
import { emptyPaginator } from "@/lib/api";
import { safeFetch } from "@/features/catalog/safe-fetch";
import { formatNumber } from "@/lib/format";
import type { Category, Paginator } from "@/types/api";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse GamePortal games by category.",
};

export default async function CategoriesPage() {
  const { value: categories, unavailable } = await safeFetch<Paginator<Category>>(
    "/api/categories",
    emptyPaginator(50),
    { query: { per_page: 50 } },
  );

  return (
    <div className="page-shell">
      <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">Categories</h1>
      <p className="muted mb-8">Pick a genre to see every published game in it.</p>

      {unavailable && (
        <p role="status" className="panel mb-6 border-amber-800 p-4 text-sm text-amber-200">
          The catalogue API is temporarily unavailable. Categories will appear here once it responds.
        </p>
      )}

      {categories.data.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.data.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="panel group block p-5 no-underline transition-colors hover:border-brand-700"
            >
              <h2 className="text-lg font-semibold text-slate-100 group-hover:text-brand-200">{category.name}</h2>
              <p className="muted mt-2 line-clamp-2">{category.description ?? "Explore games in this category."}</p>
              <p className="mt-4 text-sm font-medium text-brand-300">
                {formatNumber(category.game_count)} {category.game_count === 1 ? "game" : "games"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<GridIcon className="h-6 w-6" />}
          title="No categories yet"
          description="Categories appear here once an administrator creates them."
          action={{ label: "Browse all games", href: "/games" }}
        />
      )}
    </div>
  );
}
