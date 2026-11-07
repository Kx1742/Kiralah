import { describe, expect, it } from "vitest";
import type { ScannedReceipt } from "./schema";
import { type ExpectedReceipt, nameSimilarity, scoreReceipt } from "./score";

const expected: ExpectedReceipt = {
  source: "synthetic",
  language: "en",
  restaurantName: "Restoran ABC",
  items: [
    { name: "Nasi Lemak Ayam", quantity: 1, lineTotal: "15.90" },
    { name: "Teh Tarik", quantity: 2, lineTotal: "5.00" },
    { name: "叉烧饭", quantity: 1, lineTotal: "12.00" },
  ],
  serviceCharge: "3.29",
  serviceTax: "2.17",
  total: "38.36",
};

const scanned: ScannedReceipt = {
  isReceipt: true,
  restaurantName: "RESTORAN ABC",
  items: [
    { name: "NASI LEMAK AYAM", quantity: 1, lineTotal: "15.90" },
    { name: "Teh Tarik", quantity: 2, lineTotal: "5.50" },
    { name: "Kopi", quantity: 1, lineTotal: "2.50" },
  ],
  subtotal: null,
  serviceCharge: { ratePercent: "10", amount: "3.29" },
  serviceTax: { ratePercent: "6", amount: "2.17" },
  pricesIncludeTax: false,
  discounts: [],
  rounding: null,
  total: "38.36",
};

describe("scoreReceipt", () => {
  it("counts dishes found, prices right, extras, charges and total", () => {
    expect(scoreReceipt(expected, scanned)).toEqual({
      itemsExpected: 3,
      itemsFound: 2,
      pricesCorrect: 1,
      extraItems: 1,
      chargesCorrect: true,
      totalCorrect: true,
    });
  });

  it("matches names regardless of case, spacing and script", () => {
    expect(nameSimilarity("Nasi Lemak", "NASI  LEMAK")).toBe(1);
    expect(nameSimilarity("叉烧饭", "叉烧饭 (大)")).toBe(1);
    expect(nameSimilarity("Teh Tarik", "Roti Canai")).toBeLessThan(0.5);
  });
});
