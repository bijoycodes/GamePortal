import type { ReactNode } from "react";

export interface KpiCardProps {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
}

export function KpiCard({ label, value, detail, icon }: KpiCardProps) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {icon && <span className="text-brand-300">{icon}</span>}
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      {detail && <p className="muted mt-1">{detail}</p>}
    </div>
  );
}
