import type { Metadata } from "next";
import { BookingWizard, type WizardCategory } from "@/components/booking/BookingWizard";
import { PageHeader } from "@/components/site/Sections";
import { issueFormToken } from "@/lib/antispam";
import { getCategories } from "@/lib/catalog";
import { formatPhone, telHref } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { warsawDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Rezerwacja wizyty online – warsztat Moto Puls, Białe Błota",
  description:
    "Umów wizytę w warsztacie Moto Puls online: wybierz usługę, podaj dane auta i zarezerwuj wolny termin. Białe Błota k. Bydgoszczy.",
  alternates: { canonical: "/rezerwacja" },
};

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ kategoria?: string }> }) {
  const [settings, categories, params] = await Promise.all([getSettings(), getCategories(), searchParams]);
  // Kategoria z linku (np. z podstrony klimatyzacji) trafia na początek listy.
  const wizardCategories: WizardCategory[] = categories
    .filter((c) => c.services.length > 0)
    .sort((a, b) => Number(b.slug === params.kategoria) - Number(a.slug === params.kategoria))
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      services: c.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMin: s.durationMin,
        priceFrom: s.priceFrom,
        priceTo: s.priceTo,
        requiresRefrigerant: s.requiresRefrigerant,
      })),
    }));
  const phone = settings.phones[0];

  return (
    <>
      <PageHeader
        eyebrow="Rezerwacja"
        title="Umów wizytę online"
        lead={
          <>
            Pięć krótkich kroków.
            {phone && (
              <>
                {" "}
                Wolisz telefon? Zadzwoń:{" "}
                <a href={telHref(phone)} className="link font-bold">
                  {formatPhone(phone)}
                </a>
                .
              </>
            )}
          </>
        }
      />
      <div className="container-page pb-16">
        <BookingWizard
          categories={wizardCategories}
          token={issueFormToken()}
          controller={settings.legalName}
          autoConfirm={settings.autoConfirm}
          today={warsawDate(new Date())}
        />
      </div>
    </>
  );
}
