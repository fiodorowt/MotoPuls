import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Testy integracyjne na prawdziwej bazie PostgreSQL (jednorazowa, embedded-postgres, port 54331).
 * Uruchamianie: `npm run test:int`. Baza powstaje w globalSetup, nie dotyka bazy deweloperskiej ani E2E.
 */
export const INT_DB_PORT = 54331;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/integration/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/integration/global-setup.ts"],
    // Wspólna baza: pliki testowe idą po kolei, każdy czyści tabele transakcyjne.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      DATABASE_URL: `postgresql://motopuls:motopuls@localhost:${INT_DB_PORT}/motopuls`,
      APP_URL: "http://localhost:3199",
      APP_SECRET: "integration-test-secret-integration-test-secret-0000",
      CRON_SECRET: "integration-cron-secret-0000",
      SMTP_HOST: "",
      WORKSHOP_NOTIFY_EMAIL: "warsztat@motopuls.test",
    },
  },
});
