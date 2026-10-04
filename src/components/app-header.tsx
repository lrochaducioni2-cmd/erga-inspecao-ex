"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavLink = { href: string; label: string };

export function AppHeader({ userName, links }: { userName: string; links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <header className="bg-brand text-white print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-3 sm:px-6">
        <Link href="/projetos" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-ink">Ex</span>
          <span className="text-base font-bold">Inspeção Ex</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm opacity-90 sm:inline">{userName}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="h-10 rounded-lg px-3 text-sm font-semibold hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2 sm:px-5" aria-label="Principal">
        {links.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 shrink-0 items-center rounded-lg px-4 text-[15px] font-semibold ${
                active ? "bg-white/15" : "opacity-85 hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
