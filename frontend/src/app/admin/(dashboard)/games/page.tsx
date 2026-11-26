import type { Metadata } from "next";
import Link from "next/link";
import { AdminGamesPanel } from "@/features/admin/AdminGamesPanel";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { PlusIcon } from "@/components/icons";
import { serverFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import type { Category, Paginator } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage games",
};

export default async function AdminGamesPage() {
  const token = await getAdminToken();
  const categories = await serverFetch<Paginator<Category>>("/api/admin/categories", {
    query: { per_page: 50 },
    token,
    cache: "no-store",
  });

  return (
    <div>
      <AdminPageHeader
        title="Games"
        description="Create, publish and manage every game in the catalogue."
        actions={
          <Link href="/admin/games/new" className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            New game
          </Link>
        }
      />
      <AdminGamesPanel
        categories={categories.data.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
        }))}
      />
    </div>
  );
}
