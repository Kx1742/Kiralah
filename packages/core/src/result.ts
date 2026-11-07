/** Stable keys the UI translates: the words live in the app, the numbers live here. */
export const BREAKDOWN_KEYS = [
  "food",
  "discount",
  "serviceCharge",
  "serviceTax",
  "adjustment",
  "cashRounding",
  "equalShare",
] as const;

export type BreakdownKey = (typeof BREAKDOWN_KEYS)[number];

export type BreakdownLine = {
  key: BreakdownKey;
  amountSen: number;
};

export type Share = {
  personId: string;
  amountSen: number;
  /** Leftover sen this person absorbed so shares add up to the total (5 in cash mode). */
  extraSen: number;
  /** Adds up to amountSen exactly. Lines that come to zero are left out. */
  breakdown: BreakdownLine[];
};

export type DiscountOutcome = {
  discountId: string;
  savedSen: number;
  status: "applied" | "minSpendNotMet";
};

export type ReceiptCheck =
  | { status: "notProvided" }
  | { status: "matches" }
  | {
      status: "differs";
      /** Receipt minus calculated: also the adjustment line that would fix it. */
      differenceSen: number;
      /** The receipt looks 5-sen rounded, so turning on cash rounding would fix it. */
      cashRoundingWouldFix: boolean;
    };

export type BillResult = {
  /** Every item at full price. */
  subtotalSen: number;
  discountSen: number;
  serviceChargeSen: number;
  serviceTaxSen: number;
  adjustmentSen: number;
  cashRoundingSen: number;
  totalSen: number;
  /** In the same order as bill.people. */
  shares: Share[];
  /** The part of the total for items nobody has claimed yet. */
  unclaimedSen: number;
  discounts: DiscountOutcome[];
  receiptCheck: ReceiptCheck;
};
