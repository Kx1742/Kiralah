import { z } from "zod";

/*
 * What Claude returns for a receipt photo. Amounts are the printed text ("12.40"),
 * never numbers: the money engine's own parser turns them into whole sen, so the
 * model never does arithmetic on money.
 */
const amount = z
  .string()
  .describe('Printed amount, digits and a decimal point only, e.g. "12.40"');

const charge = z
  .object({
    ratePercent: z
      .string()
      .nullable()
      .describe('Printed rate without the % sign, e.g. "10"'),
    amount,
  })
  .nullable();

export const scannedReceiptSchema = z.object({
  isReceipt: z
    .boolean()
    .describe("False if the photo is not a readable restaurant receipt"),
  restaurantName: z.string().nullable(),
  items: z.array(
    z.object({
      name: z.string().describe("As printed, in the receipt's own language"),
      quantity: z
        .number()
        .int()
        .describe("Printed quantity, or 1 if none is printed"),
      lineTotal: amount.describe(
        "The line's printed amount: quantity times unit price",
      ),
    }),
  ),
  subtotal: z.string().nullable(),
  serviceCharge: charge,
  serviceTax: charge,
  pricesIncludeTax: z
    .boolean()
    .describe(
      "True only if the receipt says prices already include tax or service charge",
    ),
  discounts: z.array(z.object({ label: z.string(), amount })),
  rounding: z
    .string()
    .nullable()
    .describe('Rounding adjustment with its sign, e.g. "-0.02"'),
  total: z
    .string()
    .nullable()
    .describe("Final amount payable, not cash tendered or change"),
});

export type ScannedReceipt = z.infer<typeof scannedReceiptSchema>;

export const RECEIPT_ERRORS = [
  "notReceipt",
  "unreadable",
  "busy",
  "unavailable",
  "rateLimited",
  "limitReached",
  "invalid",
] as const;

export type ReceiptError = (typeof RECEIPT_ERRORS)[number];
