// Pulę połączeń zamyka 03-booking-flows.spec.ts (ten sam worker, moduł db.ts jest współdzielony).
import { expect, test, type Browser } from "@playwright/test";
import { SESSION_COOKIE, createStaffSession } from "./db";

const run = Date.now().toString(36);

async function dashboardAs(browser: Browser, role: "OWNER" | "EMPLOYEE") {
  const { token } = await createStaffSession(role, `mail-${role.toLowerCase()}-${run}`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.evaluate(
    ([name, value]) => {
      document.cookie = `${name}=${value}; Path=/; Secure; SameSite=Lax`;
    },
    [SESSION_COOKIE, token],
  );
  await page.goto("/admin");
  return { context, page };
}

// MP-002: serwer E2E działa jako build produkcyjny z pustym SMTP_HOST, więc poczta jest "disabled".
test.describe("MP-002 ostrzeżenie o braku SMTP w produkcji", () => {

  test("/api/health zwraca tylko flagę poczty, bez szczegółów", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: "ok", mail: "disabled" });
  });

  test("właściciel widzi ostrzeżenie na pulpicie, pracownik nie", async ({ browser }) => {
    const owner = await dashboardAs(browser, "OWNER");
    await expect(owner.page.getByRole("alert").filter({ hasText: "Poczta nie jest skonfigurowana" })).toBeVisible();
    await owner.context.close();

    const employee = await dashboardAs(browser, "EMPLOYEE");
    await expect(employee.page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(employee.page.getByText("Poczta nie jest skonfigurowana")).toHaveCount(0);
    await employee.context.close();
  });
});
