import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      // Cheap Android phone: the narrowest screen we promise to support.
      name: "android-360",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 360, height: 640 },
      },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    port,
    env: {
      BILL_CREATE_HOURLY_LIMIT: "100000",
      CRON_SECRET: "test-cron-secret",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
