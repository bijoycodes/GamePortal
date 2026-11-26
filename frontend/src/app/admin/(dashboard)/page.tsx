import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { AnalyticsChart } from "@/features/admin/AnalyticsChart";
import { KpiCard } from "@/features/admin/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ClockIcon, GridIcon, PlayIcon, TrophyIcon } from "@/components/icons";
import { serverFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import type { AdminGame, AnalyticsOverview, AuditLog, Paginator } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

export default async function AdminDashboardPage() {
  const token = await getAdminToken();
  const [overview, games, audit] = await Promise.all([
    serverFetch<AnalyticsOverview>("/api/admin/analytics/overview", { query: { days: 30 }, token, cache: "no-store" }),
    serverFetch<Paginator<AdminGame>>("/api/admin/games", { query: { per_page: 6 }, token, cache: "no-store" }),
    serverFetch<Paginator<AuditLog>>("/api/admin/audit-logs", { query: { per_page: 5 }, token, cache: "no-store" }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="A snapshot of the last 30 days."
        actions={
          <>
            <Link href="/admin/games/new" className="btn-primary">
              Add a game
            </Link>
            <Link href="/admin/analytics" className="btn-secondary">
              Full analytics
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Plays" value={formatNumber(overview.plays)} icon={<PlayIcon />} />
        <KpiCard label="Unique players" value={formatNumber(overview.unique_players)} icon={<TrophyIcon />} />
        <KpiCard label="Sessions" value={formatNumber(overview.sessions)} icon={<GridIcon />} />
        <KpiCard
          label="Average duration"
          value={formatDuration(overview.avg_duration_seconds)}
          icon={<ClockIcon />}
        />
      </div>

      <section className="panel p-5" aria-labelledby="dashboard-trend-heading">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="dashboard-trend-heading" className="text-lg font-semibold text-white">
            Daily plays
          </h2>
          <Link href="/admin/analytics" className="text-sm">
            View analytics
          </Link>
        </div>
        <AnalyticsChart points={overview.timeseries} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel p-5" aria-labelledby="recent-games-heading">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="recent-games-heading" className="text-lg font-semibold text-white">
              Recent games
            </h2>
            <Link href="/admin/games" className="text-sm">
              Manage games
            </Link>
          </div>
          {games.data.length > 0 ? (
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Game</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {games.data.map((game) => (
                  <tr key={game.id}>
                    <td>
                      <Link href={`/admin/games/${game.id}/edit`}>{game.title}</Link>
                    </td>
                    <td>
                      <StatusBadge status={game.status} />
                    </td>
                    <td className="whitespace-nowrap text-slate-400">{formatDate(game.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No games have been created yet.</p>
          )}
        </section>

        <section className="panel p-5" aria-labelledby="audit-heading">
          <h2 id="audit-heading" className="mb-4 text-lg font-semibold text-white">
            Recent admin activity
          </h2>
          {audit.data.length > 0 ? (
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Action</th>
                  <th scope="col">Subject</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {audit.data.map((entry) => (
                  <tr key={entry.id}>
                    <td className="font-mono text-xs">{entry.action}</td>
                    <td className="truncate">{entry.subject_id ?? "—"}</td>
                    <td className="whitespace-nowrap text-slate-400">{formatDate(entry.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No administrative actions recorded yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
