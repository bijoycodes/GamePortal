import Link from "next/link";
import { GamepadMark } from "./GamepadMark";
import { getPublicEnv } from "@/lib/env";

const links = [
  { href: "/games", label: "Games" },
  { href: "/categories", label: "Categories" },
  { href: "/admin", label: "Admin" },
];

export function Header() {
  const { siteName } = getPublicEnv();

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-50 no-underline">
          <GamepadMark className="h-7 w-7 text-brand-400" />
          <span>{siteName}</span>
        </Link>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 no-underline hover:bg-slate-800 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
