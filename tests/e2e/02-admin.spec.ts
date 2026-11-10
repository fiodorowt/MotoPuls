import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { Secret, TOTP } from "otpauth";
import { OWNER_EMAIL } from "./shared";

const startPassword = process.env.SEED_ADMIN_PASSWORD ?? "";
const newPassword = randomBytes(18).toString("base64url");
let totpSecret = "";

/** Kod dla podanego przesunięcia czasu – ten sam kod nie może zostać użyty dwa razy. */
function totpCode(offsetMs = 0): string {
  const totp = new TOTP({ algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(totpSecret) });
  return totp.generate({ timestamp: Date.now() + offsetMs });
}

async function signIn(page: Page, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(OWNER_EMAIL);
  await page.getByLabel("Hasło").fill(password);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
}

const PANEL_PAGES: [string, string][] = [
  ["/admin", "Pulpit"],
  ["/admin/kalendarz", "Kalendarz"],
  ["/admin/rezerwacje", "Rezerwacje"],
  ["/admin/rezerwacje/nowa", "Nowa wizyta"],
  ["/admin/klienci", "Klienci i pojazdy"],
  ["/admin/floty", "Klienci flotowi"],
  ["/admin/zapytania", "Skrzynka zapytań"],
  ["/admin/uslugi", "Usługi i cennik"],
  ["/admin/ustawienia", "Ustawienia"],
  ["/admin/tresci", "Treści strony"],
  ["/admin/szablony", "Szablony e-maili"],
  ["/admin/uzytkownicy", "Użytkownicy panelu"],
  ["/admin/dziennik", "Dziennik zdarzeń"],
  ["/admin/konto", "Moje konto"],
];

test.describe.configure({ mode: "serial" });

test.describe("panel administracyjny", () => {
  test("bez logowania panel i eksport są niedostępne", async ({ page, request }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin/klienci");
    await expect(page).toHaveURL(/\/admin\/login$/);
    const csv = await request.get("/admin/eksport/klienci", { maxRedirects: 0 });
    expect(csv.status()).toBeGreaterThanOrEqual(300);
    expect(csv.headers()["content-type"] ?? "").not.toContain("text/csv");
  });

  test("błędne hasło nie zdradza, czy konto istnieje", async ({ page }) => {
    await signIn(page, "to-nie-jest-haslo");
    await expect(page.getByText(/Nieprawidłowy e-mail lub hasło/)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("pierwsze logowanie wymusza 2FA i zmianę hasła, potem działa cały panel", async ({ page }) => {
    await signIn(page, startPassword);

    // Obowiązkowa konfiguracja 2FA
    await expect(page).toHaveURL(/\/admin\/2fa-setup$/);
    await page.goto("/admin/rezerwacje");
    await expect(page, "sesja po samym haśle nie daje dostępu do panelu").toHaveURL(/\/admin\/2fa-setup$/);
    totpSecret = (await page.locator("code").first().innerText()).trim();
    await page.getByLabel("Kod z aplikacji").fill("000000");
    await page.getByRole("button", { name: "Włącz 2FA" }).click();
    await expect(page.getByText(/Nieprawidłowy kod/)).toBeVisible();
    // Strona po błędzie nadal pokazuje ten sam sekret (formularz nie przeładowuje strony)
    await page.getByLabel("Kod z aplikacji").fill(totpCode());
    await page.getByRole("button", { name: "Włącz 2FA" }).click();

    // Wymuszona zmiana hasła startowego
    await expect(page).toHaveURL(/\/admin\/zmiana-hasla$/);
    await page.getByLabel("Obecne hasło").fill(startPassword);
    await page.getByLabel("Nowe hasło", { exact: true }).fill(newPassword);
    await page.getByLabel("Powtórz nowe hasło").fill(newPassword);
    await page.getByRole("button", { name: "Zmień hasło" }).click();
    await expect(page).toHaveURL(/\/admin\?haslo=1$/);

    // Każda sekcja panelu renderuje się bez błędu
    for (const [url, heading] of PANEL_PAGES) {
      const response = await page.goto(url);
      expect(response?.status(), url).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: heading }), url).toBeVisible();
    }

    // Rezerwacja z testu klienta jest w panelu – potwierdzamy ją
    await page.goto("/admin/rezerwacje?q=Testowy");
    await page.getByRole("row", { name: /Jan Testowy/ }).first().getByRole("link").first().click();
    await expect(page.getByRole("heading", { level: 1, name: /^Wizyta:/ })).toBeVisible();
    await page.getByRole("button", { name: "Potwierdź", exact: true }).click();
    await expect(page.getByText("Potwierdzona").first()).toBeVisible();

    // Eksport CSV dla właściciela
    const csv = await page.evaluate(async () => {
      const response = await fetch("/admin/eksport/rezerwacje");
      return { status: response.status, type: response.headers.get("content-type") ?? "", body: await response.text() };
    });
    expect(csv.status).toBe(200);
    expect(csv.type).toContain("text/csv");
    expect(csv.body).toContain("Jan Testowy");

    // Zdarzenia trafiły do dziennika
    await page.goto("/admin/dziennik");
    await expect(page.getByText("auth.2fa_enabled")).toBeVisible();
    await expect(page.getByText("export.csv")).toBeVisible();

    // Wylogowanie kończy sesję
    await page.getByRole("button", { name: "Wyloguj" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("kolejne logowanie: nowe hasło + kod TOTP; stare hasło nie działa", async ({ page }) => {
    await signIn(page, startPassword);
    await expect(page.getByText(/Nieprawidłowy e-mail lub hasło/)).toBeVisible();

    await signIn(page, newPassword);
    await expect(page).toHaveURL(/\/admin\/login\/2fa$/);
    // Kod z następnego okna czasowego (mieści się w tolerancji ±1) – poprzedni został już zużyty.
    await page.getByLabel(/Kod/).fill(totpCode(30_000));
    await page.getByRole("button", { name: /Zaloguj|Potwierd|Dalej/ }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("navigation", { name: "Panel" })).toBeVisible();
  });
});
