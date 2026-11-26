import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { GameCard } from "@/components/GameCard";
import { ApiError, serverFetch } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import { GamePlayer } from "@/features/player/GamePlayer";
import type { GameResource, Paginator } from "@/types/api";

export const dynamic = "force-dynamic";

interface GameDetailProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GameDetailProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const game = await serverFetch<GameResource>(`/api/games/${encodeURIComponent(slug)}`, { cache: "no-store" });
    return { title: `Play ${game.title}`, description: game.description ?? undefined };
  } catch {
    return { title: "Game unavailable" };
  }
}

export default async function GameDetailPage({ params }: GameDetailProps) {
  const { slug } = await params;

  let game: GameResource;
  try {
    game = await serverFetch<GameResource>(`/api/games/${encodeURIComponent(slug)}`, { cache: "no-store" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const related = await serverFetch<Paginator<GameResource>>("/api/games", {
    query: { category: game.category?.slug, per_page: 5 },
  });
  const others = related.data.filter((item) => item.id !== game.id).slice(0, 4);

  return (
    <div className="page-shell">
      <nav aria-label="Breadcrumb" className="muted mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/games">Games</Link>
        <span aria-hidden="true">/</span>
        {game.category ? (
          <>
            <Link href={`/categories/${game.category.slug}`}>{game.category.name}</Link>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <span className="text-slate-300">{game.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h1 className="mb-4 text-2xl font-bold text-white sm:text-3xl">{game.title}</h1>
          <GamePlayer game={game} />
        </div>

        <aside className="panel h-fit p-5" aria-label="Game information">
          <h2 className="text-lg font-semibold text-white">About this game</h2>
          <p className="muted mt-2 whitespace-pre-line">{game.description ?? "No description provided."}</p>
          <dl className="mt-5 space-y-3 text-sm">
            <MetaRow label="Developer" value={game.developer} />
            <MetaRow label="Category" value={game.category?.name} />
            <MetaRow label="Released" value={game.release_year ? String(game.release_year) : null} />
            <MetaRow label="Version" value={game.version} />
            <MetaRow
              label="Dimensions"
              value={game.width && game.height ? `${formatNumber(game.width)} × ${formatNumber(game.height)}` : null}
            />
            <MetaRow label="Orientation" value={game.orientation} />
            <MetaRow label="Published" value={formatDate(game.published_at)} />
          </dl>

          {game.tags.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tags</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {game.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/games?tag=${encodeURIComponent(tag.slug)}`}
                    className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300 no-underline hover:border-brand-500"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-slate-800 pt-4 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Licence</h3>
            <p className="muted mt-2">
              {game.license.name ?? "Not specified"}
              {game.license.url && (
                <>
                  {" · "}
                  <a href={game.license.url} rel="noopener noreferrer nofollow" target="_blank">
                    View licence
                  </a>
                </>
              )}
            </p>
            {game.license.attribution && <p className="muted mt-1">{game.license.attribution}</p>}
          </div>
        </aside>
      </div>

      <section aria-labelledby="related-heading" className="mt-12">
        <h2 id="related-heading" className="mb-4 text-xl font-semibold text-white">
          More games like this
        </h2>
        {others.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((item) => (
              <GameCard key={item.id} game={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No related games yet"
            description="Browse the catalogue to discover something new."
            action={{ label: "Browse games", href: "/games" }}
          />
        )}
      </section>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right text-slate-200">{value}</dd>
    </div>
  );
}
