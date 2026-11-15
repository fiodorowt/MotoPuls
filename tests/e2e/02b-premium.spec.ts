// Moto Puls Premium (MP-031..MP-035). Nazwa `02b` celowo przed `03`, bo `03` zamyka wspólną pulę `db.ts`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser } from "@playwright/test";
import { SESSION_COOKIE, auditCount, createStaffSession, premiumInquiries, rowCount, setPremiumFlags } from "./db";

const run = Date.now().toString(36);
let sessions = 0;

async function ownerPage(browser: Browser) {
  const { token } = await createStaffSession("OWNER", `premium-${run}-${++sessions}`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.evaluate(
    ([name, value]) => {
      document.cookie = `${name}=${value}; Path=/; Secure; SameSite=Lax`;
    },
    [SESSION_COOKIE, token],
  );
  return { context, page };
}

function premiumMails(since: number): { subject: string; text: string }[] {
  const dir = path.resolve(".mail-outbox");
  return readdirSync(dir)
    .filter((f) => statSync(path.join(dir, f)).mtimeMs >= since)
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { subject: string; text: string })
    .filter((m) => m.subject.includes("Premium"));
}

test.describe.serial("Moto Puls Premium", () => {
  test.beforeAll(async () => setPremiumFlags(false, false));
  test.afterAll(async () => setPremiumFlags(false, false));

  test("T5.4 premiumEnabled=false: /premium zwraca 404, brak linków i wpisu w sitemap", async ({ page, request }) => {
    const response = await page.goto("/premium");
    expect(response?.status()).toBe(404);
    await page.goto("/");
    await expect(page.locator("#premium")).toHaveCount(0);
    await expect(page.locator('a[href="/premium"]')).toHaveCount(0);
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/premium");
  });

  test("MP-032 właściciel włącza Premium w ustawieniach (wpis w dzienniku)", async ({ browser }) => {
    const before = await auditCount("settings.premium");
    const { context, page } = await ownerPage(browser);
    await page.goto("/admin/ustawienia");
    await page.getByLabel("Pokaż ofertę Premium na stronie i przyjmuj zgłoszenia").check();
    await page.getByRole("button", { name: "Zapisz ustawienia Premium" }).click();
    await expect(page.getByText("Zapisano.")).toBeVisible();
    expect(await auditCount("settings.premium")).toBe(before + 1);
    await context.close();
  });

  test("T5.2/T5.3/T5.1 zgłoszenie bez odbioru: zapis, mail, panel; rezerwacje bez zmian", async ({ browser, page, request }) => {
    const since = Date.now() - 1000;
    const counts = async () => [await rowCount("Booking"), await rowCount("BookingSlot"), await rowCount("Block")];
    const before = await counts();

    await page.goto("/premium");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByText("Cena ustalana indywidualnie")).toBeVisible();
    await expect(page.getByLabel("Adres odbioru")).toHaveCount(0);
    await expect(page.getByText("Chcę zgłosić odbiór auta")).toHaveCount(0);
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/premium");

    await page.getByLabel("Pojazd").fill("Audi A6 2016");
    await page.getByLabel("Opis potrzeby").fill("Auto wymaga indywidualnej obsługi.");
    await page.getByLabel("Preferowany termin").fill("jutro rano");
    await page.getByLabel("Imię i nazwisko").fill("Jan Premium");
    await page.getByLabel("Telefon").fill("601 202 303");
    await page.getByLabel("E-mail").fill(`premium-${run}@motopuls.test`);
    await page.getByLabel(/Zapoznałem/).check();
    await page.getByRole("button", { name: "Wyślij zgłoszenie Premium" }).click();
    await expect(page.getByText("Dziękujemy!")).toBeVisible();

    expect(await counts()).toEqual(before);
    const rows = await premiumInquiries();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.data).toMatchObject({ Pojazd: "Audi A6 2016", "Odbiór auta": "Nie" });
    await expect.poll(() => premiumMails(since).length).toBe(1);
    expect(premiumMails(since)[0]?.text).not.toContain(`premium-${run}@motopuls.test`);

    const { context, page: admin } = await ownerPage(browser);
    await admin.goto("/admin/zapytania?typ=PREMIUM");
    await expect(admin.getByRole("cell", { name: "Premium", exact: true })).toHaveCount(1);
    await admin.getByRole("link").filter({ hasText: /\d{4}/ }).first().click();
    await expect(admin.getByText("Audi A6 2016")).toBeVisible();
    await expect(admin.getByText("jutro rano")).toBeVisible();
    await context.close();
  });

  test("walidacja: brak zgody RODO pokazuje błąd przy polu", async ({ page }) => {
    await page.goto("/premium");
    await page.getByLabel("Pojazd").fill("Audi A6 2016");
    await page.getByLabel("Opis potrzeby").fill("Auto wymaga indywidualnej obsługi.");
    await page.getByLabel("Imię i nazwisko").fill("Jan Premium");
    await page.getByLabel("Telefon").fill("601 202 303");
    await page.getByLabel("E-mail").fill("jan@motopuls.test");
    await page.getByRole("button", { name: "Wyślij zgłoszenie Premium" }).click();
    await expect(page.getByText("Potwierdź zapoznanie się z klauzulą informacyjną")).toBeVisible();
    expect(await premiumInquiries()).toHaveLength(1);
  });

  test("T5.3 flaga odbioru włączona: pole adresu pojawia się po zaznaczeniu i jest wymagane", async ({ page }) => {
    await setPremiumFlags(true, true);
    await page.goto("/premium");
    await expect(page.getByLabel("Adres odbioru")).toHaveCount(0);
    await page.getByLabel("Chcę zgłosić odbiór auta ze wskazanego miejsca").check();
    await expect(page.getByLabel("Adres odbioru")).toBeVisible();
  });

  for (const width of [390, 768, 1280]) {
    test(`T5.6 /premium w ${width} px: bez przewijania poziomego, jeden H1, CTA widoczne`, async ({ page }) => {
      await setPremiumFlags(true, false);
      await page.setViewportSize({ width, height: 900 });
      expect((await page.goto("/premium"))?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await expect(page.getByRole("button", { name: "Wyślij zgłoszenie Premium" })).toBeVisible();
      await page.goto("/");
      await expect(page.locator("#premium")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }
});
