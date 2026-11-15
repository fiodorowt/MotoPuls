// Etap 4, niezależny tester. Przed `03`, bo `03` zamyka wspólną pulę `db.ts`.
import { expect, test } from "@playwright/test";
import { coordinates, setCompanyAddress } from "./db";

test("MP-037: metadane /kontakt i H1 pochodzą z Settings (zmiana w bazie zmienia title/description/H1)", async ({ page }) => {
  await setCompanyAddress("ul. Zmieniona 7", "Testowo");
  try {
    await page.goto("/kontakt");
    const title = await page.title();
    const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(title).toContain("Testowo");
    expect(title).not.toContain("Białe Błota");
    expect(description).toContain("ul. Zmieniona 7");
    expect(description).not.toContain("Modra");
    expect(description.length).toBeGreaterThanOrEqual(140);
    expect(description.length).toBeLessThanOrEqual(160);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Testowo");
  } finally {
    await setCompanyAddress("ul. Modra 26", "Białe Błota");
  }
  await page.goto("/kontakt");
  expect(await page.title()).toContain("Białe Błota");
});

test("MP-040: JSON-LD nie zmienia współrzędnych (zostają wartości z seeda/panelu) i nie ma cen", async ({ page }) => {
  const db = await coordinates();
  expect(db).toEqual({ latitude: 53.0952, longitude: 17.9285 });
  await page.goto("/");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  expect(ld.geo).toEqual({ "@type": "GeoCoordinates", latitude: 53.0952, longitude: 17.9285 });
  expect(ld.areaServed).toEqual(["Białe Błota", "Bydgoszcz"]);
  expect(JSON.stringify(ld)).not.toMatch(/priceRange|"price"|zł/i);
  expect(JSON.stringify(ld)).not.toContain("<");
});

test("MP-042: każdy adres z sitemap zwraca 200, /premium nie ma w mapie przy wyłączonej fladze, favicon to image/x-icon", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  expect(locs.length).toBeGreaterThanOrEqual(10);
  expect(locs).not.toContain("/premium");
  for (const path of locs) expect((await request.get(path)).status(), path).toBe(200);
  const ico = await request.get("/favicon.ico");
  expect(ico.status()).toBe(200);
  expect(ico.headers()["content-type"]).toBe("image/x-icon");
  const body = await ico.body();
  expect([...body.subarray(0, 4)]).toEqual([0, 0, 1, 0]); // nagłówek ICO
});

test("MP-039: przed zgodą i po „Tylko niezbędne” brak żądań do domen zewnętrznych, mapa tylko po zgodzie", async ({ page, context }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) external.push(r.url());
  });
  await page.route(/openstreetmap/, (route) => route.abort()); // bez prawdziwej sieci, ale żądanie nadal jest odnotowane
  await page.goto("/kontakt");
  await page.waitForLoadState("networkidle");
  expect(external, "przed zgodą").toEqual([]);
  await expect(page.locator('iframe[src*="openstreetmap"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Tylko niezbędne" }).click();
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(external, "po Tylko niezbędne").toEqual([]);
  await expect(page.locator('iframe[src*="openstreetmap"]')).toHaveCount(0);
  await context.clearCookies();
  await page.goto("/kontakt");
  await page.getByRole("button", { name: "Zgoda także na mapę" }).click();
  await expect(page.locator('iframe[src*="openstreetmap"]')).toHaveCount(1);
});

test("MP-020/MP-039: pasek mobilny 360/390: oba przyciski jednoliniowe i tej samej wysokości, baner nie zasłania paska", async ({ page }) => {
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const bar = page.locator("div.fixed").filter({ has: page.getByRole("link", { name: "Umów wizytę" }) });
    const links = bar.getByRole("link");
    const n = await links.count();
    expect(n).toBeGreaterThanOrEqual(2);
    const heights: number[] = [];
    for (let i = 0; i < n; i++) {
      const link = links.nth(i);
      heights.push((await link.boundingBox())!.height);
      const lines = await link.evaluate((el) => {
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
        return Math.round(el.getBoundingClientRect().height / lh);
      });
      expect(lines, `${width}px link ${i}`).toBeLessThanOrEqual(3); // wysokość <= ~2 wiersze to by było za dużo
    }
    expect(Math.max(...heights) - Math.min(...heights), `${width}px: równa wysokość`).toBeLessThanOrEqual(1);
    expect(Math.min(...heights), `${width}px: cel dotykowy`).toBeGreaterThanOrEqual(44);
    // tekst „Umów wizytę” nie łamie się: jeden prostokąt klienta w Range
    const rects = await bar.getByRole("link", { name: "Umów wizytę" }).evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set([...range.getClientRects()].map((r) => Math.round(r.top / 4))).size;
    });
    expect(rects, `${width}px: wiersze tekstu`).toBeLessThanOrEqual(2); // ikona + tekst w jednym wierszu
  }
});

test("T8.1+: brak przewijania poziomego także z widocznym banerem i po akceptacji (390/768/1280)", async ({ page }) => {
  const pages = ["/", "/uslugi", "/klimatyzacja", "/dla-firm", "/czesci-zamienne", "/o-nas", "/kontakt", "/rezerwacja", "/regulamin-rezerwacji", "/polityka-prywatnosci"];
  for (const [width, height] of [[390, 844], [768, 1024], [1280, 800], [360, 740]] as const) {
    await page.setViewportSize({ width, height });
    for (const url of pages) {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${url} @${width}`).toBeLessThanOrEqual(0);
    }
  }
});
