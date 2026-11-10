import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CtaBand, PageHeader, Picture, Section } from "@/components/site/Sections";
import { getCategories } from "@/lib/catalog";
import { formatPrice } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { formatDuration } from "@/lib/time";

export const metadata: Metadata = {
  title: "Serwis klimatyzacji Białe Błota i Bydgoszcz – R134a i R1234yf",
  description:
    "Serwis klimatyzacji samochodowej w Białych Błotach k. Bydgoszczy. Stacja TEXA Konfort 715R – obsługujemy czynnik R134a i R1234yf. Napełnianie, wykrywanie nieszczelności, ozonowanie, filtry kabinowe.",
  alternates: { canonical: "/klimatyzacja" },
};

const STEPS = [
  { title: "Odzysk czynnika", body: "Stacja odsysa i waży stary czynnik – wiadomo, ile go ubyło od ostatniego serwisu." },
  { title: "Próba próżniowa", body: "Układ jest osuszany i sprawdzany pod kątem szczelności, zanim trafi do niego nowy czynnik." },
  { title: "Olej i kontrast UV", body: "Uzupełniamy olej sprężarki; kontrast UV ułatwia późniejsze znalezienie ewentualnego wycieku." },
  { title: "Napełnienie", body: "Dokładnie tyle czynnika, ile przewiduje producent auta – ani mniej, ani więcej." },
  { title: "Kontrola pracy", body: "Sprawdzamy ciśnienia i temperaturę nawiewu, żeby potwierdzić, że układ chłodzi prawidłowo." },
];

export default async function AirConditioningPage() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const category = categories.find((c) => c.slug === "klimatyzacja");
  return (
    <>
      <PageHeader
        eyebrow="Klimatyzacja"
        title="Serwis klimatyzacji – czynnik R134a i R1234yf"
        lead={category?.description}
      />

      <Section id="texa" title="TEXA Konfort 715R „2 Gas Ready”">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <p className="text-muted text-lg">
              Nowsze samochody – w praktyce większość aut produkowanych od ok. 2017 roku – korzystają z czynnika
              R1234yf. Wymaga on innej stacji niż starszy R134a, dlatego nie każdy warsztat go obsługuje. Nasza
              stacja TEXA Konfort 715R pracuje z oboma czynnikami, w pełni automatycznie i z dokładnym ważeniem.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="card">
                <dt className="font-display text-xl font-extrabold">R134a</dt>
                <dd className="text-muted mt-1 text-sm">Większość aut wyprodukowanych przed 2017 rokiem.</dd>
              </div>
              <div className="card border-accent">
                <dt className="font-display text-xl font-extrabold">R1234yf</dt>
                <dd className="text-muted mt-1 text-sm">Auta nowsze, zwykle od ok. 2017 roku. Obsługujemy u nas na miejscu.</dd>
              </div>
            </dl>
            <p className="text-muted text-sm">
              Nie wiesz, jaki czynnik ma Twoje auto? Informację znajdziesz na naklejce pod maską. Przy rezerwacji
              możesz też zaznaczyć „nie wiem” – sprawdzimy to na miejscu.
            </p>
          </div>
          <Picture
            name="klimatyzacja-texa-715r"
            widths={[430]}
            width={430}
            height={680}
            sizes="(min-width: 1024px) 320px, 70vw"
            alt="Stacja TEXA Konfort 715R do obsługi klimatyzacji z czynnikiem R134a i R1234yf"
            className="border-line mx-auto h-auto w-full max-w-xs rounded-xl border"
            priority
          />
        </div>
      </Section>

      {category && category.services.length > 0 && (
        <Section id="zakres" title="Zakres usług">
          <ul className="grid gap-3 md:grid-cols-2">
            {category.services.map((s) => (
              <li key={s.id} className="card">
                <h3 className="text-base">{s.name}</h3>
                <p className="text-muted mt-1.5 text-sm">{s.description}</p>
                <p className="mt-3 flex flex-wrap gap-x-5 text-sm font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="clock" className="text-accent-text h-4 w-4" />
                    ok. {formatDuration(s.durationMin)}
                  </span>
                  <span>{formatPrice(s.priceFrom, s.priceTo)}</span>
                </p>
              </li>
            ))}
          </ul>
          <Link href="/rezerwacja?kategoria=klimatyzacja" className="btn btn-primary mt-8">
            <Icon name="calendar" />
            Umów serwis klimatyzacji
          </Link>
        </Section>
      )}

      <Section id="przebieg" title="Jak wygląda serwis klimatyzacji">
        <ol className="grid gap-3 md:grid-cols-5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card">
              <span className="font-display text-accent-text text-2xl font-extrabold" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="mt-2 text-base">{step.title}</h3>
              <p className="text-muted mt-1.5 text-sm">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <CtaBand settings={settings} title="Klimatyzacja przestała chłodzić?" />
    </>
  );
}
