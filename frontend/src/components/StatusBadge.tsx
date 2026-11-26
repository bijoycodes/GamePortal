import type { GameStatus, UploadStatus } from "@/types/api";

type BadgeStatus = GameStatus | UploadStatus;

const styles: Record<BadgeStatus, string> = {
  draft: "border-slate-600 bg-slate-800 text-slate-300",
  published: "border-emerald-800 bg-emerald-950 text-emerald-300",
  disabled: "border-amber-800 bg-amber-950 text-amber-300",
  archived: "border-slate-700 bg-slate-900 text-slate-400",
  pending: "border-sky-800 bg-sky-950 text-sky-300",
  processing: "border-sky-800 bg-sky-950 text-sky-300",
  failed: "border-red-800 bg-red-950 text-red-300",
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
