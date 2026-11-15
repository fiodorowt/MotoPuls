import { telHref } from "./labels";
import type { Settings } from "./settings";
import type { DayHours } from "./slots";

const SCHEMA_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type JsonLdSettings = Pick<
  Settings,
  | "brandName" | "legalName" | "nip" | "street" | "postalCode" | "city" | "phones" | "email"
  | "facebookUrl" | "latitude" | "longitude" | "areaServed"
>;

/**
 * Dane strukturalne AutoRepair – wyłącznie fakty z bazy (Settings, OpeningHours, Service).
 * Puste pola są pomijane, ceny nie trafiają do danych. `hasMap` i drugi `sameAs` czekają na URL wizytówki Google (D-17).
 */
export function buildAutoRepairJsonLd(input: {
  url: string;
  settings: JsonLdSettings;
  hours: Map<number, DayHours>;
  categories: { name: string; services: { name: string }[] }[];
}): Record<string, unknown> {
  const { url, settings, hours, categories } = input;
  const offerCatalog = categories
    .filter((c) => c.services.length > 0)
    .map((c) => ({
      "@type": "OfferCatalog",
      name: c.name,
      itemListElement: c.services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.name } })),
    }));

  return {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "@id": `${url}/#warsztat`,
    name: settings.brandName,
    legalName: settings.legalName,
    url,
    image: `${url}/og.png`,
    logo: `${url}/apple-icon.png`,
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
    ...(settings.areaServed.length > 0 && { areaServed: settings.areaServed }),
    ...(settings.facebookUrl && { sameAs: [settings.facebookUrl] }),
    ...(offerCatalog.length > 0 && { hasOfferCatalog: { "@type": "OfferCatalog", name: "Usługi", itemListElement: offerCatalog } }),
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
}
