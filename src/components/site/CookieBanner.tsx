"use client";

import Link from "next/link";
import { openConsentSettings, setConsent, useConsent, useConsentSettingsOpen } from "@/lib/client-store";

/**
 * Baner zgody. Domyślnie nic poza niezbędnymi cookies nie jest aktywne;
 * oba przyciski mają tę samą wagę wizualną, a decyzję można zmienić w stopce.
 */
export function CookieBanner() {
  const consent = useConsent();
  const forcedOpen = useConsentSettingsOpen();
  if (consent === "pending" || (consent !== "unset" && !forcedOpen)) return null;

  return (
    <section
      aria-label="Ustawienia prywatności"
      className="border-line bg-surface fixed inset-x-2 bottom-[4.75rem] z-50 mx-auto max-w-3xl rounded-xl border p-4 shadow-2xl sm:p-5 md:bottom-4"
    >
      <h2 className="text-lg">Prywatność i pliki cookie</h2>
      <p className="text-muted mt-2 text-sm">
        Używamy tylko niezbędnych plików cookie (zapamiętanie tej decyzji, logowanie do panelu). Nie stosujemy
        analityki ani reklam. Mapa dojazdu pochodzi z OpenStreetMap – wczytamy ją dopiero za Twoją zgodą, bo wiąże się
        to z przekazaniem Twojego adresu IP zewnętrznemu dostawcy. Szczegóły w{" "}
        <Link href="/polityka-prywatnosci" className="link">
          polityce prywatności
        </Link>
        .
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" className="btn btn-secondary" onClick={() => setConsent("necessary")}>
          Tylko niezbędne
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setConsent("all")}>
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
