"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { browserFetch } from "@/lib/api";
import { AlertIcon, ChartIcon, GridIcon, LogoutIcon, PlusIcon, TagIcon, UploadIcon } from "./icons";

const links = [
  { href: "/admin", label: "Dashboard", icon: GridIcon, exact: true },
  { href: "/admin/games", label: "Games", icon: UploadIcon, exact: false },
  { href: "/admin/games/new", label: "New game", icon: PlusIcon, exact: true },
  { href: "/admin/categories", label: "Categories", icon: GridIcon, exact: false },
  { href: "/admin/tags", label: "Tags", icon: TagIcon, exact: false },
  { href: "/admin/analytics", label: "Analytics", icon: ChartIcon, exact: false },
];

export function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout(): Promise<void> {
    try {
      await browserFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The local cookie is cleared by the server route even if revocation fails.
    }
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="panel flex h-full flex-col gap-4 p-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Signed in as</p>
        <p className="truncate text-sm font-medium text-slate-100">{userName}</p>
      </div>
      <nav aria-label="Admin navigation" className="flex flex-1 flex-col gap-1">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline ${
                active
                  ? "bg-brand-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <button type="button" onClick={logout} className="btn-secondary justify-start">
        <LogoutIcon className="h-4 w-4" />
        Sign out
      </button>
      <p className="muted flex items-start gap-1.5 text-xs">
        <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Administrative actions are recorded in the audit log.
      </p>
    </aside>
  );
}
