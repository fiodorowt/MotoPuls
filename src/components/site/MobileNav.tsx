"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="text-fg hover:bg-surface-2 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Zamknij menu" : "Otwórz menu"}
        onClick={() => setOpen(!open)}
      >
        <Icon name={open ? "close" : "menu"} className="h-6 w-6" />
      </button>
      <nav
        id="mobile-menu"
        aria-label="Menu główne"
        hidden={!open}
        className="border-line bg-bg absolute inset-x-0 top-full border-b shadow-lg"
      >
        <ul className="container-page flex flex-col py-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-fg hover:text-accent-text block py-3 text-lg font-semibold no-underline"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
