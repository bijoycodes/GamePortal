import type { ReactNode } from "react";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <AdminNav userName={user.name} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
