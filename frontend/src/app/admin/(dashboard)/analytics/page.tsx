import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { AnalyticsChart } from "@/features/admin/AnalyticsChart";
import { KpiCard } from "@/features/admin/KpiCard";
import { ClockIcon, PlayIcon, TrophyIcon, GridIcon } from "@/components/icons";
import { serverFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import { formatDuration, formatNumber } from "@/lib/format";
import type { AnalyticsOverview } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics overview",
};

const windows = [7, 30, 90] as const;

interface AnalyticsPageProps {
  searchParams: Promise<{ days?: string | string[] }>;
}

function parseDays(value: string | string[] | undefined): 7 | 30 | 90 {
  const raw = Array.isArray(value) ? value[0] : value;
  const number = Number(raw);
  return windows.includes(number as 7 | 30 | 90) ? (number as 7 | 30 | 90) : 30;
}

export default async function AdminAnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const days = parseDays((await searchParams).days);
  const token = await getAdminToken();
  const overview = await serverFetch<AnalyticsOverview>("/api/admin/analytics/overview", {
    query: { days },
    token,
    cache: "no-store",
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Analytics"
        description="Aggregate, anonymous play metrics."
        actions={
          <nav aria-label="Analytics period" className="flex gap-2">
            {windows.map((window) => (
              <Link
                key={window}
                href={window === 30 ? "/admin/analytics" : `/admin/analytics?days=${window}`}
                aria-current={days === window ? "page" : undefined}
                className={`btn ${days === window ? "bg-brand-600 text-white" : "btn-secondary"}`}
              >
                {window} days
              </Link>
            ))}
          </nav>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Plays" value={formatNumber(overview.plays)} icon={<PlayIcon />} />
        <KpiCard label="Unique players" value={formatNumber(overview.unique_players)} icon={<TrophyIcon />} />
        <KpiCard label="Sessions" value={formatNumber(overview.sessions)} icon={<GridIcon />} />
        <KpiCard label="Average duration" value={formatDuration(overview.avg_duration_seconds)} icon={<ClockIcon />} />
      </div>

      <section className="panel p-5" aria-labelledby="trend-heading">
        <h2 id="trend-heading" className="mb-4 text-lg font-semibold text-white">
          Daily plays ({days} days)
        </h2>
        <AnalyticsChart points={overview.timeseries} />
      </section>

      <section className="panel p-5" aria-labelledby="top-games-heading">
        <h2 id="top-games-heading" className="mb-4 text-lg font-semibold text-white">
          Top games
        </h2>
        {overview.top_games.length > 0 ? (
          <table className="table-base">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Game</th>
                <th scope="col" className="text-right">
                  Plays
                </th>
              </tr>
            </thead>
            <tbody>
              {overview.top_games.map((game, index) => (
                <tr key={game.id}>
                  <td className="text-slate-400">{index + 1}</td>
                  <td>
                    <Link href={`/admin/analytics/${game.id}`}>{game.title}</Link>
                  </td>
                  <td className="text-right">{formatNumber(game.plays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No completed plays in this period.</p>
        )}
      </section>
    </div>
  );
}
