import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/brand/Logo";
import { formatPhone, telHref } from "@/lib/labels";
import { fullAddress, type Settings } from "@/lib/settings";
import { CookieSettingsButton } from "./CookieBanner";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/uslugi", label: "Usługi" },
  { href: "/klimatyzacja", label: "Klimatyzacja" },
  { href: "/dla-firm", label: "Dla firm" },
  { href: "/czesci-zamienne", label: "Części" },
  { href: "/o-nas", label: "O nas" },
  { href: "/kontakt", label: "Kontakt" },
];

export function Header({ settings }: { settings: Settings }) {
  const phone = settings.phones[0];
  return (
    <header className="border-line bg-bg/95 sticky top-0 z-40 border-b backdrop-blur">
      <a href="#tresc" className="btn btn-primary sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">
        Przejdź do treści
      </a>
      <div className="container-page relative flex h-16 items-center justify-between gap-3">
        <Link href="/" className="text-fg shrink-0" aria-label={`${settings.brandName} – strona główna`}>
          <Logo className="h-9 w-auto sm:h-10" />
        </Link>
        <nav aria-label="Menu główne" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-fg hover:text-accent-text rounded-md px-3 py-2 text-[0.95rem] font-semibold no-underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          {phone && (
            <a href={telHref(phone)} className="text-fg hover:text-accent-text hidden items-center gap-2 px-2 font-semibold no-underline xl:inline-flex">
              <Icon name="phone" className="text-accent-text h-5 w-5" />
              {formatPhone(phone)}
            </a>
          )}
          <ThemeToggle />
          <Link href="/rezerwacja" className="btn btn-primary btn-sm hidden md:inline-flex">
            Umów wizytę
          </Link>
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}

export function Footer({ settings }: { settings: Settings }) {
  return (
    <footer className="border-line bg-surface mt-20 border-t pb-24 md:pb-0">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div>
          <Logo className="text-fg h-10 w-auto" />
          <p className="text-muted mt-4 text-sm">
            {settings.legalName}
            <br />
            NIP {settings.nip}
          </p>
        </div>
        <div>
          <h2 className="text-base">Kontakt</h2>
          <address className="text-muted mt-3 space-y-2 text-sm not-italic">
            <p>{fullAddress(settings)}</p>
            <p className="flex flex-col gap-1">
              {settings.phones.map((p) => (
                <a key={p} href={telHref(p)} className="link">
                  {formatPhone(p)}
                </a>
              ))}
            </p>
            <p>
              <a href={`mailto:${settings.email}`} className="link break-all">
                {settings.email}
              </a>
            </p>
            <p>
              <a href={settings.facebookUrl} className="link inline-flex items-center gap-1.5" rel="noopener noreferrer" target="_blank">
                <Icon name="facebook" className="h-4 w-4" />
                Facebook<span className="sr-only"> (otwiera się w nowej karcie)</span>
              </a>
            </p>
          </address>
        </div>
        <nav aria-label="Stopka">
          <h2 className="text-base">Na skróty</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/rezerwacja" className="link">
                Rezerwacja online
              </Link>
            </li>
            <li>
              <Link href="/regulamin-rezerwacji" className="link">
                Regulamin rezerwacji
              </Link>
            </li>
            <li>
              <Link href="/polityka-prywatnosci" className="link">
                Polityka prywatności
              </Link>
            </li>
            <li>
              <CookieSettingsButton />
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-line border-t">
        <p className="container-page text-muted py-4 text-xs">
          © {new Date().getFullYear()} {settings.brandName}. Wszelkie prawa zastrzeżone.
        </p>
      </div>
    </footer>
  );
}

/** Przyklejony pasek na telefonach: dwa najważniejsze działania zawsze pod kciukiem. */
export function MobileBar({ settings }: { settings: Settings }) {
  const phone = settings.phones[0];
  return (
    <div className="border-line bg-bg fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t p-2 md:hidden">
      {phone && (
        <a href={telHref(phone)} className="btn btn-secondary">
          <Icon name="phone" />
          Zadzwoń
        </a>
      )}
      <Link href="/rezerwacja" className="btn btn-primary">
        <Icon name="calendar" />
        Umów wizytę
      </Link>
    </div>
  );
}
