import Link from "next/link";
import type { GameResource } from "@/types/api";
import { formatNumber, truncate } from "@/lib/format";
import { GamepadMark } from "./GamepadMark";
import { PlayIcon, TrophyIcon } from "./icons";

export interface GameCardProps {
  game: GameResource;
}

export function GameCard({ game }: GameCardProps) {
  return (
    <article className="panel group flex h-full flex-col overflow-hidden transition-colors hover:border-brand-700">
      <Link href={`/games/${game.slug}`} className="flex h-full flex-col no-underline">
        <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
          {game.thumbnail_url ? (
            <img
              src={game.thumbnail_url}
              alt={`${game.title} thumbnail`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-600">
              <GamepadMark className="h-12 w-12" />
            </div>
          )}
          {game.featured && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-xs font-semibold text-white">
              <TrophyIcon className="h-3.5 w-3.5" />
              Featured
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-base font-semibold text-slate-50 group-hover:text-brand-200">{game.title}</h3>
          <p className="muted mt-1 line-clamp-2">{game.description ?? "No description provided."}</p>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs text-slate-400">
            {game.category && (
              <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">{game.category.name}</span>
            )}
            {game.tags.slice(0, 2).map((tag) => (
              <span key={tag.id} className="rounded-full border border-slate-800 px-2 py-1">
                {truncate(tag.name, 20)}
              </span>
            ))}
            {game.developer && <span className="ml-auto truncate">{truncate(game.developer, 24)}</span>}
          </div>
        </div>
        <span className="flex items-center gap-1 border-t border-slate-800 px-4 py-3 text-sm font-semibold text-brand-300 no-underline">
          <PlayIcon className="h-4 w-4" />
          Play now
        </span>
      </Link>
    </article>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="panel h-full animate-pulse overflow-hidden" aria-hidden="true">
      <div className="aspect-video w-full bg-slate-800" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded bg-slate-800" />
        <div className="h-3 w-full rounded bg-slate-800" />
        <div className="h-3 w-1/2 rounded bg-slate-800" />
      </div>
    </div>
  );
}

export function GameCountLabel({ count }: { count: number }) {
  return <span className="muted">{formatNumber(count)} games</span>;
}
