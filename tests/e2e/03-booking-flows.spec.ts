import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { SESSION_COOKIE, auditCount, bookingByCustomerEmail, closePool, createStaffSession } from "./db";

const run = Date.now().toString(36);

function person(label: string) {
  return {
    name: `Klient ${label} ${run}`,
    phone: "601 202 303",
    email: `klient-${label}-${run}@motopuls.test`,
    plate: `CB ${label.charCodeAt(0)}${label.charCodeAt(0)}${label.charCodeAt(0)}`.slice(0, 8),
  };
}

async function chooseFirstServiceAndContinue(page: Page) {
  await page.getByRole("checkbox").first().check();
  const unknownRefrigerant = page.getByRole("radio", { name: /Nie wiem/ });
  if (await unknownRefrigerant.isVisible()) await unknownRefrigerant.check();
  await page.getByRole("button", { name: "Dalej" }).click();
}

/** Pełna rezerwacja przez kreator; wybiera trzeci dostępny dzień, żeby okno anulowania było otwarte. */
async function bookViaWizard(page: Page, who: ReturnType<typeof person>) {
  await page.goto("/rezerwacja");
  await chooseFirstServiceAndContinue(page);
  await page.getByLabel("Marka").fill("Skoda");
  await page.getByLabel("Model").fill("Fabia");
  await page.getByLabel("Rok produkcji").fill("2018");
  await page.getByLabel("Numer rejestracyjny").fill(who.plate);
  await page.getByRole("button", { name: "Dalej" }).click();
  await expect(page.getByRole("heading", { name: /Krok 3 z 5/ })).toBeVisible();
  const days = page.getByRole("group", { name: "Dzień" }).locator("button:not([disabled])");
  await days.nth(2).click();
  await page.getByRole("group", { name: /^Godzina/ }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Dalej" }).click();
  await page.getByLabel("Imię i nazwisko").fill(who.name);
  await page.getByLabel("Telefon").fill(who.phone);
  await page.getByLabel(/^E-mail/).fill(who.email);
  await page.getByRole("checkbox", { name: /regulamin rezerwacji/ }).check();
  await page.getByRole("button", { name: "Dalej" }).click();
  await expect(page.getByRole("heading", { name: /Krok 5 z 5/ })).toBeVisible();
  await page.getByRole("button", { name: "Rezerwuję wizytę" }).click();
  await page.waitForURL(/\/rezerwacja\/[A-Za-z0-9_-]{20,}\?nowa=1$/);
}

/** Sesja pracownika z bazy testowej: cookie ustawiamy w przeglądarce (localhost jest bezpiecznym kontekstem dla Secure). */
async function staffPage(browser: Browser, token: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.evaluate(([name, value]) => {
    document.cookie = `${name}=${value}; Path=/; Secure; SameSite=Lax`;
  }, [SESSION_COOKIE, token]);
  return { context, page };
}

function mailsFor(email: string): { to: string; subject: string; text: string }[] {
  const dir = path.resolve(".mail-outbox");
  return readdirSync(dir)
    .map((file) => JSON.parse(readFileSync(path.join(dir, file), "utf8")) as { to: string; subject: string; text: string })
    .filter((mail) => mail.to === email);
}

test.afterAll(async () => {
  await closePool();
});

test.describe("kreator: błędy, ponowienie i ładowanie (MP-017, MP-018, MP-019)", () => {
  for (const size of [
    { name: "390 px", width: 390, height: 844 },
    { name: "1280 px", width: 1280, height: 800 },
  ]) {
    test(`T8.2 fokus trafia na pierwsze błędne pole (${size.name})`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto("/rezerwacja");

      await page.getByRole("button", { name: "Dalej" }).click();
      await expect(page.getByText("Wybierz co najmniej jedną usługę.")).toBeVisible();
      await expect(page.getByRole("checkbox").first()).toBeFocused();

      await chooseFirstServiceAndContinue(page);
      await expect(page.getByRole("heading", { name: /Krok 2 z 5/ })).toBeVisible();

      await page.getByRole("button", { name: "Dalej" }).click();
      await expect(page.getByLabel("Marka")).toHaveAttribute("aria-invalid", "true");
      await expect(page.getByLabel("Marka")).toBeFocused();
      await expect(page.getByLabel("Marka")).toBeInViewport();
    });
  }

  test("T8.3 błąd pobrania terminów daje przycisk „Spróbuj ponownie”", async ({ page }) => {
    let failed = 0;
    await page.route("**/rezerwacja", async (route) => {
      const request = route.request();
      if (failed === 0 && request.method() === "POST" && request.headers()["next-action"]) {
        failed++;
        await route.fulfill({ status: 500, contentType: "text/plain", body: "Internal Server Error" });
        return;
      }
      await route.continue();
    });

    await page.goto("/rezerwacja");
    await chooseFirstServiceAndContinue(page);
    await page.getByLabel("Marka").fill("Skoda");
    await page.getByLabel("Model").fill("Fabia");
    await page.getByLabel("Rok produkcji").fill("2018");
    await page.getByLabel("Numer rejestracyjny").fill("CB 54321");
    await page.getByRole("button", { name: "Dalej" }).click();

    const retry = page.getByRole("button", { name: "Spróbuj ponownie" });
    await expect(retry).toBeVisible();
    expect(failed).toBe(1);
    await retry.click();
    await expect(page.getByRole("group", { name: /^Dzień/ })).toBeVisible();
    await expect(retry).toBeHidden();
  });

  test("MP-019 przy wolnej odpowiedzi serwera widać loader zamiast pustej strony", async ({ page }) => {
    await page.goto("/");
    await page.route(
      (url) => url.pathname === "/rezerwacja",
      async (route) => {
        const headers = route.request().headers();
        // Opóźniamy tylko właściwe przejście (RSC), nie prefetch.
        if (headers["rsc"] && !headers["next-router-prefetch"]) await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.continue();
      },
    );
    await page.locator('a[href="/rezerwacja"]:visible').first().click();
    await expect(page.getByRole("status").filter({ hasText: "Wczytywanie strony" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Krok 1 z 5/ })).toBeVisible();
  });
});

test.describe("status rezerwacji i uprawnienia (MP-009, MP-011, MP-013)", () => {
  test.describe.configure({ mode: "serial" });

  const guest = person("a");
  const rejected = person("b");
  const confirmed = person("c");

  test("T4.1 i T4.2 klient widzi „Oczekująca”, panel listuje ją do potwierdzenia, anulowanie z linku odświeża status", async ({ page, browser }) => {
    await bookViaWizard(page, guest);
    await expect(page.getByText("Oczekująca")).toBeVisible();
    await expect(page.getByText(/Czekamy na potwierdzenie terminu/)).toBeVisible();

    // Panel: rezerwacja jest na liście oczekujących
    const owner = await createStaffSession("OWNER", `t41-${run}`);
    const { context: panelContext, page: panel } = await staffPage(browser, owner.token);
    await panel.goto(`/admin/rezerwacje?status=PENDING&q=${encodeURIComponent(guest.name)}`);
    await expect(panel.getByRole("row", { name: new RegExp(guest.name) })).toContainText("Oczekująca");
    await panel.goto("/admin");
    await expect(panel.getByRole("heading", { name: "Czekają na potwierdzenie" })).toBeVisible();
    await panelContext.close();

    // Anulowanie z linku: status zmienia się bez ręcznego odświeżenia
    await page.getByRole("button", { name: "Anuluj rezerwację" }).click();
    await page.getByRole("button", { name: "Tak, anuluj" }).click();
    await expect(page.locator(".badge")).toHaveText("Anulowana");
    expect((await bookingByCustomerEmail(guest.email)).status).toBe("CANCELLED");
  });

  test("T2.8 i T4.4 pracownik odrzuca rezerwację z powodem: mail z powodem i wpis w dzienniku", async ({ page, browser }) => {
    await bookViaWizard(page, rejected);
    const booking = await bookingByCustomerEmail(rejected.email);
    expect(booking.status).toBe("PENDING");

    const employee = await createStaffSession("EMPLOYEE", `t44a-${run}`);
    const { context, page: panel } = await staffPage(browser, employee.token);
    await panel.goto(`/admin/rezerwacje/${booking.id}`);
    await panel.getByLabel(/Powód odrzucenia/).fill("Brak części do tego modelu");
    panel.once("dialog", (dialog) => dialog.accept());
    await panel.getByRole("button", { name: "Odrzuć rezerwację" }).click();
    // Po odrzuceniu formularz znika, więc sprawdzamy trwały stan strony.
    await expect(panel.getByText("Powód odrzucenia", { exact: true })).toBeVisible();
    await context.close();

    const after = await bookingByCustomerEmail(rejected.email);
    expect(after.status).toBe("CANCELLED");
    expect(after.cancelReason).toBe("Brak części do tego modelu");
    expect(mailsFor(rejected.email).some((m) => m.text.includes("Powód: Brak części do tego modelu"))).toBe(true);
    expect(await auditCount("booking.reject")).toBeGreaterThanOrEqual(1);

    // Klient widzi anulowaną rezerwację pod swoim linkiem
    await page.goto(`/rezerwacja/${after.token}`);
    await expect(page.locator(".badge")).toHaveText("Anulowana");
  });

  test("T4.4 pracownik może potwierdzić oczekującą rezerwację", async ({ page, browser }) => {
    await bookViaWizard(page, confirmed);
    const booking = await bookingByCustomerEmail(confirmed.email);
    const employee = await createStaffSession("EMPLOYEE", `t44b-${run}`);
    const { context, page: panel } = await staffPage(browser, employee.token);
    await panel.goto(`/admin/rezerwacje/${booking.id}`);
    await panel.getByRole("button", { name: "Potwierdź", exact: true }).click();
    await expect(panel.getByText("Potwierdzona").first()).toBeVisible();
    await context.close();
    expect((await bookingByCustomerEmail(confirmed.email)).status).toBe("CONFIRMED");
  });

  test("T3.5 przeniesienie poza godziny wymaga potwierdzenia i trafia do dziennika", async ({ browser }) => {
    const booking = await bookingByCustomerEmail(confirmed.email);
    const owner = await createStaffSession("OWNER", `t35-${run}`);
    const { context, page: panel } = await staffPage(browser, owner.token);
    await panel.goto(`/admin/rezerwacje/${booking.id}`);

    // Niedziela za ok. 2 tygodnie (warsztat w niedzielę nie pracuje)
    const sunday = new Date();
    sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7) + 7);
    const date = sunday.toISOString().slice(0, 10);
    await panel.getByLabel("Data").fill(date);
    await panel.getByLabel("Godzina").fill("10:00");
    await panel.getByRole("button", { name: "Przenieś", exact: true }).click();
    await expect(panel.getByText(/Termin poza grafikiem/)).toBeVisible();
    const before = await auditCount("booking.move");

    await panel.getByRole("checkbox", { name: /Potwierdzam przeniesienie/ }).check();
    await panel.getByRole("button", { name: "Przenieś", exact: true }).click();
    await expect(panel.getByText(/Wizyta przeniesiona/)).toBeVisible();
    expect(await auditCount("booking.move")).toBe(before + 1);
    await context.close();
  });

  test("T4.3 pracownik nie wchodzi do sekcji właściciela i nie wykona jego akcji", async ({ browser }) => {
    const owner = await createStaffSession("OWNER", `t43o-${run}`);
    const employee = await createStaffSession("EMPLOYEE", `t43e-${run}`);

    // Właściciel zapisuje ustawienia rezerwacji; przechwytujemy żądanie akcji serwerowej.
    const { context: ownerContext, page: ownerPage } = await staffPage(browser, owner.token);
    await ownerPage.goto("/admin/ustawienia");
    const saved = ownerPage.waitForRequest((r) => r.method() === "POST" && Boolean(r.headers()["next-action"]));
    await ownerPage.getByRole("button", { name: "Zapisz ustawienia rezerwacji" }).click();
    const captured = await saved;
    await expect(ownerPage.getByText("Zapisano.")).toBeVisible();
    const replay = { url: captured.url(), headers: await captured.allHeaders(), body: captured.postDataBuffer() };
    await ownerContext.close();
    expect(await auditCount("settings.booking")).toBeGreaterThanOrEqual(1);

    const { context: employeeContext, page } = await staffPage(browser, employee.token);
    for (const url of ["/admin/ustawienia", "/admin/uzytkownicy", "/admin/szablony", "/admin/uslugi", "/admin/dziennik"]) {
      await page.goto(url);
      await expect(page, url).toHaveURL(/\/admin\?brak-uprawnien=1$/);
      await expect(page.getByText("Ta część panelu jest dostępna tylko dla właściciela.")).toBeVisible();
    }
    const csv = await employeeContext.request.get("/admin/eksport/rezerwacje", { maxRedirects: 0 });
    expect(csv.headers()["content-type"] ?? "").not.toContain("text/csv");

    // Ta sama akcja serwerowa wywołana z sesją pracownika jest odrzucona i nic nie zapisuje.
    const auditBefore = await auditCount("settings.booking");
    const headers: Record<string, string> = {};
    for (const key of ["content-type", "next-action", "next-router-state-tree", "accept"]) {
      if (replay.headers[key]) headers[key] = replay.headers[key];
    }
    const response = await employeeContext.request.post(replay.url, { headers, data: replay.body ?? undefined, maxRedirects: 0 });
    expect(response.headers()["content-type"] ?? "").not.toContain("text/csv");
    expect(await auditCount("settings.booking")).toBe(auditBefore);
    await employeeContext.close();
  });
});
