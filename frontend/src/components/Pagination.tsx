import Link from "next/link";
import type { PaginatorMeta } from "@/types/api";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

export interface PaginationProps {
  meta: PaginatorMeta;
  pathname: string;
  params: Record<string, string | undefined>;
}

function pageWindow(current: number, last: number): number[] {
  const pages = new Set<number>([1, last, current]);
  for (let offset = -2; offset <= 2; offset += 1) {
    const candidate = current + offset;
    if (candidate >= 1 && candidate <= last) pages.add(candidate);
  }
  return [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);
}

export function Pagination({ meta, pathname, params }: PaginationProps) {
  if (meta.last_page <= 1) return null;

  function hrefFor(page: number): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (page > 1) search.set("page", String(page));
    else search.delete("page");
    const encoded = search.toString();
    return encoded ? `${pathname}?${encoded}` : pathname;
  }

  const pages = pageWindow(meta.current_page, meta.last_page);

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1">
      {meta.current_page > 1 ? (
        <Link href={hrefFor(meta.current_page - 1)} className="btn-secondary px-3" aria-label="Previous page">
          <ChevronLeftIcon className="h-4 w-4" />
        </Link>
      ) : (
        <span className="btn-secondary px-3 opacity-40" aria-hidden="true">
          <ChevronLeftIcon className="h-4 w-4" />
        </span>
      )}

      {pages.map((page, index) => (
        <span key={page} className="flex items-center">
          {index > 0 && page - pages[index - 1] > 1 && (
            <span className="px-2 text-slate-500" aria-hidden="true">
              &hellip;
            </span>
          )}
          {page === meta.current_page ? (
            <span aria-current="page" className="btn-primary min-w-10 px-3">
              {page}
            </span>
          ) : (
            <Link href={hrefFor(page)} className="btn-secondary min-w-10 px-3" aria-label={`Page ${page}`}>
              {page}
            </Link>
          )}
        </span>
      ))}

      {meta.current_page < meta.last_page ? (
        <Link href={hrefFor(meta.current_page + 1)} className="btn-secondary px-3" aria-label="Next page">
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      ) : (
        <span className="btn-secondary px-3 opacity-40" aria-hidden="true">
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
