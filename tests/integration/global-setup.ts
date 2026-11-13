/**
 * Jednorazowa baza dla testów integracyjnych: czysty PostgreSQL → migracje → seed.
 * Katalog danych (.pgdata-int) jest usuwany przed startem i po zakończeniu.
 */
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PORT = 54331;
const databaseDir = path.resolve(".pgdata-int");
const databaseUrl = `postgresql://motopuls:motopuls@localhost:${PORT}/motopuls`;

function run(command: string): void {
  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      ADMIN_EMAIL: "int-owner@motopuls.test",
      SEED_ADMIN_PASSWORD: "Int-test-only-password-0000",
    },
  });
  if (result.status !== 0) throw new Error(`Polecenie nie powiodło się: ${command}`);
}

export default async function setup() {
  if (existsSync(databaseDir)) rmSync(databaseDir, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({ databaseDir, user: "motopuls", password: "motopuls", port: PORT, persistent: false, onLog: () => {} });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("motopuls");
  try {
    run("npx prisma migrate deploy");
    run("npx tsx prisma/seed.ts");
  } catch (error) {
    await pg.stop().catch(() => {});
    throw error;
  }
  return async () => {
    await pg.stop().catch(() => {});
    rmSync(databaseDir, { recursive: true, force: true });
  };
}
