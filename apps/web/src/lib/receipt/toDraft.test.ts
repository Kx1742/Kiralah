import { calculateBill } from "@kiralah/core";
import { describe, expect, it } from "vitest";
import { emptyItemisedDraft, itemisedDraftToBill } from "../draft";
import type { ScannedReceipt } from "./schema";
import { receiptToDraft } from "./toDraft";

let next = 0;
const newId = () => `scan-${next++}`;

const base: ScannedReceipt = {
  isReceipt: true,
  restaurantName: " Restoran ABC ",
  items: [],
  subtotal: null,
  serviceCharge: null,
  serviceTax: null,
  pricesIncludeTax: false,
  discounts: [],
  rounding: null,
  total: null,
};

const labels = {
  payer: "Me",
  adjustment: "Adjustment",
  voucher: () => "Voucher",
};

/** The real check: does the scanned draft add up to what the receipt says? */
function totalOf(receipt: ScannedReceipt): number {
  const { change } = receiptToDraft(receipt, newId);
  const draft = { ...emptyItemisedDraft(), ...change, payerName: "Ali" };
  return calculateBill(itemisedDraftToBill(draft, labels)).totalSen;
}

describe("receiptToDraft", () => {
  it("adds up a restaurant receipt with 10% service and 6% SST", () => {
    const receipt: ScannedReceipt = {
      ...base,
      items: [
        { name: "Butter chicken", quantity: 1, lineTotal: "28.90" },
        { name: "Nasi goreng", quantity: 1, lineTotal: "15.90" },
        { name: "Sotong goreng", quantity: 1, lineTotal: "24.90" },
        { name: "Ice lemon tea", quantity: 3, lineTotal: "13.50" },
      ],
      subtotal: "83.20",
      serviceCharge: { ratePercent: "10", amount: "8.32" },
      serviceTax: { ratePercent: "6", amount: "5.49" },
      total: "97.01",
    };
    expect(totalOf(receipt)).toBe(9701);
    const { change, itemsRead } = receiptToDraft(receipt, newId);
    expect(itemsRead).toBe(4);
    expect(change.items![3]).toMatchObject({
      name: "Ice lemon tea",
      quantity: 3,
      priceText: "4.50",
    });
    expect(change.restaurantName).toBe("Restoran ABC");
    expect(change.receiptTotalText).toBe("97.01");
  });

  it("works out rates that aren't printed, from the amounts", () => {
    const { change } = receiptToDraft(
      {
        ...base,
        items: [{ name: "Laksa", quantity: 1, lineTotal: "50.00" }],
        serviceCharge: { ratePercent: null, amount: "5.00" },
        serviceTax: { ratePercent: null, amount: "3.30" },
      },
      newId,
    );
    expect(change).toMatchObject({ serviceRateText: "10", taxRateText: "6" });
  });

  it("handles SST only, with a voucher and a rounding line", () => {
    const receipt: ScannedReceipt = {
      ...base,
      items: [
        { name: "Char kuey teow", quantity: 2, lineTotal: "22.00" },
        { name: "Teh ais", quantity: 2, lineTotal: "6.60" },
      ],
      serviceTax: { ratePercent: "6", amount: "1.42" },
      discounts: [{ label: "Voucher RM5", amount: "5.00" }],
      rounding: "-0.02",
      total: "25.00",
    };
    expect(totalOf(receipt)).toBe(2500);
    const { change } = receiptToDraft(receipt, newId);
    expect(change).toMatchObject({
      serviceOn: false,
      taxOn: true,
      cashRounding: true,
    });
  });

  it("keeps a price that doesn't divide evenly as one line", () => {
    const { change } = receiptToDraft(
      { ...base, items: [{ name: "Kuih", quantity: 3, lineTotal: "10.00" }] },
      newId,
    );
    expect(change.items).toEqual([
      expect.objectContaining({
        name: "3 × Kuih",
        quantity: 1,
        priceText: "10.00",
      }),
    ]);
  });

  it("skips lines it can't read and says how many", () => {
    const result = receiptToDraft(
      {
        ...base,
        items: [
          { name: "Kopi", quantity: 1, lineTotal: "2.50" },
          { name: "Smudged", quantity: 1, lineTotal: "?.50" },
          { name: "", quantity: 1, lineTotal: "3.00" },
        ],
      },
      newId,
    );
    expect(result.itemsRead).toBe(1);
    expect(result.linesSkipped).toBe(2);
  });

  it("treats inclusive prices as nett", () => {
    const { change } = receiptToDraft(
      {
        ...base,
        items: [{ name: "Kopi", quantity: 1, lineTotal: "2.50" }],
        pricesIncludeTax: true,
      },
      newId,
    );
    expect(change.pricesIncludeCharges).toBe(true);
  });
});
