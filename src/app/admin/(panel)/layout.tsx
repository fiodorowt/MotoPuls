import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "@/components/admin/NavLink";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/labels";
import { logout } from "../(auth)/actions";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s – panel Moto Puls" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Pulpit" },
  { href: "/admin/kalendarz", label: "Kalendarz" },
  { href: "/admin/rezerwacje", label: "Rezerwacje" },
  { href: "/admin/klienci", label: "Klienci" },
  { href: "/admin/floty", label: "Floty" },
  { href: "/admin/zapytania", label: "Zapytania" },
];

const OWNER_NAV = [
  { href: "/admin/uslugi", label: "Usługi" },
  { href: "/admin/ustawienia", label: "Ustawienia" },
  { href: "/admin/tresci", label: "Treści" },
  { href: "/admin/szablony", label: "E-maile" },
  { href: "/admin/uzytkownicy", label: "Użytkownicy" },
  { href: "/admin/dziennik", label: "Dziennik" },
];

export default async function PanelLayout({ children }: { children: ReactNode }) {
  // Bramka autoryzacji dla całego panelu; każda strona i akcja sprawdza uprawnienia ponownie.
  const user = await requireUser();
  const newInquiries = await db.inquiry.count({ where: { status: "NEW" } });
  const items = user.role === "OWNER" ? [...NAV, ...OWNER_NAV] : NAV;

  return (
    <div className="min-h-screen">
      <a href="#tresc" className="btn btn-primary sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">
        Przejdź do treści
      </a>
      <header className="border-line bg-surface border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" aria-label="Moto Puls – pulpit panelu" className="text-fg">
            <Logo className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/admin/konto" className="text-fg hover:bg-surface-2 inline-flex min-h-11 items-center rounded-md px-3 no-underline">
              {user.name} <span className="text-muted ml-1.5">({ROLE_LABEL[user.role]})</span>
            </Link>
            <ThemeToggle />
            <form action={logout}>
              <button type="submit" className="btn btn-secondary btn-sm">
                Wyloguj
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Panel" className="mx-auto max-w-7xl overflow-x-auto px-4 pb-2">
          <ul className="flex gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>
                  {item.label}
                  {item.href === "/admin/zapytania" && newInquiries > 0 && (
                    <span className="badge ml-2" aria-label={`nowe: ${newInquiries}`}>
                      {newInquiries}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="tresc" className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
