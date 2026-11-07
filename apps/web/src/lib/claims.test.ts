import type { Bill } from "@kiralah/core";
import { describe, expect, it } from "vitest";
import { claimKey, hasClaims, withClaimOverrides } from "./claims";
import { itemisedBill } from "./testBills";

const bill: Bill = {
  ...itemisedBill,
  people: [
    { id: "payer", name: "Ali" },
    { id: "bee", name: "Bee" },
  ],
  items: [
    {
      id: "a",
      name: "Nasi lemak",
      quantity: 1,
      unitPriceSen: 1000,
      portions: [{ personId: "bee", portions: 1 }],
    },
  ],
};

describe("withClaimOverrides", () => {
  it("adds and removes taps before the server answers, in name order", () => {
    const added = withClaimOverrides(bill, { [claimKey("a", "payer")]: true });
    expect(
      added.mode === "itemised" &&
        added.items[0]!.portions.map((p) => p.personId),
    ).toEqual(["payer", "bee"]);

    const removed = withClaimOverrides(bill, { [claimKey("a", "bee")]: false });
    expect(hasClaims(removed, "bee")).toBe(false);
  });

  it("leaves the bill alone when there is nothing pending", () => {
    expect(withClaimOverrides(bill, {})).toBe(bill);
  });
});
