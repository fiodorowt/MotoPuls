import type { Metadata } from "next";
import { ContactForm } from "@/components/site/InquiryForms";
import { ContactDetails, Directions, PageHeader, Section } from "@/components/site/Sections";
import { issueFormToken } from "@/lib/antispam";
import { fullAddress, getOpeningHours, getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Kontakt i dojazd – Moto Puls, ul. Modra 26, Białe Błota",
  description:
    "Kontakt z warsztatem Moto Puls: telefon, e-mail, godziny otwarcia i dojazd. Białe Błota pod Bydgoszczą, przy drodze S10.",
  alternates: { canonical: "/kontakt" },
};

export default async function ContactPage() {
  const [settings, hours] = await Promise.all([getSettings(), getOpeningHours()]);
  return (
    <>
      <PageHeader eyebrow="Kontakt" title="Kontakt i dojazd" lead={`${settings.brandName}, ${fullAddress(settings)}`} />
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
