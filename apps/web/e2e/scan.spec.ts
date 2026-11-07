import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// A 1×1 PNG: the phone shrinks it and sends it, and the test answers for Claude.
const photo = {
  name: "receipt.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==",
    "base64",
  ),
};

const receipt = {
  isReceipt: true,
  restaurantName: "Restoran ABC",
  items: [
    { name: "Nasi Lemak Ayam", quantity: 1, lineTotal: "15.90" },
    { name: "Teh Tarik", quantity: 2, lineTotal: "5.00" },
    { name: "??", quantity: 1, lineTotal: "smudged" },
  ],
  subtotal: "20.90",
  serviceCharge: { ratePercent: "10", amount: "2.09" },
  serviceTax: { ratePercent: "6", amount: "1.38" },
  pricesIncludeTax: false,
  discounts: [],
  rounding: null,
  total: "26.37",
};

test("a scanned receipt fills in the dishes for the payer to check", async ({
  page,
}) => {
  let sent: { image?: string } = {};
  await page.route("**/api/receipt", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { receipt } });
  });
  await page.goto("/new");
  await expect(page.getByText("Got the receipt?")).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);

  await page.getByTestId("receipt-file").setInputFiles(photo);
  await expect(
    page.getByText("We read 2 dishes.", { exact: false }),
  ).toBeVisible();
  expect(sent.image).toMatch(/^data:image\/jpeg;base64,/);

  await expect(page.getByLabel("Restaurant (optional)")).toHaveValue(
    "Restoran ABC",
  );
  await expect(page.getByLabel("Name of dish 1")).toHaveValue(
    "Nasi Lemak Ayam",
  );
  await expect(page.getByLabel("Name of dish 2")).toHaveValue("Teh Tarik");
  await expect(
    page.getByText("1 line couldn't be read. Add them below."),
  ).toBeVisible();
  // 20.90 + 2.09 + 1.38 = 24.37, but the receipt says 26.37: the payer is warned.
  await expect(
    page.getByText("These come to RM24.37, but the receipt says RM26.37.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText("Got the receipt?")).toHaveCount(0);
});

test("without receipt reading, the payer is told to type instead", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/receipt", {
    data: { image: "data:image/png;base64,AAAA" },
  });
  expect(response.status()).toBe(503);
  expect(await response.json()).toEqual({ error: "unavailable" });

  await page.goto("/new");
  await page.getByTestId("receipt-file").setInputFiles(photo);
  await expect(
    page.getByText(
      "Receipt reading isn't available right now. Please type the dishes below.",
    ),
  ).toBeVisible();
  await page.getByLabel("Dish", { exact: true }).fill("Kopi");
  await expect(page.getByLabel("Dish", { exact: true })).toHaveValue("Kopi");
});
