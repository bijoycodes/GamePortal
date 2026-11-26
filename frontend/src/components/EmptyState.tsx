import Link from "next/link";
import type { ReactNode } from "react";
import { GridIcon } from "./icons";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: { label: string; href: string };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-brand-300">
        {icon ?? <GridIcon className="h-6 w-6" />}
      </div>
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <p className="muted max-w-md">{description}</p>
      {action && (
        <Link href={action.href} className="btn-primary mt-2">
          {action.label}
        </Link>
      )}
    </div>
  );
}
