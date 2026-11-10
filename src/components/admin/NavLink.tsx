"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold whitespace-nowrap no-underline ${
        active ? "bg-accent text-accent-ink" : "text-fg hover:bg-surface-2"
      }`}
    >
      {children}
    </Link>
  );
}
