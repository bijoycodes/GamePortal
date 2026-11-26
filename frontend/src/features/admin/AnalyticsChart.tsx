import { formatDate, formatNumber } from "@/lib/format";
import type { TimeSeriesPoint } from "@/types/api";

export function AnalyticsChart({ points }: { points: TimeSeriesPoint[] }) {
  if (points.length === 0) {
    return <p className="muted">No plays recorded in this period.</p>;
  }

  const max = Math.max(1, ...points.map((point) => point.plays));

  return (
    <div>
      <div
        className="flex h-48 items-end gap-1 border-b border-slate-700 px-1"
        role="img"
        aria-label={`Daily plays chart with ${points.length} days, peak ${max} plays`}
      >
        {points.map((point) => (
          <div
            key={point.date}
            className="group relative flex-1 rounded-t bg-brand-600/80 transition-colors hover:bg-brand-400"
            style={{ height: `${Math.max(2, (point.plays / max) * 100)}%` }}
          >
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 group-hover:block">
              {formatDate(point.date)}: {formatNumber(point.plays)} plays
            </span>
          </div>
        ))}
      </div>
      <div className="muted mt-2 flex justify-between text-xs">
        <span>{formatDate(points[0].date)}</span>
        <span>{formatDate(points[points.length - 1].date)}</span>
      </div>
      <table className="sr-only">
        <caption>Daily plays</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Plays</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              <td>{point.plays}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
