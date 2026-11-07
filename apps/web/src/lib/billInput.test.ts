import { emptyEqualDraftBill, itemisedBill } from "./testBills";
import { describe, expect, it } from "vitest";
import {
  createBillInputSchema,
  decodeQrImage,
  MAX_QR_BYTES,
} from "./billInput";

const input = (change: object = {}) => ({
  locale: "en",
  restaurantName: "Restoran ABC",
  bill: itemisedBill,
  payment: {},
  ...change,
});

describe("createBillInputSchema", () => {
  it("accepts a new bill", () => {
    expect(createBillInputSchema.safeParse(input()).success).toBe(true);
    expect(
      createBillInputSchema.safeParse(input({ bill: emptyEqualDraftBill }))
        .success,
    ).toBe(true);
  });

  it.each([
    ["no items", { bill: { ...itemisedBill, items: [] } }],
    [
      "dishes already claimed",
      {
        bill: {
          ...itemisedBill,
          items: [
            {
              ...itemisedBill.items[0],
              portions: [{ personId: "payer", portions: 1 }],
            },
          ],
        },
      },
    ],
    [
      "an equal split with no total",
      { bill: { ...emptyEqualDraftBill, totalSen: 0 } },
    ],
    [
      "an equal split of one",
      {
        bill: {
          ...emptyEqualDraftBill,
          people: [emptyEqualDraftBill.people[0]],
        },
      },
    ],
    ["an unknown language", { locale: "fr" }],
    [
      "a script as an account number",
      { payment: { accountNumber: "<script>" } },
    ],
    ["unknown fields", { admin: true }],
  ])("rejects %s", (_name, change) => {
    expect(createBillInputSchema.safeParse(input(change)).success).toBe(false);
  });
});

describe("decodeQrImage", () => {
  const dataUrl = (bytes: number[], type = "image/png") =>
    `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a];

  it("accepts real images and reads their true type", () => {
    expect(decodeQrImage(dataUrl(png))?.type).toBe("image/png");
    expect(
      decodeQrImage(dataUrl([0xff, 0xd8, 0xff, 0xe0], "image/jpeg"))?.type,
    ).toBe("image/jpeg");
    expect(decodeQrImage(dataUrl(png, "image/jpeg"))?.type).toBe("image/png");
  });

  it("rejects anything else", () => {
    expect(decodeQrImage("not a data url")).toBeNull();
    expect(decodeQrImage(dataUrl([1, 2, 3, 4]))).toBeNull();
    expect(decodeQrImage(dataUrl(png, "image/svg+xml"))).toBeNull();
    expect(
      decodeQrImage(dataUrl(new Array(MAX_QR_BYTES + 1).fill(0x89))),
    ).toBeNull();
  });
});
