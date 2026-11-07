import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const noAxeViolations = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
};

const noSidewaysScroll = async (page: Page) => {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
};

async function addDish(page: Page, name: string, price: string) {
  await page.getByLabel("Dish", { exact: true }).fill(name);
  await page.getByLabel("Dish", { exact: true }).press("Enter");
  await expect(page.getByLabel("Price (RM)")).toBeFocused();
  await page.getByLabel("Price (RM)").fill(price);
  await page.getByLabel("Price (RM)").press("Enter");
  await expect(page.getByLabel("Dish", { exact: true })).toBeFocused();
}

const next = (page: Page) => page.getByRole("button", { name: "Next" }).click();
const runningTotal = (page: Page) => page.getByTestId("running-total");

test("payer creates an itemised bill and gets a share link", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Split a bill" }).click();
  await expect(
    page.getByRole("heading", { name: "What did you eat?" }),
  ).toBeVisible();
  await noSidewaysScroll(page);
  await noAxeViolations(page);

  await page.getByLabel("Restaurant (optional)").fill("Restoran ABC");
  await addDish(page, "Nasi lemak", "15");
  await addDish(page, "Teh tarik", "2.50");
  await page.getByRole("button", { name: "More Teh tarik" }).click();
  // RM20 food + 10% + 6% SST on RM22 = RM23.32
  await expect(runningTotal(page)).toHaveText("RM23.32");
  await noSidewaysScroll(page);
  await noAxeViolations(page);

  await next(page);
  await expect(page.getByLabel("Service charge rate (%)")).toHaveValue("10");
  await expect(page.getByLabel("SST rate (%)")).toHaveValue("6");
  await noSidewaysScroll(page);
  await noAxeViolations(page);
  await next(page);

  await next(page);
  await expect(page.getByText("Please enter your name.")).toBeVisible();
  await page.getByLabel("Your name").fill("Ali");
  await page.getByLabel("Friend's name").fill("Bee");
  await page.getByRole("button", { name: "Add friend" }).click();
  await expect(page.getByText("Bee", { exact: true })).toBeVisible();
  await noSidewaysScroll(page);
  await noAxeViolations(page);
  await next(page);

  await page.getByRole("button", { name: "Add voucher" }).click();
  await page.getByLabel("Percent off").fill("10");
  await expect(page.getByText("Saves RM2.00")).toBeVisible();
  await expect(runningTotal(page)).toHaveText("RM20.99");
  await noSidewaysScroll(page);
  await noAxeViolations(page);
  await next(page);

  await page.getByRole("radio", { name: "Bank" }).click();
  await page.getByLabel("Bank name").fill("Maybank");
  await page.getByLabel("Account number").fill("1234 5678 9012");
  await noSidewaysScroll(page);
  await noAxeViolations(page);
  await page.getByRole("button", { name: "Create bill" }).click();

  await expect(page).toHaveURL(/\/b\/[0-9A-Za-z]{16}$/);
  await expect(
    page.getByRole("heading", { name: "Makan at Restoran ABC" }),
  ).toBeVisible();
  await expect(page.getByTestId("bill-total")).toHaveText("RM20.99");
  await expect(
    page.getByRole("button", { name: "Share to WhatsApp" }),
  ).toBeVisible();
  await noSidewaysScroll(page);
  await noAxeViolations(page);

  // A friend on another device has no edit token, so sees no payer controls.
  const friend = await page.context().browser()!.newContext();
  const friendPage = await friend.newPage();
  await friendPage.goto(page.url());
  await expect(friendPage.getByTestId("bill-total")).toHaveText("RM20.99");
  await expect(
    friendPage.getByRole("button", { name: "Share to WhatsApp" }),
  ).toHaveCount(0);
  await friend.close();
});

test("WhatsApp message and link preview use the bill's details", async ({
  page,
  request,
}) => {
  await page.goto("/new");
  await page.getByLabel("Restaurant (optional)").fill("Kopitiam Lah");
  await addDish(page, "Kopi", "10");
  await next(page);
  await next(page);
  await page.getByLabel("Your name").fill("Ali");
  await next(page);
  await next(page);

  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
  });
  await page.getByRole("button", { name: "Create bill" }).click();
  await expect(page).toHaveURL(/\/b\/[0-9A-Za-z]{16}$/);
  const url = page.url();
  const path = new URL(url).pathname;
  const id = path.split("/").pop()!;

  const html = await (
    await request.get(path, { headers: { "Accept-Language": "" } })
  ).text();
  expect(html).toContain(
    'property="og:title" content="Makan at Kopitiam Lah — RM11.66"',
  );
  expect(html).toContain('property="og:description"');
  expect(html).toContain(`/api/og/${id}`);
  expect(html).toContain('name="robots" content="noindex, nofollow"');

  const image = await request.get(`/api/og/${id}`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
  });
  await page.reload();
  await page.route("https://wa.me/**", (route) => route.abort());
  const request2 = page.waitForRequest((candidate) =>
    candidate.url().startsWith("https://wa.me/"),
  );
  await page.getByRole("button", { name: "Share to WhatsApp" }).click();
  const shared = new URL((await request2).url()).searchParams.get("text")!;
  expect(shared).toBe(
    `🍛 Makan at Kopitiam Lah — RM11.66. Tap to see your share & pay Ali: ${url}`,
  );
});

test("drafts survive a reload, Back keeps everything, and Undo restores a dish", async ({
  page,
}) => {
  await page.goto("/new");
  await addDish(page, "Roti canai", "2");
  await page.getByRole("button", { name: "Remove Roti canai" }).click();
  await expect(page.getByLabel("Name of dish 1")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByLabel("Name of dish 1")).toHaveValue("Roti canai");

  await next(page);
  await page
    .getByRole("switch", { name: "Prices already include tax and service" })
    .click();
  await expect(runningTotal(page)).toHaveText("RM2.00");

  await page.reload();
  await expect(
    page.getByRole("switch", {
      name: "Prices already include tax and service",
    }),
  ).toHaveAttribute("aria-checked", "true");

  await page.goBack();
  await expect(page.getByLabel("Name of dish 1")).toHaveValue("Roti canai");
  await page.goto("/");
  await page.getByRole("link", { name: "Split a bill" }).click();
  await expect(runningTotal(page)).toHaveText("RM2.00");
});

test("anything typed but not added is kept when you tap Next", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByLabel("Dish", { exact: true }).fill("Cendol");
  await next(page);
  await expect(
    page.getByText(
      "Finish the dish you're typing: it needs a name and a price.",
    ),
  ).toBeVisible();

  await page.getByLabel("Price (RM)").fill("6");
  await next(page);
  await expect(
    page.getByRole("heading", { name: "Service charge and tax" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Name of dish 1")).toHaveValue("Cendol");
  await next(page);
  await next(page);

  await page.getByLabel("Your name").fill("Ali");
  await page.getByLabel("Friend's name").fill("Bee");
  await next(page);
  await page.goBack();
  await expect(page.getByText("Bee", { exact: true })).toBeVisible();
});

test("start over needs a second tap and keeps the payer's details", async ({
  page,
}) => {
  await page.goto("/new");
  await addDish(page, "Kopi", "3");
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByLabel("Name of dish 1")).toHaveValue("Kopi");
  await page
    .getByRole("button", { name: "Tap again to clear this bill" })
    .click();
  await expect(page.getByLabel("Name of dish 1")).toHaveCount(0);
  await expect(runningTotal(page)).toHaveText("RM0.00");
});

test("receipt check warns and one tap fixes it", async ({ page }) => {
  await page.goto("/new");
  await addDish(page, "Tom yam", "15.30");
  await addDish(page, "Pad thai", "20");
  await next(page);
  await expect(runningTotal(page)).toHaveText("RM41.16");

  await page.getByLabel("Total on receipt (optional)").fill("41.15");
  await expect(
    page.getByText("The receipt is RM0.01 lower than our total."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use 5-sen cash rounding" }).click();
  await expect(runningTotal(page)).toHaveText("RM41.15");
  await expect(page.getByText("Matches the receipt")).toBeVisible();

  await page.getByLabel("Total on receipt (optional)").fill("41.20");
  await page.getByRole("button", { name: "Add +RM0.05 adjustment" }).click();
  await expect(runningTotal(page)).toHaveText("RM41.20");
  await expect(page.getByText("Matches the receipt")).toBeVisible();
});

test("payment details are remembered on this device", async ({ page }) => {
  await page.goto("/new/equal");
  await page.getByLabel("Total (RM)").fill("100");
  await page.getByLabel("Your name").fill("Ali");
  await next(page);
  await page.getByRole("radio", { name: "Phone" }).click();
  await page.getByLabel("Phone number").fill("012-345 6789");
  await page.getByRole("button", { name: "Create bill" }).click();
  await expect(page).toHaveURL(/\/b\/[0-9A-Za-z]{16}$/);

  await page.goto("/new");
  await addDish(page, "Kopi", "3");
  await next(page);
  await next(page);
  await expect(page.getByLabel("Your name")).toHaveValue("Ali");
  await next(page);
  await next(page);
  await expect(page.getByLabel("Phone number")).toHaveValue("012-345 6789");
});

test("quick mode splits equally", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Just split equally" }).click();
  await noSidewaysScroll(page);
  await noAxeViolations(page);
  await page.getByLabel("Total (RM)").fill("100");
  await page.getByRole("button", { name: "One more person" }).click();
  await expect(page.getByText("About RM33.33 each")).toBeVisible();
  await page.getByLabel("Your name").fill("Ali");
  await next(page);
  await page.getByRole("button", { name: "Create bill" }).click();
  await expect(page).toHaveURL(/\/b\/[0-9A-Za-z]{16}$/);
  await expect(page.getByTestId("bill-total")).toHaveText("RM100.00");
  await expect(
    page.getByText("Split equally among 3 people: about RM33.33 each."),
  ).toBeVisible();
});

test("a QR image can be uploaded and is served back", async ({
  page,
  request,
}) => {
  await page.goto("/new/equal");
  await page.getByLabel("Total (RM)").fill("50");
  await page.getByLabel("Your name").fill("Ali");
  await next(page);

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "duitnow.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(
    page.getByRole("img", { name: "Your DuitNow QR" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create bill" }).click();
  await expect(page).toHaveURL(/\/b\/[0-9A-Za-z]{16}$/);

  const id = new URL(page.url()).pathname.split("/").pop()!;
  const qr = await request.get(`/api/bills/${id}/qr`);
  expect(qr.status()).toBe(200);
  expect(qr.headers()["content-type"]).toBe("image/jpeg");
  expect(qr.headers()["x-content-type-options"]).toBe("nosniff");
});

test("the API refuses bad bills", async ({ request }) => {
  const bad = await request.post("/api/bills", {
    data: { locale: "en", bill: { mode: "nope" } },
  });
  expect(bad.status()).toBe(400);

  const missing = await request.get("/api/bills/0000000000000000/qr");
  expect(missing.status()).toBe(404);
});

test("an unknown bill shows the friendly page", async ({ page }) => {
  const response = await page.goto("/b/0000000000000000");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
});

test("works in Bahasa Melayu and Chinese without sideways scroll", async ({
  browser,
}) => {
  for (const [locale, heading] of [
    ["ms-MY", "Apa yang anda makan?"],
    ["zh-CN", "你们吃了什么？"],
  ] as const) {
    const context = await browser.newContext({
      locale,
      viewport: { width: 360, height: 640 },
    });
    const page = await context.newPage();
    await page.goto(`http://localhost:3100/new`);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await noSidewaysScroll(page);
    await context.close();
  }
});
