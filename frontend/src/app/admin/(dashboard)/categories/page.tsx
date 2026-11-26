import type { Metadata } from "next";
import { AdminCategoriesPanel } from "@/features/admin/AdminCategoriesPanel";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage categories",
};

export default function AdminCategoriesPage() {
  return (
    <div>
      <AdminPageHeader
        title="Categories"
        description="Organise games into browseable genres. Categories in use cannot be deleted."
      />
      <AdminCategoriesPanel />
    </div>
  );
}
