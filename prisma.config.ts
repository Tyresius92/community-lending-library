import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Not using the `env()` helper here: it throws immediately if the var is
    // unset, but `prisma generate` (e.g. in CI/Docker) doesn't need a real
    // connection string, only commands that actually connect (migrate, etc.) do.
    url: process.env.DATABASE_DIRECT_URL,
  },
});
