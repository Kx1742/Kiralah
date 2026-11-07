import { expect, test } from "@playwright/test";

const LIVE = { timeout: 10_000 };

/**
 * The whole story at phone size, through the screens only: the payer makes a bill,
 * a friend on another phone picks their dishes and pays, and the payer sees it.
 */
test("payer creates a bill, a friend picks and pays, the payer sees ✅", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Split a bill" }).click();
  await page.getByLabel("Restaurant (optional)").fill("Restoran ABC");
  for (const [dish, price] of [
    ["Nasi lemak", "15"],
    ["Teh tarik", "2.50"],
  ] as const) {
    await page.getByLabel("Dish", { exact: true }).fill(dish);
    await page.getByLabel("Price (RM)").fill(price);
    await page.getByLabel("Price (RM)").press("Enter");
  }
  const next = page.getByRole("button", { name: "Next" });
  await next.click();
  await next.click();
  await page.getByLabel("Your name").fill("Ali");
  await page.getByLabel("Friend's name").fill("Bee");
  await next.click();
  await next.click();
  await page.getByRole("button", { name: "Create bill" }).click();
  await expect(page).toHaveURL(/\/b\/[0-9A-Za-z]{16}$/);
  const link = await page.getByTestId("bill-link").textContent();

  // The payer had the teh tarik.
  await page.getByRole("button", { name: /Teh tarik/ }).click();

  const friendContext = await browser.newContext({
    viewport: { width: 360, height: 640 },
  });
  const friend = await friendContext.newPage();
  await friend.goto(link!);
  await friend.getByRole("button", { name: "Bee" }).click();
  await friend.getByRole("button", { name: /Nasi lemak/ }).click();
  // RM15 + 10% service + 6% SST on it: RM17.49.
  await expect(friend.getByTestId("you-pay")).toHaveText("You pay Ali RM17.49");
  await friend.getByRole("button", { name: "I've paid ✅" }).click();

  await expect(page.getByTestId("friend-Bee")).toContainText("Paid ✅", LIVE);
  await expect(page.getByTestId("collected")).toHaveText(
    "Collected RM17.49 of RM17.49",
    LIVE,
  );

  // Deleting the bill: a second tap confirms, and the friend's phone hears about it.
  await page.getByRole("button", { name: "Delete bill" }).click();
  await page
    .getByRole("button", { name: "Tap again to delete for everyone" })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    friend.getByText("This bill was deleted or has expired."),
  ).toBeVisible(LIVE);
  await friendContext.close();
});
