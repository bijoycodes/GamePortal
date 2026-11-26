import type { SortOption } from "@/types/api";
import { clamp, isValidSlug } from "@/lib/format";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export interface CatalogParams {
  q?: string;
  category?: string;
  tag?: string;
  sort: SortOption;
  per_page: number;
  page: number;
}

const sorts: SortOption[] = ["popular", "newest", "title"];

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function cleanSlug(value: string | string[] | undefined): string | undefined {
  const candidate = first(value)?.trim();
  return candidate && isValidSlug(candidate) ? candidate : undefined;
}

export function parseCatalogParams(raw: RawSearchParams): CatalogParams {
  const sortValue = first(raw.sort);
  const sort = sorts.includes(sortValue as SortOption) ? (sortValue as SortOption) : "popular";
  const query = first(raw.q)?.trim().slice(0, 120);
  const page = Number.parseInt(first(raw.page) ?? "1", 10);
  const perPage = Number.parseInt(first(raw.per_page) ?? "12", 10);

  return {
    q: query || undefined,
    category: cleanSlug(raw.category),
    tag: cleanSlug(raw.tag),
    sort,
    page: Number.isFinite(page) ? clamp(page, 1, 10_000) : 1,
    per_page: Number.isFinite(perPage) ? clamp(perPage, 1, 50) : 12,
  };
}

export function toPlainParams(params: CatalogParams): Record<string, string | undefined> {
  return {
    q: params.q,
    category: params.category,
    tag: params.tag,
    sort: params.sort,
    per_page: params.per_page === 12 ? undefined : String(params.per_page),
    page: params.page === 1 ? undefined : String(params.page),
  };
}
