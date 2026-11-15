import type { Metadata } from "next";
import { AutoRepairJsonLd } from "@/components/site/AutoRepairJsonLd";
import { ContactForm } from "@/components/site/InquiryForms";
import { ContactDetails, Directions, PageHeader, Section } from "@/components/site/Sections";
import { issueFormToken } from "@/lib/antispam";
import { fullAddress, getOpeningHours, getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `Kontakt i dojazd – ${settings.city}`,
    description: `Kontakt z warsztatem ${settings.brandName}: telefon, e-mail, godziny otwarcia i dojazd. ${fullAddress(settings)}. Napisz lub zadzwoń, sprawdź dojazd.`,
    alternates: { canonical: "/kontakt" },
  };
}

export default async function ContactPage() {
  const [settings, hours] = await Promise.all([getSettings(), getOpeningHours()]);
  return (
    <>
      <AutoRepairJsonLd />
      <PageHeader eyebrow="Kontakt" title={`Kontakt i dojazd – ${settings.city}`} lead={`${settings.brandName}, ${fullAddress(settings)}`} />
      <Section id="dane" title="Dane kontaktowe">
        <div className="grid gap-10 lg:grid-cols-2">
          <ContactDetails settings={settings} hours={hours} />
          <div className="card">
            <h3 className="mb-5 text-xl">Napisz do nas</h3>
            <ContactForm token={issueFormToken()} controller={settings.legalName} />
          </div>
        </div>
      </Section>
      <Section id="dojazd" title="Jak dojechać">
        <Directions settings={settings} />
      </Section>
    </>
  );
}
