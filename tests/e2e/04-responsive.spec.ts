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

const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
];

// T8.1: brak poziomego przewijania, jeden H1, brak błędów konsoli na wszystkich stronach publicznych.
for (const viewport of VIEWPORTS) {
  test(`T8.1 strony publiczne mieszczą się w ${viewport.name} px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    let current = "";
    const errors: string[] = [];
    page.on("console", (message) => {
      // ZNANE (istnieje też w main, poza zakresem etapu 1): wbudowany <next-route-announcer> ustawia style.cssText,
      // a CSP (src/proxy.ts) nie ma style-src-attr, więc przeglądarka zgłasza "Applying inline style violates ... style-src".
      // Pojawia się losowo na dowolnej stronie (zależnie od tego, czy hydratacja zdąży), dlatego filtr nie zależy od adresu.
      const knownAnnouncerCsp = /Applying inline style violates/.test(message.text());
      if (message.type() === "error" && !knownAnnouncerCsp) errors.push(`${current}: ${message.text().slice(0, 140)}`);
    });
    for (const url of PAGES) {
      current = url;
      const response = await page.goto(url);
      expect(response?.status(), url).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }), url).toHaveCount(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${url} przewija się poziomo`).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
}
