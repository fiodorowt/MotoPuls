import type { Metadata } from "next";
import Link from "next/link";
import { Icon, isIconName } from "@/components/Icon";
import { HeroPulse, PulseDivider } from "@/components/brand/Pulse";
import { ContactDetails, CtaBand, Directions, Picture, Section, categoryHref } from "@/components/site/Sections";
import { getCategories, getTestimonials } from "@/lib/catalog";
import { formatPhone, telHref } from "@/lib/labels";
import { getContent, getOpeningHours, getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: { absolute: "Moto Puls – warsztat samochodowy Białe Błota k. Bydgoszczy | mechanik, klimatyzacja" },
  description:
    "Warsztat samochodowy Moto Puls w Białych Błotach pod Bydgoszczą: mechanika i elektromechanika, serwis klimatyzacji R134a i R1234yf, diagnostyka komputerowa, części i obsługa flot. Umów wizytę online.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [settings, hours, content, categories, testimonials] = await Promise.all([
    getSettings(),
    getOpeningHours(),
    getContent(),
    getCategories(),
    getTestimonials(),
  ]);
  const phone = settings.phones[0];
  const why = ["why_1", "why_2", "why_3", "why_4"].flatMap((key) => content[key] ?? []);
  const ac = content.ac_highlight;
  const fleet = content.fleet_intro;

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-page pt-12 pb-6 sm:pt-20">
          <p className="eyebrow">{settings.tagline}</p>
          <h1 className="mt-4 max-w-4xl text-4xl sm:text-6xl">
            Warsztat samochodowy w&nbsp;Białych Błotach pod Bydgoszczą
          </h1>
          <p className="text-muted mt-6 max-w-2xl text-lg">
            Mechanika, elektromechanika, klimatyzacja i diagnostyka komputerowa aut osobowych i dostawczych do
            3,5&nbsp;t. Wybierz termin online – bez dzwonienia i czekania.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/rezerwacja" className="btn btn-primary">
              <Icon name="calendar" />
              Umów wizytę online
            </Link>
            {phone && (
              <a href={telHref(phone)} className="btn btn-secondary">
                <Icon name="phone" />
                {formatPhone(phone)}
              </a>
            )}
          </div>
        </div>
        <HeroPulse className="mt-4 h-20 sm:h-28" />
      </section>

      <Section id="oferta" eyebrow="Oferta" title="Czym się zajmujemy">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={categoryHref(c.slug)} className="card hover:border-accent group flex h-full flex-col no-underline transition-colors">
                <Icon name={isIconName(c.icon) ? c.icon : "wrench"} className="text-accent-text h-9 w-9" />
                <h3 className="mt-4 text-lg">{c.name}</h3>
                <p className="text-muted mt-2 flex-1 text-sm">{c.summary}</p>
                <span className="text-accent-text mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                  Zobacz szczegóły
                  <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {ac && (
        <Section id="klimatyzacja" eyebrow="Wyróżnik" title={ac.title}>
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="text-muted text-lg">{ac.body}</p>
              <ul className="mt-6 space-y-2">
                {["Czynnik R134a i R1234yf", "Wykrywanie nieszczelności", "Ozonowanie i odgrzybianie", "Wymiana filtrów kabinowych"].map((item) => (
                  <li key={item} className="flex items-center gap-3 font-semibold">
                    <Icon name="check" className="text-accent-text h-5 w-5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/rezerwacja?kategoria=klimatyzacja" className="btn btn-primary">
                  Umów serwis klimatyzacji
                </Link>
                <Link href="/klimatyzacja" className="btn btn-secondary">
                  Więcej o klimatyzacji
                </Link>
              </div>
            </div>
            <Picture
              name="klimatyzacja-stanowisko"
              widths={[530, 1060]}
              width={1060}
              height={670}
              sizes="(min-width: 1024px) 530px, 100vw"
              alt="Stacja do obsługi klimatyzacji TEXA Konfort 715R w warsztacie Moto Puls"
              className="border-line h-auto w-full rounded-xl border"
            />
          </div>
        </Section>
      )}

      {why.length > 0 && (
        <Section id="dlaczego" eyebrow="Dlaczego Moto Puls" title="Naprawiamy tak, jak sami chcielibyśmy być obsłużeni">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {why.map((item) => (
              <li key={item.title} className="card">
                <h3 className="text-lg">{item.title}</h3>
                <p className="text-muted mt-2 text-sm">{item.body}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {fleet && (
        <Section id="floty" eyebrow="Dla firm" title={fleet.title}>
          <div className="card flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <p className="text-muted max-w-2xl text-lg">{fleet.body}</p>
            <Link href="/dla-firm" className="btn btn-secondary shrink-0">
              <Icon name="fleet" />
              Oferta dla flot
            </Link>
          </div>
        </Section>
      )}

      {testimonials.length > 0 && (
        <Section id="opinie" eyebrow="Opinie" title="Co mówią klienci">
          <ul className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <li key={t.id} className="card">
                <figure>
                  <p className="text-accent-text" role="img" aria-label={`Ocena ${t.rating} na 5`}>
                    {"★".repeat(t.rating)}
                    <span className="text-line-strong">{"★".repeat(5 - t.rating)}</span>
                  </p>
                  <blockquote className="mt-3">{t.text}</blockquote>
                  <figcaption className="text-muted mt-3 text-sm">— {t.author}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="container-page">
        <PulseDivider />
      </div>

      <Section id="dojazd" eyebrow="Dojazd" title="Jak do nas trafić">
        <Directions settings={settings} />
      </Section>

      <Section id="kontakt" eyebrow="Kontakt" title="Zadzwoń, napisz albo przyjedź">
        <ContactDetails settings={settings} hours={hours} />
      </Section>

      <CtaBand settings={settings} />
    </>
  );
}
