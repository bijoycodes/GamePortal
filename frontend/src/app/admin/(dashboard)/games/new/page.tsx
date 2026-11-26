import type { Metadata } from "next";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { GameForm } from "@/features/admin/GameForm";
import { serverFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import type { Category, Paginator, Tag } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New game",
};

export default async function NewGamePage() {
  const token = await getAdminToken();
  const [categories, tags] = await Promise.all([
    serverFetch<Paginator<Category>>("/api/admin/categories", { query: { per_page: 50 }, token, cache: "no-store" }),
    serverFetch<Paginator<Tag>>("/api/admin/tags", { query: { per_page: 50 }, token, cache: "no-store" }),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="New game"
        description="Create a draft, then upload a ZIP package and publish it."
      />
      <GameForm categories={categories.data} tags={tags.data} />
    </div>
  );
}
