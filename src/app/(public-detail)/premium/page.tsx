import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { PremiumForm } from "@/components/site/InquiryForms";
import { CtaBand, PageHeader, Section } from "@/components/site/Sections";
import { issueFormToken } from "@/lib/antispam";
import { formatPhone, telHref } from "@/lib/labels";
import { getSettings } from "@/lib/settings";

// Trasa z notFound() leży w grupie (public-detail), żeby wyłączony Premium dawał prawdziwe 404 (patrz docs/testy.md).
// Treści marketingowe poniżej: DO ZATWIERDZENIA przez właściciela (bez obietnic czasu, ceny i gwarancji).
// Właściciel włącza stronę w panelu (Ustawienia > Moto Puls Premium) dopiero po zatwierdzeniu.
export const metadata: Metadata = {
  title: "Moto Puls Premium – obsługa organizowana indywidualnie",
  description: "Moto Puls Premium: zgłoszenia z indywidualnym potwierdzeniem właściciela, poza standardowym harmonogramem. Białe Błota k. Bydgoszczy.",
  alternates: { canonical: "/premium" },
};

const POINTS = [
  { title: "Indywidualne podejście", body: "Każde zgłoszenie czyta właściciel warsztatu i wraca do Ciebie z propozycją dopasowaną do Twojej sytuacji." },
  { title: "Poza standardowym harmonogramem", body: "Obsługa Premium jest organizowana osobno, więc nie korzysta z kalendarza rezerwacji online." },
  { title: "Termin ustalamy razem", body: "Zgłoszenie nie rezerwuje terminu. Wizyta jest umówiona dopiero po indywidualnym potwierdzeniu przez właściciela." },
];

export default async function PremiumPage() {
  const settings = await getSettings();
  if (!settings.premiumEnabled) notFound();
  const phone = settings.phones[0];
  return (
    <>
      <PageHeader
        eyebrow="Moto Puls Premium"
        title="Obsługa organizowana indywidualnie"
        lead="Dla spraw, które wymagają osobnego ustalenia. Opisz, czego potrzebujesz, a właściciel warsztatu skontaktuje się z Tobą."
      />

      <Section id="zalety" title="Jak działa Premium">
        <ul className="grid gap-4 md:grid-cols-3">
          {POINTS.map((p) => (
            <li key={p.title} className="card">
              <Icon name="check" className="text-accent-text h-6 w-6" />
              <h3 className="mt-3 text-lg">{p.title}</h3>
              <p className="text-muted mt-2 text-sm">{p.body}</p>
            </li>
          ))}
          <li className="card">
            <Icon name="check" className="text-accent-text h-6 w-6" />
            <h3 className="mt-3 text-lg">Cena</h3>
            <p className="text-muted mt-2 text-sm">{settings.premiumPriceNote}</p>
          </li>
        </ul>
      </Section>

      <Section id="zgloszenie" title="Zgłoszenie Premium">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="card">
            <PremiumForm
              token={issueFormToken()}
              controller={settings.legalName}
              pickupEnabled={settings.premiumPickupEnabled}
              pickupNote={settings.premiumPickupNote}
            />
          </div>
          <aside className="text-muted space-y-4 text-sm">
            <p>Wolisz standardową wizytę w wolnym terminie? Skorzystaj z rezerwacji online.</p>
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

      <CtaBand settings={settings} showPremium={false} />
    </>
  );
}
