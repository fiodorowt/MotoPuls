/* eslint-disable @typescript-eslint/no-explicit-any -- odczyt dowolnego JSON-LD w teście */
import { describe, expect, it } from "vitest";
import { buildAutoRepairJsonLd } from "@/lib/seo";

const settings = {
  brandName: "Test Warsztat",
  legalName: "Test Warsztat sp. z o.o.",
  nip: "1234567890",
  street: "ul. Testowa 1",
  postalCode: "00-001",
  city: "Testowo",
  phones: ["600100200"],
  email: "test@example.test",
  facebookUrl: "https://www.facebook.com/test/",
  latitude: 1.5,
  longitude: 2.5,
  areaServed: ["Testowo", "Obok"],
};
const hours = new Map([
  [1, { closed: false, open: "08:00", close: "16:00" }],
  [7, { closed: true, open: "08:00", close: "16:00" }],
]);
const categories = [
  { name: "Mechanika", services: [{ name: "Wymiana oleju" }, { name: "Hamulce" }] },
  { name: "Pusta", services: [] },
];

describe("buildAutoRepairJsonLd (MP-040)", () => {
  const ld = buildAutoRepairJsonLd({ url: "https://example.test", settings, hours, categories }) as Record<string, any>;

  it("zawiera typ, adres i godziny tylko z otwartych dni", () => {
    expect(ld["@type"]).toBe("AutoRepair");
    expect(ld.address.addressLocality).toBe("Testowo");
    expect(ld.openingHoursSpecification).toHaveLength(1);
    expect(ld.openingHoursSpecification[0]).toMatchObject({ dayOfWeek: "Monday", opens: "08:00", closes: "16:00" });
  });

  it("areaServed pochodzi z ustawień, a puste pole jest pomijane", () => {
    expect(ld.areaServed).toEqual(["Testowo", "Obok"]);
    const empty = buildAutoRepairJsonLd({ url: "https://example.test", settings: { ...settings, areaServed: [] }, hours, categories }) as Record<string, unknown>;
    expect("areaServed" in empty).toBe(false);
  });

  it("hasOfferCatalog zawiera usługi bez cen i pomija puste kategorie", () => {
    const catalog = ld.hasOfferCatalog;
    expect(catalog.itemListElement).toHaveLength(1);
    expect(catalog.itemListElement[0].name).toBe("Mechanika");
    expect(catalog.itemListElement[0].itemListElement.map((o: any) => o.itemOffered.name)).toEqual(["Wymiana oleju", "Hamulce"]);
    expect(JSON.stringify(catalog)).not.toMatch(/price/i);
  });

  it("bez usług nie ma hasOfferCatalog, a puste sameAs i pola nie trafiają do danych", () => {
    const bare = buildAutoRepairJsonLd({ url: "https://example.test", settings: { ...settings, facebookUrl: "" }, hours, categories: [] }) as Record<string, unknown>;
    expect("hasOfferCatalog" in bare).toBe(false);
    expect("sameAs" in bare).toBe(false);
    expect("hasMap" in bare).toBe(false);
  });
});
