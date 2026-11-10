import type { Metadata } from "next";
import Link from "next/link";
import { Icon, isIconName } from "@/components/Icon";
import { CtaBand, PageHeader, categoryHref } from "@/components/site/Sections";
import { getCategories } from "@/lib/catalog";
import { formatPrice } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { formatDuration } from "@/lib/time";

export const metadata: Metadata = {
  title: "Usługi – mechanik Białe Błota, serwis aut osobowych i dostawczych",
  description:
    "Zakres usług warsztatu Moto Puls w Białych Błotach k. Bydgoszczy: naprawy aut osobowych i dostawczych do 3,5 t, mechanika, elektromechanika, klimatyzacja, diagnostyka komputerowa.",
  alternates: { canonical: "/uslugi" },
};

export default async function ServicesPage() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  return (
    <>
      <PageHeader
        eyebrow="Usługi"
        title="Mechanik w Białych Błotach – pełny zakres usług"
        lead="Obsługujemy samochody osobowe i dostawcze do 3,5 t wszystkich marek. Poniżej znajdziesz zakres prac i orientacyjny czas wizyty."
      />
      <div className="container-page">
        <p className="card text-muted text-sm">{settings.pricingNote}</p>
      </div>
      {categories.map((c) => (
        <section key={c.id} id={c.slug} className="container-page scroll-mt-24 py-8" aria-labelledby={`${c.slug}-h`}>
          <div className="flex items-start gap-4">
            <Icon name={isIconName(c.icon) ? c.icon : "wrench"} className="text-accent-text mt-1 h-9 w-9 shrink-0" />
            <div>
              <h2 id={`${c.slug}-h`} className="text-2xl sm:text-3xl">
                {c.name}
              </h2>
              <p className="text-muted mt-3 max-w-3xl">{c.description}</p>
            </div>
          </div>
          {c.services.length > 0 ? (
            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {c.services.map((s) => (
                <li key={s.id} className="card">
                  <h3 className="text-base">{s.name}</h3>
                  <p className="text-muted mt-1.5 text-sm">{s.description}</p>
                  <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="clock" className="text-accent-text h-4 w-4" />
                      ok. {formatDuration(s.durationMin)}
                    </span>
                    <span>{formatPrice(s.priceFrom, s.priceTo)}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Link href={categoryHref(c.slug)} className="btn btn-secondary mt-6">
              Przejdź do zapytania
              <Icon name="arrow" />
            </Link>
          )}
        </section>
      ))}
      <CtaBand settings={settings} />
    </>
  );
}
