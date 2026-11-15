import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/uslugi",
  "/klimatyzacja",
  "/dla-firm",
  "/czesci-zamienne",
  "/o-nas",
  "/kontakt",
  "/rezerwacja",
  "/regulamin-rezerwacji",
  "/polityka-prywatnosci",
];

// T8.5 / MP-037: title ≤ 60 znaków (z sufiksem marki), description 140-160, canonical, unikalność.
test("T8.5 title i description wszystkich stron mieszczą się w limitach", async ({ page }) => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const url of PAGES) {
    await page.goto(url);
    const title = await page.title();
    const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(title.length, `${url}: title "${title}"`).toBeLessThanOrEqual(60);
    expect(title.length, `${url}: title`).toBeGreaterThan(10);
    expect(description.length, `${url}: description "${description}"`).toBeGreaterThanOrEqual(140);
    expect(description.length, `${url}: description "${description}"`).toBeLessThanOrEqual(160);
    const canonical = (await page.locator('link[rel="canonical"]').getAttribute("href")) ?? "";
    expect(new URL(canonical).pathname, url).toBe(url);
    titles.add(title);
    descriptions.add(description);
  }
  expect(titles.size).toBe(PAGES.length);
  expect(descriptions.size).toBe(PAGES.length);
});

test("MP-037: /kontakt i /dla-firm mają lokalizację w H1, metadane /kontakt z Settings", async ({ page }) => {
  await page.goto("/kontakt");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Białe Błota");
  expect(await page.title()).toContain("Białe Błota");
  const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
  expect(description).toContain("ul. Modra 26"); // wartość z Settings (seed), nie z kodu strony
  await page.goto("/dla-firm");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Białe Błota");
  await page.goto("/czesci-zamienne");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Białe Błota");
});

test("MP-038: /dla-firm nie obiecuje historii napraw ani priorytetu terminów", async ({ page }) => {
  await page.goto("/dla-firm");
  const text = (await page.locator("main").innerText()).toLowerCase();
  for (const forbidden of ["historię napraw", "historia napraw", "priorytet", "pilnujemy terminów", "przypominamy o przeglądach"]) {
    expect(text, forbidden).not.toContain(forbidden);
  }
  const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
  expect(description.toLowerCase()).not.toContain("priorytet");
  expect(description.toLowerCase()).not.toContain("histori");
});

// T8.4 / MP-039
test("T8.4 baner cookies przy 390x844 zajmuje najwyżej 25% ekranu i przejmuje fokus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/rezerwacja");
  const banner = page.getByRole("region", { name: "Ustawienia prywatności" });
  await expect(banner).toBeVisible();
  await expect(banner).toBeFocused();
  const box = (await banner.boundingBox())!;
  expect(box.height / 844, `wysokość banera ${box.height}px`).toBeLessThanOrEqual(0.25);
  const necessary = banner.getByRole("button", { name: "Tylko niezbędne" });
  const all = banner.getByRole("button", { name: "Zgoda także na mapę" });
  const a = (await necessary.boundingBox())!;
  const b = (await all.boundingBox())!;
  expect(a.height).toBeGreaterThanOrEqual(48);
  expect(b.height).toBeGreaterThanOrEqual(48);
  expect(Math.abs(a.width - b.width), "oba przyciski równorzędne").toBeLessThan(2);

  // Brak pułapki fokusu: dalsze Tab wychodzi poza baner.
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  expect(await banner.evaluate((el) => el.contains(document.activeElement))).toBe(false);

  await necessary.click();
  await expect(banner).toHaveCount(0);
  await expect(page.locator("#tresc")).toBeFocused();
});

for (const width of [768, 1280]) {
  test(`T8.4 baner cookies mieści się na ekranie ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const banner = page.getByRole("region", { name: "Ustawienia prywatności" });
    await expect(banner).toBeVisible();
    const box = (await banner.boundingBox())!;
    expect(box.height / 800).toBeLessThanOrEqual(0.4);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  });
}

test("MP-020: „Umów wizytę” na pasku mobilnym mieści się w jednej linii", async ({ page, context }) => {
  await context.addCookies([{ name: "mp_consent", value: "necessary", url: "http://localhost:3100" }]);
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const cta = page.locator("div.fixed").getByRole("link", { name: "Umów wizytę" });
    const box = (await cta.boundingBox())!;
    expect(box.height, `${width} px`).toBeLessThanOrEqual(52);
  }
});

test("MP-049: na /rezerwacja jest jedna linia pulsu (bez podwójnego dividera)", async ({ page, context }) => {
  await context.addCookies([{ name: "mp_consent", value: "necessary", url: "http://localhost:3100" }]);
  // PulseDivider (nagłówek strony) to svg 'h-10 w-28'; na /rezerwacja zostaje tylko pasek postępu kreatora.
  await page.goto("/rezerwacja");
  await expect(page.locator("main svg.h-10.w-28")).toHaveCount(0);
  await page.goto("/o-nas");
  await expect(page.locator("main svg.h-10.w-28")).toHaveCount(1);
});
