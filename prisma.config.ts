// Prisma 7 config: the datasource URL used by the CLI (migrate, studio, db push, seed)
// lives here instead of in schema.prisma. The PrismaClient at runtime still needs its
// own driver adapter — see src/lib/prisma.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
