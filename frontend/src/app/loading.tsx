import { GameCardSkeleton } from "@/components/GameCard";

export default function Loading() {
  return (
    <div className="page-shell">
      <div className="mb-8 h-8 w-64 animate-pulse rounded bg-slate-800" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }, (_, index) => (
          <GameCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
