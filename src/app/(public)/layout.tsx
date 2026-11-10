import { headers } from "next/headers";
import { Footer, Header, MobileBar } from "@/components/site/Chrome";
import { CookieBanner } from "@/components/site/CookieBanner";
import { env } from "@/lib/env";
import { telHref } from "@/lib/labels";
import { getOpeningHours, getSettings } from "@/lib/settings";

const SCHEMA_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, hours, nonce] = await Promise.all([
    getSettings(),
    getOpeningHours(),
    headers().then((h) => h.get("x-nonce") ?? undefined),
  ]);
  const url = env().APP_URL;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "@id": `${url}/#warsztat`,
    name: settings.brandName,
    legalName: settings.legalName,
    url,
    image: `${url}/og.png`,
    logo: `${url}/icon.svg`,
    telephone: settings.phones.map((p) => telHref(p).replace("tel:", "")),
    email: settings.email,
    vatID: settings.nip,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.street,
      postalCode: settings.postalCode,
      addressLocality: settings.city,
      addressRegion: "kujawsko-pomorskie",
      addressCountry: "PL",
    },
    geo: { "@type": "GeoCoordinates", latitude: settings.latitude, longitude: settings.longitude },
    areaServed: ["Białe Błota", "Bydgoszcz"],
    sameAs: [settings.facebookUrl],
    openingHoursSpecification: [...hours.entries()]
      .filter(([, h]) => !h.closed)
      .map(([weekday, h]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SCHEMA_DAYS[weekday - 1],
        opens: h.open,
        closes: h.close,
      })),
    potentialAction: { "@type": "ReserveAction", target: `${url}/rezerwacja` },
  };

  return (
    <>
      <Header settings={settings} />
      <main id="tresc">{children}</main>
      <Footer settings={settings} />
      <MobileBar settings={settings} />
      <CookieBanner />
      <script
        type="application/ld+json"
        nonce={nonce}
        // „<” jest kodowany, żeby treść z panelu nie mogła zamknąć znacznika script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
