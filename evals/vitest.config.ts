import path from "node:path";
import { defineConfig } from "vitest/config";

const web = path.join(import.meta.dirname, "../apps/web");

export default defineConfig({
  root: import.meta.dirname,
  resolve: { alias: { "@": path.join(web, "src") } },
  test: {
    include: ["receipts.eval.ts"],
    testTimeout: 120_000,
    fileParallelism: false,
  },
});
