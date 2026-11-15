"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { openConsentSettings, setConsent, useConsent, useConsentSettingsOpen } from "@/lib/client-store";

/**
 * Baner zgody. Domyślnie nic poza niezbędnymi cookies nie jest aktywne;
 * oba przyciski mają tę samą wagę wizualną, a decyzję można zmienić w stopce.
 * Kompaktowy na telefonie (MP-039): krótki tekst, przyciski obok siebie, zajmuje mniej niż 25% ekranu.
 */
export function CookieBanner() {
  const consent = useConsent();
  const forcedOpen = useConsentSettingsOpen();
  const visible = !(consent === "pending" || (consent !== "unset" && !forcedOpen));
  const ref = useRef<HTMLElement>(null);

  // Fokus na banerze po pojawieniu się (bez pułapki: Tab działa normalnie), a po decyzji wraca do treści
  // albo do elementu, z którego baner otwarto (np. „Ustawienia cookies” w stopce).
  useEffect(() => {
    if (!visible) return;
    const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    ref.current?.focus({ preventScroll: true });
    return () => {
      const target = opener && document.contains(opener) ? opener : document.getElementById("tresc");
      target?.focus({ preventScroll: true });
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label="Ustawienia prywatności"
      className="border-line bg-surface fixed inset-x-2 bottom-[4.75rem] z-50 mx-auto max-w-3xl rounded-xl border p-3 shadow-2xl outline-none sm:p-5 md:bottom-4"
    >
      <h2 className="sr-only sm:not-sr-only sm:text-lg">Prywatność i pliki cookie</h2>
      <p className="text-muted text-sm sm:mt-2">
        Używamy tylko niezbędnych plików cookie – bez analityki i reklam. Mapa dojazdu (OpenStreetMap) wczyta się za
        Twoją zgodą i przekaże jej dostawcy Twój adres IP.{" "}
        <Link href="/polityka-prywatnosci" className="link">
          Szczegóły
        </Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
        <button type="button" className="btn btn-secondary px-3 text-sm sm:text-base" onClick={() => setConsent("necessary")}>
          Tylko niezbędne
        </button>
        <button type="button" className="btn btn-secondary px-3 text-sm sm:text-base" onClick={() => setConsent("all")}>
          Zgoda także na mapę
        </button>
      </div>
    </section>
  );
}

export function CookieSettingsButton() {
  return (
    <button type="button" className="link cursor-pointer" onClick={openConsentSettings}>
      Ustawienia cookies
    </button>
  );
}
