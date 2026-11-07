import {
  add,
  div,
  mul,
  type Rational,
  ratio,
  sub,
  sum,
  ZERO,
} from "./rational";
import type {
  BillResult,
  BreakdownKey,
  DiscountOutcome,
  ReceiptCheck,
  Share,
} from "./result";
import {
  largestRemainder,
  percentOf,
  roundExact,
  roundLines,
  roundToFiveSen,
} from "./rounding";
import type { Bill, Discount, EqualBill, Item, ItemisedBill } from "./schema";

type ItemPromo = Extract<Discount, { kind: "itemPromo" }>;
type BillWideDiscount = Exclude<Discount, ItemPromo>;

const LINE_KEYS = [
  "food",
  "discount",
  "serviceCharge",
  "serviceTax",
  "adjustment",
] as const;
type LineKey = (typeof LINE_KEYS)[number];
type Lines = Record<LineKey, Rational>;

/** One entry per person, plus a last one holding items nobody has claimed. */
type Ledger = {
  owed: Rational[];
  lines: Lines[];
};

function bigMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function proportions(weights: readonly Rational[]): Rational[] {
  const total = sum(weights);
  return weights.map((weight) => (total.n === 0n ? ZERO : div(weight, total)));
}

function charge(ledger: Ledger, key: LineKey, index: number, amount: Rational) {
  ledger.owed[index] = add(ledger.owed[index]!, amount);
  const lines = ledger.lines[index]!;
  lines[key] = add(lines[key], amount);
}

function chargeInProportion(
  ledger: Ledger,
  key: LineKey,
  amount: bigint,
  weights: readonly Rational[],
) {
  proportions(weights).forEach((part, index) => {
    charge(ledger, key, index, mul(ratio(amount), part));
  });
}

function promoSaving(
  item: Item,
  promo: ItemPromo["promo"],
  remaining: bigint,
): bigint {
  const unitPrice = BigInt(item.unitPriceSen);
  const saving = (() => {
    switch (promo.type) {
      case "oneForOne":
        return BigInt(Math.floor(item.quantity / 2)) * unitPrice;
      case "freeUnits":
        return BigInt(Math.min(promo.units, item.quantity)) * unitPrice;
      case "percentOff":
        return percentOf(remaining, promo.basisPoints);
      case "amountOff":
        return BigInt(promo.amountSen);
    }
  })();
  return bigMin(saving, remaining);
}

function applyBillWideDiscount(
  discount: BillWideDiscount,
  ledger: Ledger,
  running: bigint,
  ownerIndex: number,
): bigint {
  const wanted =
    discount.kind === "percentOff"
      ? percentOf(running, discount.basisPoints)
      : BigInt(discount.amountSen);
  const saving = bigMin(wanted, running);

  if (ownerIndex < 0) {
    chargeInProportion(ledger, "discount", -saving, ledger.owed);
    return saving;
  }

  // The owner keeps the savings up to what they owe; nobody is paid to eat. Any excess
  // goes to everyone else, so the voucher's full value still comes off the bill.
  const owner = ledger.owed[ownerIndex]!;
  const kept = sub(ratio(saving), owner).n > 0n ? owner : ratio(saving);
  const excess = sub(ratio(saving), kept);
  const others = ledger.owed.map((owed, index) =>
    index === ownerIndex ? ZERO : owed,
  );
  charge(ledger, "discount", ownerIndex, mul(kept, ratio(-1n)));
  proportions(others).forEach((part, index) => {
    charge(ledger, "discount", index, mul(mul(excess, part), ratio(-1n)));
  });
  return saving;
}

function checkReceipt(bill: ItemisedBill, totalSen: bigint): ReceiptCheck {
  if (bill.receiptTotalSen === undefined) return { status: "notProvided" };
  const receipt = BigInt(bill.receiptTotalSen);
  if (receipt === totalSen) return { status: "matches" };
  return {
    status: "differs",
    differenceSen: Number(receipt - totalSen),
    cashRoundingWouldFix:
      !bill.cashRounding && roundToFiveSen(totalSen) === receipt,
  };
}

/** The payer takes any leftover sen in a tie: nobody should chase a friend for 1 sen. */
function payerFirst<T extends { id: string }>(
  people: readonly T[],
  payerId: string,
): T[] {
  return [...people].sort(
    (a, b) => Number(b.id === payerId) - Number(a.id === payerId),
  );
}

function calculateItemised(bill: ItemisedBill): BillResult {
  const people = payerFirst(bill.people, bill.payerId);
  const indexOf = new Map(people.map((person, index) => [person.id, index]));
  const unclaimedIndex = people.length;
  const size = people.length + 1;

  const ledger: Ledger = {
    owed: Array.from({ length: size }, () => ZERO),
    lines: Array.from({ length: size }, () => ({
      food: ZERO,
      discount: ZERO,
      serviceCharge: ZERO,
      serviceTax: ZERO,
      adjustment: ZERO,
    })),
  };

  const outcomes = new Map<string, DiscountOutcome>(
    bill.discounts.map((discount) => [
      discount.id,
      { discountId: discount.id, savedSen: 0, status: "applied" },
    ]),
  );
  const promos = bill.discounts.filter(
    (d): d is ItemPromo => d.kind === "itemPromo",
  );
  const billWide = bill.discounts.filter(
    (d): d is BillWideDiscount => d.kind !== "itemPromo",
  );

  // 1. Items, at full price and after their own promos. Only people who had an
  //    item get its promo, because it reduces that item's price and nothing else.
  let subtotal = 0n;
  let discountTotal = 0n;
  for (const item of bill.items) {
    const gross = BigInt(item.quantity) * BigInt(item.unitPriceSen);
    let net = gross;
    for (const promo of promos.filter((p) => p.itemId === item.id)) {
      const saving = promoSaving(item, promo.promo, net);
      net -= saving;
      outcomes.get(promo.id)!.savedSen += Number(saving);
    }
    subtotal += gross;
    discountTotal += gross - net;

    const totalPortions = item.portions.reduce(
      (total, p) => total + p.portions,
      0,
    );
    const claims =
      totalPortions === 0
        ? [{ index: unclaimedIndex, part: ratio(1n) }]
        : item.portions.map((p) => ({
            index: indexOf.get(p.personId)!,
            part: ratio(BigInt(p.portions), BigInt(totalPortions)),
          }));
    for (const { index, part } of claims) {
      charge(ledger, "food", index, mul(ratio(gross), part));
      charge(ledger, "discount", index, mul(ratio(net - gross), part));
    }
  }
  const foodWeights = ledger.lines.map((lines) => lines.food);

  let running = subtotal - discountTotal;

  // 2. Bill-wide vouchers and service charge plus tax, in the order the bill says.
  const applyBillWide = () => {
    for (const discount of billWide) {
      if (
        discount.minSpendSen !== undefined &&
        subtotal < BigInt(discount.minSpendSen)
      ) {
        outcomes.get(discount.id)!.status = "minSpendNotMet";
        continue;
      }
      const owner = discount.keptByPersonId;
      const saving = applyBillWideDiscount(
        discount,
        ledger,
        running,
        owner === undefined ? -1 : indexOf.get(owner)!,
      );
      running -= saving;
      discountTotal += saving;
      outcomes.get(discount.id)!.savedSen = Number(saving);
    }
  };

  let serviceCharge = 0n;
  let serviceTax = 0n;
  const applyCharges = () => {
    const { charges } = bill;
    if (charges.pricesIncludeCharges) return;
    serviceCharge = percentOf(running, charges.serviceChargeBasisPoints);
    serviceTax = percentOf(
      running + (charges.taxOnServiceCharge ? serviceCharge : 0n),
      charges.serviceTaxBasisPoints,
    );
    const weights = [...ledger.owed];
    chargeInProportion(ledger, "serviceCharge", serviceCharge, weights);
    chargeInProportion(ledger, "serviceTax", serviceTax, weights);
    running += serviceCharge + serviceTax;
  };

  if (bill.charges.discountTiming === "beforeCharges") {
    applyBillWide();
    applyCharges();
  } else {
    applyCharges();
    applyBillWide();
  }

  // 3. Adjustment lines. An extra charge follows what people ordered, so a discount
  //    elsewhere never shifts it onto you. A reduction follows what people owe, so
  //    it can never push anyone below zero.
  let adjustmentTotal = 0n;
  for (const adjustment of bill.adjustments) {
    const wanted = BigInt(adjustment.amountSen);
    if (wanted >= 0n) {
      const weights =
        subtotal > 0n
          ? foodWeights
          : foodWeights.map((_, i) =>
              i === unclaimedIndex ? ratio(1n) : ZERO,
            );
      chargeInProportion(ledger, "adjustment", wanted, weights);
      running += wanted;
      adjustmentTotal += wanted;
    } else {
      const reduction = bigMin(-wanted, running);
      chargeInProportion(ledger, "adjustment", -reduction, ledger.owed);
      running -= reduction;
      adjustmentTotal -= reduction;
    }
  }

  // 4. Rounding happens once, at the very end, on exact amounts.
  const totalSen = bill.cashRounding ? roundToFiveSen(running) : running;
  const scale = running === 0n ? ratio(1n) : ratio(totalSen, running);
  const scaled = ledger.owed.map((owed) => mul(owed, scale));
  const rounded = largestRemainder(
    scaled,
    totalSen,
    bill.cashRounding ? 5n : 1n,
  );

  const shareOf = (index: number): Share => {
    const { amount, extra } = rounded[index]!;
    const lines = ledger.lines[index]!;
    const exactLines = LINE_KEYS.map((key) => lines[key]);
    const lineTarget = bill.cashRounding
      ? roundExact(ledger.owed[index]!)
      : amount;
    const lineAmounts = roundLines(exactLines, lineTarget);
    const breakdown: { key: BreakdownKey; amount: bigint }[] = LINE_KEYS.map(
      (key, i) => ({
        key,
        amount: lineAmounts[i]!,
      }),
    );
    breakdown.push({ key: "cashRounding", amount: amount - lineTarget });

    return {
      personId: people[index]!.id,
      amountSen: Number(amount),
      extraSen: Number(extra),
      breakdown: breakdown
        .filter((line) => line.amount !== 0n)
        .map((line) => ({ key: line.key, amountSen: Number(line.amount) })),
    };
  };

  return {
    subtotalSen: Number(subtotal),
    discountSen: Number(discountTotal),
    serviceChargeSen: Number(serviceCharge),
    serviceTaxSen: Number(serviceTax),
    adjustmentSen: Number(adjustmentTotal),
    cashRoundingSen: Number(totalSen - running),
    totalSen: Number(totalSen),
    shares: bill.people.map((person) => shareOf(indexOf.get(person.id)!)),
    unclaimedSen: Number(rounded[unclaimedIndex]!.amount),
    discounts: [...outcomes.values()],
    receiptCheck: checkReceipt(bill, totalSen),
  };
}

function calculateEqual(bill: EqualBill): BillResult {
  const people = payerFirst(bill.people, bill.payerId);
  const running = BigInt(bill.totalSen);
  const totalSen = bill.cashRounding ? roundToFiveSen(running) : running;
  const each = ratio(totalSen, BigInt(people.length));
  const rounded = largestRemainder(
    people.map(() => each),
    totalSen,
    bill.cashRounding ? 5n : 1n,
  );
  const byId = new Map(
    people.map((person, index) => [person.id, rounded[index]!]),
  );

  return {
    subtotalSen: bill.totalSen,
    discountSen: 0,
    serviceChargeSen: 0,
    serviceTaxSen: 0,
    adjustmentSen: 0,
    cashRoundingSen: Number(totalSen - running),
    totalSen: Number(totalSen),
    shares: bill.people.map((person) => {
      const { amount, extra } = byId.get(person.id)!;
      return {
        personId: person.id,
        amountSen: Number(amount),
        extraSen: Number(extra),
        breakdown:
          amount === 0n
            ? []
            : [{ key: "equalShare" as const, amountSen: Number(amount) }],
      };
    }),
    unclaimedSen: 0,
    discounts: [],
    receiptCheck: { status: "notProvided" },
  };
}

/** Works out who pays what. Pass a bill that has been through billSchema. */
export function calculateBill(bill: Bill): BillResult {
  return bill.mode === "equal" ? calculateEqual(bill) : calculateItemised(bill);
}
