/**
 * Środowisko testów E2E (uruchamiane przez Playwright, patrz playwright.config.ts):
 * czysta baza PostgreSQL → migracje → seed → produkcyjny build → serwer na porcie 3100.
 * Sekrety są losowe i żyją tylko przez czas testu.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const DB_PORT = 54330;
const APP_PORT = 3100;
const databaseDir = path.resolve(".pgdata-e2e");

const env: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_DIST_DIR: ".next-e2e",
  DATABASE_URL: `postgresql://motopuls:motopuls@localhost:${DB_PORT}/motopuls`,
  APP_URL: `http://localhost:${APP_PORT}`,
  APP_SECRET: randomBytes(48).toString("base64url"),
  CRON_SECRET: process.env.CRON_SECRET ?? randomBytes(24).toString("base64url"),
  ADMIN_EMAIL: "e2e-owner@motopuls.test",
  SMTP_HOST: "",
  TURNSTILE_SECRET_KEY: "",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  ANTISPAM_MIN_SECONDS: "0",
  UPLOAD_DIR: ".e2e-uploads",
};

function run(command: string): void {
  const result = spawnSync(command, { shell: true, stdio: "inherit", env });
  if (result.status !== 0) throw new Error(`Polecenie nie powiodło się: ${command}`);
}

async function main() {
  if (!env.SEED_ADMIN_PASSWORD) throw new Error("Brak SEED_ADMIN_PASSWORD – uruchom testy przez `npm run test:e2e`.");
  if (existsSync(databaseDir)) rmSync(databaseDir, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({ databaseDir, user: "motopuls", password: "motopuls", port: DB_PORT, persistent: false, onLog: () => {} });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("motopuls");

  const stop = async () => {
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  try {
    run("npx prisma migrate deploy");
    run("npx tsx prisma/seed.ts");
    run("npx next build");
  } catch (error) {
    await pg.stop().catch(() => {});
    throw error;
  }

  const server = spawn(`npx next start -p ${APP_PORT}`, { shell: true, stdio: "inherit", env });
  server.on("exit", stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
