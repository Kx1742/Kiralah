import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("fits a 360px phone with no sideways scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "KiraLah" })).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("shows both main buttons without scrolling", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Split a bill" })).toBeInViewport(
    { ratio: 1 },
  );
  await expect(
    page.getByRole("link", { name: "Just split equally" }),
  ).toBeInViewport({
    ratio: 1,
  });
});

test("has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test("table demo: tapping dishes shows what you pay", async ({ page }) => {
  await page.goto("/");
  const kopi = page.getByRole("button", { name: "Kopi, RM2.50" });
  const teh = page.getByRole("button", { name: "Teh tarik, RM3.00" });

  await expect(page.getByText("Try it: tap what you had")).toBeVisible();

  await kopi.click();
  await expect(kopi).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("You pay Ali RM2.50")).toBeVisible();

  await teh.click();
  await expect(page.getByText("You pay Ali RM5.50")).toBeVisible();

  await kopi.click();
  await expect(page.getByText("You pay Ali RM3.00")).toBeVisible();

  await teh.click();
  await expect(page.getByText("Try it: tap what you had")).toBeVisible();
});

test("still has no accessibility violations with dishes picked", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Kopi, RM2.50" }).click();
  await expect(page.getByText("You pay Ali RM2.50")).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test("the lamp, shutters and cat respond to taps", async ({ page }) => {
  await page.goto("/");
  const wall = page.locator("section[data-lamp]");
  const toys = wall.locator('button[tabindex="-1"]');

  await toys.nth(0).click();
  await expect(wall).toHaveAttribute("data-lamp", "off");

  await toys.nth(1).click();
  await toys.nth(2).click();

  await toys.nth(3).click();
  await expect(page.getByText("Meow!")).toBeVisible();
});

test.describe("language", () => {
  test.use({ locale: "ms-MY" });

  test("is detected from the phone", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "ms");
    await expect(page.getByText("Bahagi sama rata")).toBeVisible();
  });
});

test("switches in one tap, keeps the short URL, and is remembered", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Just split equally")).toBeVisible();

  await page.getByRole("button", { name: "简体中文" }).click();
  await expect(page.getByText("直接平分")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  expect(new URL(page.url()).pathname).toBe("/");

  await page.reload();
  await expect(page.getByText("直接平分")).toBeVisible();
});

test("unknown links get a friendly page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
});
