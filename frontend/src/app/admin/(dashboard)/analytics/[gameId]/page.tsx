import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { AnalyticsChart } from "@/features/admin/AnalyticsChart";
import { KpiCard } from "@/features/admin/KpiCard";
import { ClockIcon, PlayIcon, TrophyIcon, GridIcon } from "@/components/icons";
import { ApiError, serverFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import { formatDateTime, formatDuration, formatNumber, truncate } from "@/lib/format";
import type { GameAnalytics } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game analytics",
};

const windows = [7, 30, 90] as const;

interface GameAnalyticsPageProps {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ days?: string | string[] }>;
}

function parseDays(value: string | string[] | undefined): 7 | 30 | 90 {
  const raw = Array.isArray(value) ? value[0] : value;
  const number = Number(raw);
  return windows.includes(number as 7 | 30 | 90) ? (number as 7 | 30 | 90) : 30;
}

export default async function GameAnalyticsPage({ params, searchParams }: GameAnalyticsPageProps) {
  const { gameId } = await params;
  if (!/^\d+$/.test(gameId)) notFound();

  const days = parseDays((await searchParams).days);
  const token = await getAdminToken();

  let data: GameAnalytics;
  try {
    data = await serverFetch<GameAnalytics>(`/api/admin/analytics/games/${gameId}`, {
      query: { days },
      token,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={data.game.title}
        description="Anonymous play metrics for this game."
        actions={
          <>
            <nav aria-label="Analytics period" className="flex gap-2">
              {windows.map((window) => (
                <Link
                  key={window}
                  href={window === 30 ? `/admin/analytics/${gameId}` : `/admin/analytics/${gameId}?days=${window}`}
                  aria-current={days === window ? "page" : undefined}
                  className={`btn ${days === window ? "bg-brand-600 text-white" : "btn-secondary"}`}
                >
                  {window} days
                </Link>
              ))}
            </nav>
            <Link href="/admin/analytics" className="btn-secondary">
              All games
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Plays" value={formatNumber(data.plays)} icon={<PlayIcon />} />
        <KpiCard label="Unique players" value={formatNumber(data.unique_players)} icon={<TrophyIcon />} />
        <KpiCard label="Sessions" value={formatNumber(data.sessions)} icon={<GridIcon />} />
        <KpiCard label="Average duration" value={formatDuration(data.avg_duration_seconds)} icon={<ClockIcon />} />
      </div>

      <section className="panel p-5" aria-labelledby="game-trend-heading">
        <h2 id="game-trend-heading" className="mb-4 text-lg font-semibold text-white">
          Daily plays ({days} days)
        </h2>
        <AnalyticsChart points={data.timeseries} />
      </section>

      <section className="panel p-5" aria-labelledby="recent-events-heading">
        <h2 id="recent-events-heading" className="mb-4 text-lg font-semibold text-white">
          Recent events
        </h2>
        {data.recent_events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Metadata</th>
                  <th scope="col">Occurred at</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_events.map((event) => (
                  <tr key={event.id}>
                    <td className="font-mono text-xs">{event.type}</td>
                    <td className="max-w-xs truncate font-mono text-xs text-slate-400">
                      {truncate(JSON.stringify(event.metadata), 160)}
                    </td>
                    <td className="whitespace-nowrap text-slate-400">{formatDateTime(event.occurred_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No events recorded for this game.</p>
        )}
      </section>
    </div>
  );
}
