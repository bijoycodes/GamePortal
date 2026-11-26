import Link from "next/link";
import type { Category } from "@/types/api";

export interface CategoryChipsProps {
  categories: Category[];
  /** Other URL parameters to preserve when a chip is selected. */
  params?: Record<string, string | undefined>;
  paramKey?: string;
}

export function CategoryChips({ categories, params = {}, paramKey = "category" }: CategoryChipsProps) {
  const active = params[paramKey] ?? "";

  function hrefFor(slug: string): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== paramKey) search.set(key, value);
    }
    if (slug) search.set(paramKey, slug);
    const encoded = search.toString();
    return encoded ? `/games?${encoded}` : "/games";
  }

  return (
    <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
      <Link
        href={hrefFor("")}
        aria-current={active ? undefined : "true"}
        className={`rounded-full border px-3 py-1.5 text-sm no-underline ${
          active
            ? "border-slate-700 bg-slate-900 text-slate-300 hover:border-brand-600"
            : "border-brand-500 bg-brand-600 text-white"
        }`}
      >
        All games
      </Link>
      {categories.map((category) => {
        const selected = category.slug === active;
        return (
          <Link
            key={category.id}
            href={hrefFor(category.slug)}
            aria-current={selected ? "true" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm no-underline ${
              selected
                ? "border-brand-500 bg-brand-600 text-white"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-brand-600 hover:text-white"
            }`}
          >
            {category.name}
            <span className="ml-1.5 text-xs text-slate-400">{category.game_count}</span>
          </Link>
        );
      })}
    </nav>
  );
}
