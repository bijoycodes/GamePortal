import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { GameActions } from "@/features/admin/GameActions";
import { GameForm } from "@/features/admin/GameForm";
import { UploadPanel } from "@/features/admin/UploadPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { ApiError, serverFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import type { AdminGame, Category, Paginator, Tag } from "@/types/api";

export const dynamic = "force-dynamic";

interface EditGamePageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Edit game",
};

export default async function EditGamePage({ params }: EditGamePageProps) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const token = await getAdminToken();
  let game: AdminGame;
  try {
    game = await serverFetch<AdminGame>(`/api/admin/games/${id}`, { token, cache: "no-store" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const [categories, tags] = await Promise.all([
    serverFetch<Paginator<Category>>("/api/admin/categories", { query: { per_page: 50 }, token, cache: "no-store" }),
    serverFetch<Paginator<Tag>>("/api/admin/tags", { query: { per_page: 50 }, token, cache: "no-store" }),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Edit ${game.title}`}
        description={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400">/{game.slug}</span>
            <StatusBadge status={game.status} />
          </span>
        }
        actions={
          <Link href={`/games/${game.slug}`} className="btn-secondary" target="_blank">
            View player
          </Link>
        }
      />

      <GameForm game={game} categories={categories.data} tags={tags.data} />

      <div className="grid gap-6">
        <UploadPanel gameId={game.id} uploads={game.uploads ?? []} entryFile={game.entry_file} />
        <GameActions gameId={game.id} title={game.title} status={game.status} />
      </div>
    </div>
  );
}
