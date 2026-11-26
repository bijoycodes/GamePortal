import Link from "next/link";
import { getPublicEnv } from "@/lib/env";

export function Footer() {
  const { siteName } = getPublicEnv();

  return (
    <footer className="mt-12 border-t border-slate-800 bg-slate-950">
      <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-slate-400">
        <p>&copy; {new Date().getUTCFullYear()} {siteName}. Play games from their creators with permission.</p>
        <nav aria-label="Footer navigation" className="flex gap-4">
          <Link href="/games">Browse games</Link>
          <Link href="/categories">Categories</Link>
        </nav>
      </div>
    </footer>
  );
}
