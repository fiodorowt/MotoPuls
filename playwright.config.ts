import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

// Hasło startowe konta testowego: losowe przy każdym uruchomieniu, wspólne dla seeda i testów
// (procesy robocze dziedziczą zmienną po procesie głównym).
process.env.SEED_ADMIN_PASSWORD ??= randomBytes(18).toString("base64url");
process.env.CRON_SECRET ??= randomBytes(24).toString("base64url");

export default defineConfig({
  testDir: "tests/e2e",
  // Scenariusze współdzielą jedną bazę i zależą od kolejności (rezerwacja → obsługa w panelu).
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx tsx scripts/e2e-server.ts",
    url: "http://localhost:3100/api/health",
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: "pipe",
  },
});
