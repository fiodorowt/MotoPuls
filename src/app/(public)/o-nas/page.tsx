import type { Metadata } from "next";
import { CtaBand, PageHeader, PhotoPlaceholder, Picture, Section } from "@/components/site/Sections";
import { getGallery } from "@/lib/catalog";
import { fullAddress, getContent, getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "O nas – warsztat samochodowy Moto Puls, Białe Błota",
  description:
    "Poznaj warsztat Moto Puls z Białych Błot pod Bydgoszczą. Indywidualne podejście, staranność i uczciwa wycena przed naprawą.",
  alternates: { canonical: "/o-nas" },
};

const PLACEHOLDERS = ["Zdjęcie warsztatu – wkrótce", "Zdjęcie stanowiska – wkrótce"];

export default async function AboutPage() {
  const [settings, content, gallery] = await Promise.all([getSettings(), getContent(), getGallery()]);
  const why = ["why_1", "why_2", "why_3", "why_4"].flatMap((key) => content[key] ?? []);
  return (
    <>
      <PageHeader eyebrow="O nas" title="Warsztat, w którym auto ma swój puls" lead={settings.about} />

      <Section id="firma" title="Kim jesteśmy">
        <div className="prose-mp">
          <p>
            {settings.brandName} to warsztat samochodowy prowadzony przez spółkę {settings.legalName}. Znajdziesz nas pod adresem:{" "}
            {fullAddress(settings)} – kilka minut od Bydgoszczy, tuż przy drodze S10.
          </p>
          <p>
            Naprawiamy samochody osobowe i dostawcze do 3,5 t, serwisujemy klimatyzację z oboma czynnikami
            chłodniczymi, wykonujemy diagnostykę komputerową, sprzedajemy części i opiekujemy się flotami firmowymi.
          </p>
        </div>
        {why.length > 0 && (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {why.map((item) => (
              <li key={item.title} className="card">
                <h3 className="text-lg">{item.title}</h3>
                <p className="text-muted mt-2 text-sm">{item.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="galeria" title="Warsztat w obiektywie">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <Picture
              name="klimatyzacja-stanowisko"
              widths={[530, 1060]}
              width={1060}
              height={670}
              sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw"
              alt="Stanowisko obsługi klimatyzacji ze stacją TEXA Konfort 715R"
              className="border-line aspect-[4/3] h-auto w-full rounded-xl border object-cover"
            />
          </li>
          {gallery.map((m) => (
            <li key={m.id}>
              <img
                src={`/media/${m.id}`}
                alt={m.alt}
                width={m.width}
                height={m.height}
                loading="lazy"
                decoding="async"
                className="border-line aspect-[4/3] h-auto w-full rounded-xl border object-cover"
              />
            </li>
          ))}
          {gallery.length === 0 &&
            PLACEHOLDERS.map((caption) => (
              <li key={caption}>
                <PhotoPlaceholder caption={caption} />
              </li>
            ))}
        </ul>
      </Section>

      <CtaBand settings={settings} />
    </>
  );
}
