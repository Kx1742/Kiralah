import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("fits a 360px phone with no sideways scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "SplitLah" })).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
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
