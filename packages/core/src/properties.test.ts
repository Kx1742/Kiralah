import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { calculateBill } from "./calculate";
import type { Bill, Discount, ItemisedBill } from "./schema";
import { DEFAULT_CHARGES } from "./defaults";
import { billSchema } from "./schema";

const personIds = ["ali", "bee", "chong", "devi", "esah"];

const price = fc.integer({ min: 0, max: 50_000 });

const peopleArbitrary = fc
  .integer({ min: 1, max: personIds.length })
  .map((count) => personIds.slice(0, count).map((id) => ({ id, name: id })));

function itemArbitrary(ids: string[], claimedOnly: boolean, index: number) {
  return fc
    .record({
      quantity: fc.integer({ min: 1, max: 6 }),
      unitPriceSen: price,
      owners: fc.subarray(ids, { minLength: claimedOnly ? 1 : 0 }),
      portions: fc.integer({ min: 1, max: 4 }),
    })
    .map(({ quantity, unitPriceSen, owners, portions }) => ({
      id: `item-${index}`,
      name: `Dish ${index}`,
      quantity,
      unitPriceSen,
      portions: owners.map((personId, i) => ({
        personId,
        portions: i === 0 ? portions : 1,
      })),
    }));
}

function discountArbitrary(ids: string[], itemIds: string[], index: number) {
  const id = `discount-${index}`;
  const label = `Voucher ${index}`;
  const billWide = fc.record(
    {
      minSpendSen: fc.integer({ min: 0, max: 100_000 }),
      keptByPersonId: fc.constantFrom(...ids),
    },
    { requiredKeys: [] },
  );

  const options: fc.Arbitrary<Discount>[] = [
    fc
      .tuple(fc.integer({ min: 0, max: 10_000 }), billWide)
      .map(([basisPoints, extra]) => ({
        id,
        label,
        kind: "percentOff" as const,
        basisPoints,
        ...extra,
      })),
    fc
      .tuple(fc.integer({ min: 0, max: 30_000 }), billWide)
      .map(([amountSen, extra]) => ({
        id,
        label,
        kind: "amountOff" as const,
        amountSen,
        ...extra,
      })),
  ];

  if (itemIds.length > 0) {
    options.push(
      fc
        .tuple(
          fc.constantFrom(...itemIds),
          fc.oneof(
            fc.constant({ type: "oneForOne" as const }),
            fc
              .integer({ min: 1, max: 6 })
              .map((units) => ({ type: "freeUnits" as const, units })),
            fc.integer({ min: 0, max: 10_000 }).map((basisPoints) => ({
              type: "percentOff" as const,
              basisPoints,
            })),
            fc
              .integer({ min: 0, max: 20_000 })
              .map((amountSen) => ({ type: "amountOff" as const, amountSen })),
          ),
        )
        .map(([itemId, promo]) => ({
          id,
          label,
          kind: "itemPromo" as const,
          itemId,
          promo,
        })),
    );
  }
  return fc.oneof(...options);
}

const chargesArbitrary = fc.record({
  pricesIncludeCharges: fc.boolean(),
  serviceChargeBasisPoints: fc.constantFrom(0, 500, 1000, 1250),
  serviceTaxBasisPoints: fc.constantFrom(0, 600, 800),
  taxOnServiceCharge: fc.boolean(),
  discountTiming: fc.constantFrom(
    "beforeCharges" as const,
    "afterCharges" as const,
  ),
});

function billArbitrary({
  claimedOnly = false,
  withAdjustments = true,
}: {
  claimedOnly?: boolean;
  withAdjustments?: boolean;
} = {}): fc.Arbitrary<ItemisedBill> {
  return peopleArbitrary.chain((people) => {
    const ids = people.map((person) => person.id);
    return fc.integer({ min: 0, max: 8 }).chain((itemCount) => {
      const items = fc.tuple(
        ...Array.from({ length: itemCount }, (_, i) =>
          itemArbitrary(ids, claimedOnly, i),
        ),
      );
      const itemIds = Array.from({ length: itemCount }, (_, i) => `item-${i}`);
      return fc.integer({ min: 0, max: 3 }).chain((discountCount) =>
        fc
          .record({
            items,
            discounts: fc.tuple(
              ...Array.from({ length: discountCount }, (_, i) =>
                discountArbitrary(ids, itemIds, i),
              ),
            ),
            charges: chargesArbitrary,
            cashRounding: fc.boolean(),
            payerId: fc.constantFrom(...ids),
            adjustments: withAdjustments
              ? fc.array(fc.integer({ min: -5_000, max: 5_000 }), {
                  maxLength: 2,
                })
              : fc.constant<number[]>([]),
          })
          .map(
            ({
              items,
              discounts,
              charges,
              cashRounding,
              payerId,
              adjustments,
            }): ItemisedBill => ({
              mode: "itemised",
              payerId,
              people,
              cashRounding,
              items,
              discounts,
              charges,
              adjustments: adjustments.map((amountSen, i) => ({
                id: `adjustment-${i}`,
                label: "Fix",
                amountSen,
              })),
            }),
          ),
      );
    });
  });
}

const equalBillArbitrary: fc.Arbitrary<Bill> = peopleArbitrary.chain((people) =>
  fc
    .record({
      totalSen: fc.integer({ min: 0, max: 1_000_000 }),
      cashRounding: fc.boolean(),
      payerId: fc.constantFrom(...people.map((person) => person.id)),
    })
    .map((rest) => ({ mode: "equal" as const, people, ...rest })),
);

const amountsOf = (bill: Bill) =>
  new Map(
    calculateBill(bill).shares.map((share) => [
      share.personId,
      share.amountSen,
    ]),
  );

/** The one real exception to "removing a discount never lowers a share": see below. */
function withoutKeptPercentVouchers(bill: ItemisedBill): ItemisedBill {
  return {
    ...bill,
    discounts: bill.discounts.map((discount) => {
      if (discount.kind !== "percentOff") return discount;
      const shared = { ...discount };
      delete shared.keptByPersonId;
      return shared;
    }),
  };
}

const runs = { numRuns: 1000 };

describe("money properties", () => {
  it("generates valid bills", () => {
    fc.assert(
      fc.property(billArbitrary(), (bill) => {
        billSchema.parse(bill);
      }),
      { numRuns: 200 },
    );
  });

  it("shares plus unclaimed items add up to exactly the total", () => {
    fc.assert(
      fc.property(billArbitrary(), (bill) => {
        const result = calculateBill(bill);
        const shares = result.shares.reduce(
          (total, share) => total + share.amountSen,
          0,
        );
        expect(shares + result.unclaimedSen).toBe(result.totalSen);
      }),
      runs,
    );
  });

  it("once every item is claimed, shares alone add up to exactly the total", () => {
    fc.assert(
      fc.property(billArbitrary({ claimedOnly: true }), (bill) => {
        const result = calculateBill(bill);
        // With nothing ordered, an adjustment line has nobody to follow.
        fc.pre(result.subtotalSen > 0);
        const shares = result.shares.reduce(
          (total, share) => total + share.amountSen,
          0,
        );
        expect(result.unclaimedSen).toBe(0);
        expect(shares).toBe(result.totalSen);
      }),
      runs,
    );
  });

  it("nobody's share is ever negative", () => {
    fc.assert(
      fc.property(billArbitrary(), (bill) => {
        const result = calculateBill(bill);
        for (const share of result.shares) {
          expect(share.amountSen).toBeGreaterThanOrEqual(0);
        }
        expect(result.unclaimedSen).toBeGreaterThanOrEqual(0);
        expect(result.totalSen).toBeGreaterThanOrEqual(0);
      }),
      runs,
    );
  });

  it("a person with no items pays nothing", () => {
    fc.assert(
      fc.property(billArbitrary(), (bill) => {
        const claimed = new Set(
          bill.items.flatMap((item) => item.portions.map((p) => p.personId)),
        );
        for (const share of calculateBill(bill).shares) {
          if (!claimed.has(share.personId)) expect(share.amountSen).toBe(0);
        }
      }),
      runs,
    );
  });

  it("each person's breakdown adds up to exactly their share", () => {
    fc.assert(
      fc.property(billArbitrary(), (bill) => {
        for (const share of calculateBill(bill).shares) {
          const lines = share.breakdown.reduce(
            (total, line) => total + line.amountSen,
            0,
          );
          expect(lines).toBe(share.amountSen);
        }
      }),
      runs,
    );
  });

  it("cash rounding makes the total and every share a multiple of 5 sen", () => {
    fc.assert(
      fc.property(billArbitrary(), (bill) => {
        const result = calculateBill({ ...bill, cashRounding: true });
        expect(result.totalSen % 5).toBe(0);
        for (const share of result.shares) expect(share.amountSen % 5).toBe(0);
      }),
      runs,
    );
  });

  it("removing a discount never lowers anyone's share by more than rounding", () => {
    fc.assert(
      fc.property(billArbitrary().map(withoutKeptPercentVouchers), (bill) => {
        const before = amountsOf(bill);
        for (const discount of bill.discounts) {
          const after = amountsOf({
            ...bill,
            discounts: bill.discounts.filter((other) => other !== discount),
          });
          // Each amount rounded to whole sen (percent discounts, service charge, tax)
          // can wobble a share by under 1 sen, and the final leftover by 1 more.
          const roundedSteps = bill.discounts.length + 2;
          const tolerance = bill.cashRounding
            ? roundedSteps + 8
            : roundedSteps + 1;
          for (const [personId, amount] of before) {
            expect(after.get(personId)!).toBeGreaterThanOrEqual(
              amount - tolerance,
            );
          }
        }
      }),
      runs,
    );
  });

  it("the discount's savings never go negative and never exceed the bill", () => {
    fc.assert(
      fc.property(billArbitrary({ withAdjustments: false }), (bill) => {
        const result = calculateBill(bill);
        expect(result.discountSen).toBeGreaterThanOrEqual(0);
        expect(result.discountSen).toBeLessThanOrEqual(
          result.subtotalSen + result.serviceChargeSen + result.serviceTaxSen,
        );
      }),
      runs,
    );
  });

  it("equal split: everyone pays, within one rounding unit, and it adds up", () => {
    fc.assert(
      fc.property(equalBillArbitrary, (bill) => {
        const result = calculateBill(bill);
        const amounts = result.shares.map((share) => share.amountSen);
        const unit = bill.cashRounding ? 5 : 1;
        expect(amounts.reduce((total, amount) => total + amount, 0)).toBe(
          result.totalSen,
        );
        expect(Math.max(...amounts) - Math.min(...amounts)).toBeLessThanOrEqual(
          unit,
        );
      }),
      runs,
    );
  });
});

describe("rounding fairness", () => {
  it("in a tie the payer takes the extra sen, whatever the list order", () => {
    const result = calculateBill({
      mode: "equal",
      payerId: "chong",
      people: [
        { id: "ali", name: "Ali" },
        { id: "bee", name: "Bee" },
        { id: "chong", name: "Chong" },
      ],
      cashRounding: false,
      totalSen: 1000,
    });
    expect(
      result.shares.map((share) => [
        share.personId,
        share.amountSen,
        share.extraSen,
      ]),
    ).toEqual([
      ["ali", 333, 0],
      ["bee", 333, 0],
      ["chong", 334, 1],
    ]);
  });
});

describe('the two exceptions to "removing a discount never lowers a share"', () => {
  const person = (id: string) => ({ id, name: id });
  const ownItem = (personId: string, unitPriceSen: number) => ({
    id: personId,
    name: personId,
    quantity: 1,
    unitPriceSen,
    portions: [{ personId, portions: 1 }],
  });
  const base = {
    mode: "itemised" as const,
    payerId: "ali",
    cashRounding: false,
    adjustments: [],
  };

  it("rounding: a 1-sen voucher can move a share by 1 sen the wrong way", () => {
    const bill: ItemisedBill = {
      ...base,
      people: ["ali", "bee", "chong"].map(person),
      items: [
        ownItem("ali", 1250),
        ownItem("bee", 1750),
        ownItem("chong", 3450),
      ],
      charges: DEFAULT_CHARGES,
      discounts: [{ id: "v", label: "1 sen", kind: "amountOff", amountSen: 1 }],
    };
    expect(amountsOf(bill).get("ali")).toBe(1458);
    expect(amountsOf({ ...bill, discounts: [] }).get("ali")).toBe(1457);
  });

  it("a kept percentage voucher saves its owner more when the bill grows", () => {
    const bill: ItemisedBill = {
      ...base,
      people: ["ali", "bee"].map(person),
      items: [ownItem("ali", 10_000), ownItem("bee", 10_000)],
      charges: { ...DEFAULT_CHARGES, pricesIncludeCharges: true },
      discounts: [
        {
          id: "promo",
          label: "RM50 off",
          kind: "itemPromo",
          itemId: "ali",
          promo: { type: "amountOff", amountSen: 5_000 },
        },
        {
          id: "v",
          label: "10% off",
          kind: "percentOff",
          basisPoints: 1000,
          keptByPersonId: "bee",
        },
      ],
    };
    expect(amountsOf(bill).get("bee")).toBe(8_500);
    const withoutPromo = bill.discounts.filter(
      (discount) => discount.id !== "promo",
    );
    expect(amountsOf({ ...bill, discounts: withoutPromo }).get("bee")).toBe(
      8_000,
    );
  });
});
