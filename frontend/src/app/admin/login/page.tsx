import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminLoginForm } from "@/features/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default async function AdminLoginPage() {
  const user = await getCurrentAdmin();
  if (user) redirect("/admin");

  return (
    <div className="page-shell flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-bold text-white">Admin sign in</h1>
        <p className="muted mb-6">Manage games, categories, tags and analytics.</p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
