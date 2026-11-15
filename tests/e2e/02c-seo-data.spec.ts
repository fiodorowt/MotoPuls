/* eslint-disable @typescript-eslint/no-explicit-any -- odczyt dowolnego JSON-LD w teście */
// SEO oparte o dane z bazy (MP-040, MP-042). Nazwa `02c` celowo przed `03`, bo `03` zamyka wspólną pulę `db.ts`.
import { expect, test, type Page } from "@playwright/test";
import { insertAudit, setAreaServed } from "./db";

async function jsonLd(page: Page, url: string): Promise<Record<string, any>[]> {
  await page.goto(url);
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  return raw.map((r) => JSON.parse(r));
}

test("MP-040: pełny AutoRepair tylko na / i /kontakt, z ofertą z bazy bez cen", async ({ page }) => {
  for (const url of ["/", "/kontakt"]) {
    const blocks = await jsonLd(page, url);
    expect(blocks, url).toHaveLength(1);
    const ld = blocks[0]!;
    expect(ld["@type"]).toBe("AutoRepair");
    expect(ld.hasOfferCatalog.itemListElement.length).toBeGreaterThan(0);
    expect(JSON.stringify(ld.hasOfferCatalog)).not.toMatch(/price/i);
    expect(ld.hasMap).toBeUndefined();
    expect(ld.openingHoursSpecification.length).toBeGreaterThan(0);
  }
  for (const url of ["/uslugi", "/klimatyzacja", "/o-nas", "/dla-firm", "/rezerwacja"]) {
    expect(await jsonLd(page, url), url).toHaveLength(0);
  }
});

test("MP-040: areaServed pochodzi z Settings, puste pole jest pomijane", async ({ page }) => {
  await setAreaServed(["Testowo", "Obok Testowa"]);
  expect((await jsonLd(page, "/"))[0]!.areaServed).toEqual(["Testowo", "Obok Testowa"]);
  await setAreaServed([]);
  expect("areaServed" in (await jsonLd(page, "/"))[0]!).toBe(false);
  await setAreaServed(["Białe Błota", "Bydgoszcz"]);
});

test("MP-042: sitemap ma lastmod z dziennika zmian, a strony bez edytowalnej treści go nie mają", async ({ request }) => {
  await insertAudit("settings.company", "2026-11-01T10:00:00Z");
  await insertAudit("service.update", "2026-11-10T10:00:00Z");
  const xml = await (await request.get("/sitemap.xml")).text();
  const entry = (path: string) => new RegExp(`<url>\\s*<loc>[^<]*${path}</loc>(.*?)</url>`, "s").exec(xml)?.[1] ?? "";
  expect(entry("/kontakt")).toContain("<lastmod>2026-11-01T10:00:00.000Z</lastmod>");
  expect(entry("/uslugi")).toContain("<lastmod>2026-11-10T10:00:00.000Z</lastmod>");
  expect(entry("/regulamin-rezerwacji")).not.toContain("lastmod");
  expect(entry("/polityka-prywatnosci")).not.toContain("lastmod");
});

test("MP-042: /favicon.ico zwraca ikonę", async ({ request }) => {
  const response = await request.get("/favicon.ico");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/icon|image/);
  expect((await response.body()).length).toBeGreaterThan(100);
});
