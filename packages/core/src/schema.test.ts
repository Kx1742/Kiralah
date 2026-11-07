import { describe, expect, it } from "vitest";
import { DEFAULT_CHARGES } from "./defaults";
import { billSchema } from "./schema";

const validBill = {
  mode: "itemised",
  payerId: "ali",
  people: [
    { id: "ali", name: "Ali" },
    { id: "bee", name: "Bee" },
  ],
  cashRounding: false,
  items: [
    {
      id: "a",
      name: "Nasi lemak",
      quantity: 1,
      unitPriceSen: 650,
      portions: [{ personId: "ali", portions: 1 }],
    },
  ],
  discounts: [],
  charges: DEFAULT_CHARGES,
  adjustments: [],
};

const withChange = (change: object) => ({ ...validBill, ...change });

describe("billSchema", () => {
  it("accepts a valid bill", () => {
    expect(billSchema.safeParse(validBill).success).toBe(true);
  });

  it("defaults to 10% service charge and 6% SST, taxed on the service charge", () => {
    expect(DEFAULT_CHARGES).toEqual({
      pricesIncludeCharges: false,
      serviceChargeBasisPoints: 1000,
      serviceTaxBasisPoints: 600,
      taxOnServiceCharge: true,
      discountTiming: "beforeCharges",
    });
  });

  it.each([
    [
      "money that is not whole sen",
      { items: [{ ...validBill.items[0], unitPriceSen: 6.5 }] },
    ],
    [
      "negative prices",
      { items: [{ ...validBill.items[0], unitPriceSen: -1 }] },
    ],
    ["a payer who is not on the bill", { payerId: "nobody" }],
    ["no people", { people: [] }],
    [
      "duplicate people",
      { people: [validBill.people[0], validBill.people[0]] },
    ],
    [
      "an item claimed by a stranger",
      {
        items: [
          {
            ...validBill.items[0],
            portions: [{ personId: "nobody", portions: 1 }],
          },
        ],
      },
    ],
    [
      "a promo on a missing item",
      {
        discounts: [
          {
            id: "d",
            label: "Free",
            kind: "itemPromo",
            itemId: "nope",
            promo: { type: "oneForOne" },
          },
        ],
      },
    ],
    [
      "a voucher owned by a stranger",
      {
        discounts: [
          {
            id: "d",
            label: "RM5",
            kind: "amountOff",
            amountSen: 500,
            keptByPersonId: "nobody",
          },
        ],
      },
    ],
    [
      "a discount above 100%",
      {
        discounts: [
          {
            id: "d",
            label: "Too much",
            kind: "percentOff",
            basisPoints: 10_001,
          },
        ],
      },
    ],
    ["unknown fields", { hacked: true }],
  ])("rejects %s", (_name, change) => {
    expect(billSchema.safeParse(withChange(change)).success).toBe(false);
  });
});
