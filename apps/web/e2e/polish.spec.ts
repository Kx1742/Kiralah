import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const noSidewaysScroll = async (page: Page) => {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
};

const noAxeViolations = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
};

const pages = ["/", "/new", "/new#charges", "/new/equal"];

for (const theme of ["dark", "light"] as const) {
  test(`${theme} colours pass contrast checks on every screen`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await noAxeViolations(page);
    }
  });
}

test("large text fits a 360px phone with no sideways scroll", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "splitlah:display",
      JSON.stringify({ theme: "system", text: "large" }),
    ),
  );
  for (const path of pages) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-text", "large");
    await noSidewaysScroll(page);
  }
});

test("display settings apply at once and are remembered", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Text size and colours" }).click();
  await page.getByRole("radio", { name: "Large" }).click();
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text", "large");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("the app can be installed, and works out the offline page", async ({
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const body = await manifest.json();
  expect(body.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512"]),
  );
  for (const file of [
    "/sw.js",
    "/offline.html",
    "/icon-192.png",
    "/icon-512.png",
  ]) {
    expect((await request.get(file)).status()).toBe(200);
  }
});

test("going offline shows a plain message", async ({ page, context }) => {
  await page.goto("/new");
  await context.setOffline(true);
  await expect(
    page.getByText("You're offline. Your work is saved on this phone", {
      exact: false,
    }),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByText("You're offline. Your work is saved on this phone", {
      exact: false,
    }),
  ).toHaveCount(0);
});

test("the daily cleanup only runs with the cron secret", async ({
  request,
}) => {
  expect((await request.get("/api/cron/cleanup")).status()).toBe(401);
  const run = await request.get("/api/cron/cleanup", {
    headers: { Authorization: "Bearer test-cron-secret" },
  });
  expect(run.status()).toBe(200);
  expect(await run.json()).toEqual({
    bills: expect.any(Number),
    rateLimits: expect.any(Number),
  });
});
