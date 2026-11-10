import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Pusty URL pozwala na `prisma generate` w obrazie Dockera bez dostępu do bazy.
    url: process.env.DATABASE_URL ?? "",
  },
});
