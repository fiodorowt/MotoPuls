import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { FleetForm } from "@/components/site/InquiryForms";
import { PageHeader, Section } from "@/components/site/Sections";
import { issueFormToken } from "@/lib/antispam";
import { getCategories } from "@/lib/catalog";
import { formatPhone, telHref } from "@/lib/labels";
import { getContent, getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Obsługa flot samochodowych – serwis aut firmowych Bydgoszcz i okolice",
  description:
    "Serwis flotowy Moto Puls w Białych Błotach k. Bydgoszczy: stałe warunki współpracy, priorytetowe terminy, historia każdego pojazdu. Auta osobowe i dostawcze do 3,5 t. Wyślij zapytanie.",
  alternates: { canonical: "/dla-firm" },
};

const BENEFITS = [
  { title: "Stałe warunki", body: "Ustalamy zasady rozliczeń i zakres obsługi raz – bez negocjowania każdej wizyty." },
  { title: "Priorytetowe terminy", body: "Auto firmowe ma zarabiać. Staramy się skrócić przestój do minimum." },
  { title: "Historia pojazdów", body: "Prowadzimy historię napraw każdego auta z floty i przypominamy o przeglądach." },
  { title: "Jeden warsztat", body: "Mechanika, elektryka, klimatyzacja, diagnostyka i części w jednym miejscu." },
];

export default async function FleetPage() {
  const [settings, content, categories] = await Promise.all([getSettings(), getContent(), getCategories()]);
  const category = categories.find((c) => c.slug === "floty");
  const intro = content.fleet_intro;
  const phone = settings.phones[0];
  return (
    <>
      <PageHeader eyebrow="Dla firm" title="Obsługa flot samochodowych" lead={category?.description ?? intro?.body} />

      <Section id="korzysci" title={intro?.title ?? "Serwis aut firmowych"}>
        {intro && <p className="text-muted -mt-4 mb-8 max-w-3xl text-lg">{intro.body}</p>}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <li key={b.title} className="card">
              <Icon name="check" className="text-accent-text h-6 w-6" />
              <h3 className="mt-3 text-lg">{b.title}</h3>
              <p className="text-muted mt-2 text-sm">{b.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="zapytanie" title="Zapytanie ofertowe">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="card">
            <FleetForm token={issueFormToken()} controller={settings.legalName} />
          </div>
          <aside className="text-muted space-y-4 text-sm">
            <p>
              Obsługa flot nie wymaga rezerwowania pojedynczych terminów w kalendarzu – opisz swoje potrzeby, a
              przygotujemy propozycję współpracy i skontaktujemy się z Tobą.
            </p>
            {phone && (
              <p>
                Wolisz porozmawiać? Zadzwoń:{" "}
                <a href={telHref(phone)} className="link font-bold">
                  {formatPhone(phone)}
                </a>
              </p>
            )}
          </aside>
        </div>
      </Section>
    </>
  );
}
