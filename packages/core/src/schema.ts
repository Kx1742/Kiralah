import { z } from "zod";

const MAX_SEN = 100_000_000; // RM1,000,000: far above any makan bill.

const id = z.string().min(1).max(64);
const label = z.string().trim().min(1).max(120);
const sen = z.number().int().min(0).max(MAX_SEN);
const basisPoints = z.number().int().min(0).max(10_000); // 1000 = 10%

export const personSchema = z.strictObject({
  id,
  name: z.string().trim().min(1).max(40),
});

/**
 * Who had an item, as whole-number portions. One person with 1 portion owns it;
 * three people with 1 each share it equally; 2 and 1 means two-thirds and one-third.
 * No portions yet means nobody has claimed it.
 */
export const itemSchema = z.strictObject({
  id,
  name: label,
  quantity: z.number().int().min(1).max(999),
  unitPriceSen: sen,
  portions: z.array(
    z.strictObject({
      personId: id,
      portions: z.number().int().min(1).max(1000),
    }),
  ),
});

const billWideDiscount = {
  id,
  label,
  /** Compared with the items' full price, before any discount. */
  minSpendSen: sen.optional(),
  /** Set when the voucher's owner keeps the savings; otherwise everyone shares them. */
  keptByPersonId: id.optional(),
};

const itemPromoSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("oneForOne") }),
  z.strictObject({
    type: z.literal("freeUnits"),
    units: z.number().int().min(1).max(999),
  }),
  z.strictObject({ type: z.literal("percentOff"), basisPoints }),
  z.strictObject({ type: z.literal("amountOff"), amountSen: sen }),
]);

export const discountSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...billWideDiscount,
    kind: z.literal("percentOff"),
    basisPoints,
  }),
  z.strictObject({
    ...billWideDiscount,
    kind: z.literal("amountOff"),
    amountSen: sen,
  }),
  z.strictObject({
    id,
    label,
    kind: z.literal("itemPromo"),
    itemId: id,
    promo: itemPromoSchema,
  }),
]);

export const chargesSchema = z.strictObject({
  /** "Nett prices": item prices already include service charge and tax. */
  pricesIncludeCharges: z.boolean(),
  serviceChargeBasisPoints: basisPoints,
  serviceTaxBasisPoints: basisPoints,
  /** Most Malaysian receipts tax the service charge too. */
  taxOnServiceCharge: z.boolean(),
  /** Whether bill-wide vouchers come off before or after service charge and tax. */
  discountTiming: z.enum(["beforeCharges", "afterCharges"]),
});

const billCommon = {
  payerId: id,
  people: z.array(personSchema).min(1).max(50),
  /** Round the total and every share to 5 sen, for people paying in cash. */
  cashRounding: z.boolean(),
};

const adjustmentSchema = z.strictObject({
  id,
  label,
  amountSen: z.number().int().min(-MAX_SEN).max(MAX_SEN),
});

const itemisedBillSchema = z.strictObject({
  ...billCommon,
  mode: z.literal("itemised"),
  items: z.array(itemSchema).max(200),
  discounts: z.array(discountSchema).max(20),
  charges: chargesSchema,
  /** Signed lines that make the bill match the receipt. */
  adjustments: z.array(adjustmentSchema).max(20),
  receiptTotalSen: sen.optional(),
});

const equalBillSchema = z.strictObject({
  ...billCommon,
  mode: z.literal("equal"),
  totalSen: sen,
});

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

export const billSchema = z
  .discriminatedUnion("mode", [itemisedBillSchema, equalBillSchema])
  .superRefine((bill, ctx) => {
    const problem = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const personIds = new Set(bill.people.map((person) => person.id));

    if (personIds.size !== bill.people.length) problem("Duplicate person id");
    if (!personIds.has(bill.payerId)) problem("Payer is not on the bill");
    if (bill.mode !== "itemised") return;

    const itemIds = new Set(bill.items.map((item) => item.id));
    if (itemIds.size !== bill.items.length) problem("Duplicate item id");
    if (hasDuplicates(bill.discounts.map((discount) => discount.id))) {
      problem("Duplicate discount id");
    }

    for (const item of bill.items) {
      const owners = item.portions.map((portion) => portion.personId);
      if (hasDuplicates(owners))
        problem(`Person listed twice on item ${item.id}`);
      if (owners.some((owner) => !personIds.has(owner))) {
        problem(`Unknown person on item ${item.id}`);
      }
    }

    for (const discount of bill.discounts) {
      if (discount.kind === "itemPromo") {
        if (!itemIds.has(discount.itemId))
          problem(`Unknown item on discount ${discount.id}`);
      } else if (
        discount.keptByPersonId &&
        !personIds.has(discount.keptByPersonId)
      ) {
        problem(`Unknown voucher owner on discount ${discount.id}`);
      }
    }
  });

export type Person = z.infer<typeof personSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Discount = z.infer<typeof discountSchema>;
export type Charges = z.infer<typeof chargesSchema>;
export type Bill = z.infer<typeof billSchema>;
export type ItemisedBill = Extract<Bill, { mode: "itemised" }>;
export type EqualBill = Extract<Bill, { mode: "equal" }>;
