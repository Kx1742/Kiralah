import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  type Browser,
  expect,
  type Page,
  test,
} from "@playwright/test";

// Long enough for the 3-second poll to bring another phone's change in.
const LIVE = { timeout: 10_000 };

const nett = {
  pricesIncludeCharges: true,
  serviceChargeBasisPoints: 0,
  serviceTaxBasisPoints: 0,
  taxOnServiceCharge: true,
  discountTiming: "beforeCharges",
};

const itemisedBill = (friends: { id: string; name: string }[]) => ({
  mode: "itemised",
  payerId: "payer",
  people: [{ id: "payer", name: "Ali" }, ...friends],
  cashRounding: false,
  items: [
    {
      id: "nasi",
      name: "Nasi lemak",
      quantity: 1,
      unitPriceSen: 1000,
      portions: [],
    },
    {
      id: "teh",
      name: "Teh tarik",
      quantity: 2,
      unitPriceSen: 250,
      portions: [],
    },
  ],
  discounts: [],
  charges: nett,
  adjustments: [],
});

async function createBill(request: APIRequestContext, bill: object) {
  const response = await request.post("/api/bills", {
    data: {
      locale: "en",
      restaurantName: "Kopitiam Lah",
      bill,
      payment: { bankName: "Maybank", accountNumber: "1234 5678 9012" },
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as { id: string; editToken: string };
}

async function join(request: APIRequestContext, id: string, body: object) {
  const response = await request.post(`/api/bills/${id}/join`, { data: body });
  return {
    status: response.status(),
    ...((await response.json()) as { token?: string }),
  };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Opens the bill on a "phone" that holds the payer's edit token. */
async function payerPhone(
  browser: Browser,
  id: string,
  editToken: string,
): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
  });
  await context.addInitScript(
    ([billId, token]) => {
      localStorage.setItem(`splitlah:bill:${billId}`, JSON.stringify(token));
      Object.defineProperty(navigator, "share", {
        value: undefined,
        configurable: true,
      });
    },
    [id, editToken],
  );
  const page = await context.newPage();
  await page.goto(`/b/${id}`);
  return page;
}

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

test("a friend picks dishes and pays, and the payer sees it live", async ({
  page,
  browser,
  request,
}) => {
  const { id, editToken } = await createBill(
    request,
    itemisedBill([{ id: "bee", name: "Bee" }]),
  );
  const payer = await payerPhone(browser, id, editToken);
  await expect(payer.getByTestId("friend-Bee")).toContainText(
    "Hasn't picked dishes",
  );

  await page.goto(`/b/${id}`);
  await expect(
    page.getByRole("heading", { name: "Who are you?" }),
  ).toBeVisible();
  await noSidewaysScroll(page);
  await noAxeViolations(page);
  await page.getByRole("button", { name: "Bee" }).click();

  await expect(page.getByText("Hi Bee!")).toBeVisible();
  await expect(
    page.getByText("Tap the dishes you had to see what you pay."),
  ).toBeVisible();
  await page.getByRole("button", { name: /Nasi lemak/ }).click();
  await expect(page.getByTestId("you-pay")).toHaveText("You pay Ali RM10.00");

  await page.getByRole("button", { name: "Who shared?" }).nth(1).click();
  const sharers = page.getByRole("group", { name: "Who shared Teh tarik?" });
  await sharers.getByRole("button", { name: "You" }).click();
  await sharers.getByRole("button", { name: "Ali" }).click();
  await expect(page.getByTestId("you-pay")).toHaveText("You pay Ali RM12.50");
  await expect(page.getByText("1234 5678 9012")).toBeVisible();
  await noSidewaysScroll(page);
  await noAxeViolations(page);

  await page.getByRole("button", { name: "I've paid ✅" }).click();
  await expect(page.getByText("You've paid. Thanks!")).toBeVisible();

  // The payer's phone catches up through polling, without a reload.
  await expect(payer.getByTestId("friend-Bee")).toContainText("Paid ✅", LIVE);
  await expect(payer.getByTestId("collected")).toHaveText(
    "Collected RM12.50 of RM12.50",
    LIVE,
  );
  await expect(
    payer.getByRole("button", { name: /Teh tarik/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await noSidewaysScroll(payer);
  await noAxeViolations(payer);

  // A friend's choice survives a reload on their own phone.
  await page.reload();
  await expect(page.getByText("You've paid. Thanks!")).toBeVisible();
  await payer.context().close();
});

test("the server enforces who may change what", async ({ request }) => {
  const { id, editToken } = await createBill(
    request,
    itemisedBill([
      { id: "bee", name: "Bee" },
      { id: "chong", name: "Chong" },
    ]),
  );
  const bee = await join(request, id, { personId: "bee" });
  expect(bee.status).toBe(201);
  const beeToken = bee.token!;
  const put = (path: string, data: object, token?: string) =>
    request.put(`/api/bills/${id}/${path}`, {
      data,
      headers: token ? auth(token) : {},
    });

  // No token: nobody can change anything.
  expect(
    (
      await put("claims", { itemId: "nasi", personId: "bee", had: true })
    ).status(),
  ).toBe(401);
  // A friend can say who had a dish, and mark only themselves as paid.
  expect(
    (
      await put(
        "claims",
        { itemId: "nasi", personId: "bee", had: true },
        beeToken,
      )
    ).status(),
  ).toBe(204);
  expect(
    (await put("paid", { personId: "chong", paid: true }, beeToken)).status(),
  ).toBe(403);
  expect(
    (await put("paid", { personId: "bee", paid: true }, beeToken)).status(),
  ).toBe(204);
  // Only the payer can change items and prices, or mark others as paid.
  const edit = await request.put(`/api/bills/${id}`, {
    data: { locale: "en", bill: itemisedBill([]), payment: {}, keepQr: false },
    headers: auth(beeToken),
  });
  expect(edit.status()).toBe(403);
  expect(
    (await put("paid", { personId: "chong", paid: true }, editToken)).status(),
  ).toBe(204);

  // A name can only be picked by one phone, until the payer lets it be picked again.
  expect((await join(request, id, { personId: "bee" })).status).toBe(409);
  expect((await join(request, id, { personId: "payer" })).status).toBe(403);
  const reset = (token: string) =>
    request.post(`/api/bills/${id}/people/bee/reset`, { headers: auth(token) });
  expect((await reset(beeToken)).status()).toBe(403);
  expect((await reset(editToken)).status()).toBe(204);
  expect((await join(request, id, { personId: "bee" })).status).toBe(201);

  // Polling costs almost nothing when nothing changed.
  const state = await request.get(`/api/bills/${id}`);
  const etag = state.headers()["etag"]!;
  const again = await request.get(`/api/bills/${id}`, {
    headers: { "If-None-Match": etag },
  });
  expect(again.status()).toBe(304);
  expect(JSON.stringify(await state.json())).not.toContain("tokenHash");
});

test("a friend who isn't on the list adds their own name", async ({
  page,
  browser,
  request,
}) => {
  const { id } = await createBill(request, itemisedBill([]));
  await page.goto(`/b/${id}`);
  await page.getByLabel("Your name").fill("Devi");
  await page.getByRole("button", { name: "That's me" }).click();
  await expect(page.getByText("Hi Devi!")).toBeVisible();

  const otherPhone = await browser.newPage();
  await otherPhone.goto(`/b/${id}`);
  await expect(otherPhone.getByRole("button", { name: /Devi/ })).toBeDisabled();
  await expect(otherPhone.getByText("On another phone")).toBeVisible();
  await otherPhone.close();
});

test("equal split: a friend types their name and sees their share", async ({
  page,
  browser,
  request,
}) => {
  const { id, editToken } = await createBill(request, {
    mode: "equal",
    payerId: "payer",
    people: [
      { id: "payer", name: "Ali" },
      { id: "friend-2", name: "Friend 2" },
      { id: "friend-3", name: "Friend 3" },
    ],
    cashRounding: false,
    totalSen: 10_000,
  });
  await page.goto(`/b/${id}`);
  await page.getByLabel("Your name").fill("Bee");
  await page.getByRole("button", { name: "That's me" }).click();
  await expect(page.getByTestId("you-pay")).toHaveText("You pay Ali RM33.33");

  const payer = await payerPhone(browser, id, editToken);
  await expect(payer.getByTestId("friend-Bee")).toContainText("Owes RM33.33");
  await expect(payer.getByTestId("friend-Friend 3")).toContainText(
    "Hasn't opened the link",
  );
  await payer.context().close();
});

test("the payer edits a price and friends see the new amount", async ({
  page,
  browser,
  request,
}) => {
  const { id, editToken } = await createBill(
    request,
    itemisedBill([{ id: "bee", name: "Bee" }]),
  );
  const bee = await join(request, id, { personId: "bee" });
  await request.put(`/api/bills/${id}/claims`, {
    data: { itemId: "nasi", personId: "bee", had: true },
    headers: auth(bee.token!),
  });
  await page.addInitScript(
    ([billId, stored]) =>
      localStorage.setItem(`splitlah:person:${billId}`, stored),
    [id, JSON.stringify({ personId: "bee", token: bee.token })] as const,
  );
  await page.goto(`/b/${id}`);
  await expect(page.getByTestId("you-pay")).toHaveText("You pay Ali RM10.00");

  const payer = await payerPhone(browser, id, editToken);
  await payer.getByRole("link", { name: "Edit bill" }).click();
  await expect(payer.getByLabel("Name of dish 1")).toHaveValue("Nasi lemak");
  await payer.getByLabel("Each (RM)").first().fill("12");
  for (let step = 0; step < 4; step++) {
    await payer.getByRole("button", { name: "Next" }).click();
  }
  await expect(payer.getByLabel("Account number")).toHaveValue(
    "1234 5678 9012",
  );
  await payer.getByRole("button", { name: "Save changes" }).click();
  await expect(payer).toHaveURL(new RegExp(`/b/${id}$`));
  await expect(payer.getByTestId("bill-total")).toHaveText("RM17.00");

  // Bee's pick survived the edit, and Bee's phone shows the new price by itself.
  await expect(page.getByTestId("you-pay")).toHaveText(
    "You pay Ali RM12.00",
    LIVE,
  );
  await payer.context().close();
});

test("a friend's phone cannot open the edit screen", async ({
  page,
  request,
}) => {
  const { id } = await createBill(request, itemisedBill([]));
  await page.goto(`/b/${id}/edit`);
  await expect(
    page.getByText("Only Ali can edit this bill, from the phone that made it."),
  ).toBeVisible();
});

test("reminders carry each person's exact amount", async ({
  browser,
  request,
}) => {
  const { id, editToken } = await createBill(
    request,
    itemisedBill([
      { id: "bee", name: "Bee" },
      { id: "chong", name: "Chong" },
    ]),
  );
  const bee = await join(request, id, { personId: "bee" });
  await request.put(`/api/bills/${id}/claims`, {
    data: { itemId: "nasi", personId: "bee", had: true },
    headers: auth(bee.token!),
  });

  const payer = await payerPhone(browser, id, editToken);
  await expect(
    payer.getByText("RM5.00 of dishes not picked yet:"),
  ).toBeVisible();
  await payer.route("https://wa.me/**", (route) => route.abort());
  const sent = payer.waitForRequest((candidate) =>
    candidate.url().startsWith("https://wa.me/"),
  );
  await payer.getByRole("button", { name: "Remind everyone" }).click();
  const text = new URL((await sent).url()).searchParams.get("text")!;
  expect(text).toContain("Reminder for Makan at Kopitiam Lah:");
  expect(text).toContain("• Bee: RM10.00");
  expect(text).toContain("• Chong: please pick your dishes");
  expect(text).toContain(`/b/${id}`);
  await payer.context().close();
});
