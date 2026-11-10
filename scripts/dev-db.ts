/**
 * Lokalna baza PostgreSQL bez Dockera i bez uprawnień administratora
 * (pakiet embedded-postgres). Tylko do pracy deweloperskiej i testów E2E.
 *
 *   npm run db:dev            – baza deweloperska (port 54329, katalog .pgdata)
 *   npm run db:dev -- --e2e   – czysta baza testowa (port 54330, katalog .pgdata-e2e)
 */
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const e2e = process.argv.includes("--e2e");
const databaseDir = path.resolve(e2e ? ".pgdata-e2e" : ".pgdata");
const port = e2e ? 54330 : 54329;

async function main() {
  if (e2e && existsSync(databaseDir)) rmSync(databaseDir, { recursive: true, force: true });
  const fresh = !existsSync(databaseDir);

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "motopuls",
    password: "motopuls",
    port,
    persistent: true,
    onLog: () => {},
  });

  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) await pg.createDatabase("motopuls");

  console.log(`PostgreSQL działa: postgresql://motopuls:motopuls@localhost:${port}/motopuls`);

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
