import type { Metadata } from "next";
import { PartsForm } from "@/components/site/InquiryForms";
import { PageHeader, Section } from "@/components/site/Sections";
import { issueFormToken } from "@/lib/antispam";
import { getCategories } from "@/lib/catalog";
import { getContent, getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Części zamienne – dobór po numerze VIN, Białe Błota k. Bydgoszczy",
  description:
    "Sprzedaż części zamiennych do aut osobowych i dostawczych w Białych Błotach. Dobór po numerze VIN, części z montażem lub bez. Wyślij zapytanie o część.",
  alternates: { canonical: "/czesci-zamienne" },
};

export default async function PartsPage() {
  const [settings, content, categories] = await Promise.all([getSettings(), getContent(), getCategories()]);
  const category = categories.find((c) => c.slug === "czesci-zamienne");
  const intro = content.parts_intro;
  return (
    <>
      <PageHeader eyebrow="Części" title="Sprzedaż części zamiennych" lead={category?.description} />
      <Section id="zapytanie" title="Zapytaj o część">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="card">
            <PartsForm token={issueFormToken()} controller={settings.legalName} />
          </div>
          <aside className="text-muted space-y-4 text-sm">
            {intro && <p>{intro.body}</p>}
            <p>
              <strong className="text-fg">Gdzie znaleźć numer VIN?</strong> W dowodzie rejestracyjnym (pole E), na
              tabliczce znamionowej oraz zwykle w lewym dolnym rogu przedniej szyby.
            </p>
            <p>Część możesz odebrać w warsztacie albo od razu umówić jej montaż.</p>
          </aside>
        </div>
      </Section>
    </>
  );
}
