import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { CUSTOMER } from "./shared";

test.describe("rezerwacja online", () => {
  test("strona główna ma dane firmy, nagłówki bezpieczeństwa i dane strukturalne", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};
    expect(headers["content-security-policy"]).toContain("script-src 'self' 'nonce-");
    expect(headers["content-security-policy"]).not.toContain("unsafe-inline");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["strict-transport-security"]).toContain("max-age=");

    await expect(page.getByRole("link", { name: /881 765 880/ }).first()).toHaveAttribute("href", "tel:+48881765880");
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(jsonLd ?? "{}")["@type"]).toBe("AutoRepair");
  });

  test("klient przechodzi 5 kroków i dostaje potwierdzenie z załącznikiem .ics", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/rezerwacja");

    // Krok 1 – „Dalej” bez wyboru usługi pokazuje błąd
    await page.getByRole("button", { name: "Dalej" }).click();
    await expect(page.getByText("Wybierz co najmniej jedną usługę.")).toBeVisible();
    await page.getByRole("checkbox").first().check();
    const unknownRefrigerant = page.getByRole("radio", { name: /Nie wiem/ });
    if (await unknownRefrigerant.isVisible()) await unknownRefrigerant.check();
    await page.getByRole("button", { name: "Dalej" }).click();

    // Krok 2 – pojazd
    await expect(page.getByRole("heading", { name: /Krok 2 z 5/ })).toBeVisible();
    await page.getByLabel("Marka").fill("Skoda");
    await page.getByLabel("Model").fill("Octavia");
    await page.getByLabel("Rok produkcji").fill("2019");
    await page.getByLabel("Numer rejestracyjny").fill(CUSTOMER.plate);
    await page.getByLabel(/Opis usterki/).fill("Test E2E: stuki z przodu przy skręcie.");
    await page.getByRole("button", { name: "Dalej" }).click();

    // Krok 3 – pierwszy wolny termin
    await expect(page.getByRole("heading", { name: /Krok 3 z 5/ })).toBeVisible();
    const hours = page.getByRole("group", { name: /^Godzina/ });
    await hours.getByRole("button").first().click();
    await expect(page.getByText(/Wybrany termin:/)).toBeVisible();
    await page.getByRole("button", { name: "Dalej" }).click();

    // Krok 4 – dane i zgody; brak akceptacji regulaminu blokuje przejście
    await page.getByLabel("Imię i nazwisko").fill(CUSTOMER.name);
    await page.getByLabel("Telefon").fill(CUSTOMER.phone);
    await page.getByLabel(/^E-mail/).fill(CUSTOMER.email);
    await page.getByRole("button", { name: "Dalej" }).click();
    await expect(page.getByRole("heading", { name: /Krok 4 z 5/ })).toBeVisible();
    await page.getByRole("checkbox", { name: /regulamin rezerwacji/ }).check();
    await page.getByRole("button", { name: "Dalej" }).click();

    // Krok 5 – podsumowanie i wysyłka
    await expect(page.getByRole("heading", { name: /Krok 5 z 5/ })).toBeVisible();
    await expect(page.getByText(CUSTOMER.plate)).toBeVisible();
    await page.getByRole("button", { name: "Rezerwuję wizytę" }).click();

    await page.waitForURL(/\/rezerwacja\/[A-Za-z0-9_-]{20,}\?nowa=1$/);
    await expect(page.getByRole("heading", { name: "Dziękujemy! Rezerwacja przyjęta" })).toBeVisible();
    await expect(page.getByText("Oczekująca")).toBeVisible();

    // E-mail do klienta (tryb bez SMTP zapisuje wiadomości do .mail-outbox)
    const outbox = path.resolve(".mail-outbox");
    const mails = readdirSync(outbox).map((file) => JSON.parse(readFileSync(path.join(outbox, file), "utf8")) as { to: string; ics?: { content: string } });
    const confirmation = mails.find((mail) => mail.to === CUSTOMER.email);
    expect(confirmation, "e-mail z potwierdzeniem dla klienta").toBeTruthy();
    expect(confirmation?.ics?.content).toContain("BEGIN:VEVENT");

    // Produkcyjny CSP nie może blokować niczego na stronie
    expect(consoleErrors.filter((text) => /Content Security Policy|CSP/i.test(text))).toEqual([]);
  });

  test("link z nieistniejącym tokenem nie ujawnia żadnej rezerwacji", async ({ page }) => {
    const response = await page.goto("/rezerwacja/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(response?.status()).toBe(404);
  });

  test("zadania cykliczne wymagają sekretu", async ({ request }) => {
    expect((await request.post("/api/cron/reminders")).status()).toBe(401);
    expect((await request.post("/api/cron/maintenance", { headers: { Authorization: "Bearer zly-sekret" } })).status()).toBe(401);
    const ok = await request.post("/api/cron/maintenance", { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect(ok.status()).toBe(200);
  });
});
