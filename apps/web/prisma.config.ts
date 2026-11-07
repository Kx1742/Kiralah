import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Migrations bypass Neon's pooler; `prisma generate` needs no URL at all.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
