export function AdminLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="panel flex items-center gap-3 p-6 text-slate-400" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400" />
      {label}
    </div>
  );
}
