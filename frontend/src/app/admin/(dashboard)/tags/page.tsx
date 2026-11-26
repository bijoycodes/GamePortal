import type { Metadata } from "next";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { AdminTagsPanel } from "@/features/admin/AdminTagsPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage tags",
};

export default function AdminTagsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Tags"
        description="Add short labels that players can use to filter the catalogue."
      />
      <AdminTagsPanel />
    </div>
  );
}
