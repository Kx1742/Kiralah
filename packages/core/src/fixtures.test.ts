import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateBill } from "./calculate";
import {
  BREAKDOWN_KEYS,
  type DiscountOutcome,
  type ReceiptCheck,
} from "./result";
import { billSchema } from "./schema";

type Fixture = {
  name: string;
  bill: unknown;
  expected: {
    subtotalSen?: number;
    discountSen?: number;
    serviceChargeSen?: number;
    serviceTaxSen?: number;
    cashRoundingSen?: number;
    adjustmentSen?: number;
    totalSen: number;
    shares: Record<string, number>;
    extraSen?: Record<string, number>;
    unclaimedSen?: number;
    discounts?: DiscountOutcome[];
    receiptCheck?: ReceiptCheck;
  };
};

const directory = join(import.meta.dirname, "../fixtures");
const fixtures = readdirSync(directory)
  .filter((file) => file.endsWith(".json"))
  .map(
    (file) =>
      JSON.parse(readFileSync(join(directory, file), "utf8")) as Fixture,
  );

describe("worked examples", () => {
  it("has at least 10", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
  });

  it.each(fixtures.map((fixture) => [fixture.name, fixture] as const))(
    "%s",
    (_name, fixture) => {
      const result = calculateBill(billSchema.parse(fixture.bill));
      const { expected } = fixture;

      expect(result.totalSen).toBe(expected.totalSen);
      expect(
        Object.fromEntries(
          result.shares.map((share) => [share.personId, share.amountSen]),
        ),
      ).toEqual(expected.shares);
      expect(result.unclaimedSen).toBe(expected.unclaimedSen ?? 0);

      for (const key of [
        "subtotalSen",
        "discountSen",
        "serviceChargeSen",
        "serviceTaxSen",
        "cashRoundingSen",
        "adjustmentSen",
      ] as const) {
        if (expected[key] !== undefined)
          expect(result[key]).toBe(expected[key]);
      }
      if (expected.extraSen) {
        expect(
          Object.fromEntries(
            result.shares.map((share) => [share.personId, share.extraSen]),
          ),
        ).toEqual(expected.extraSen);
      }
      if (expected.discounts)
        expect(result.discounts).toEqual(expected.discounts);
      if (expected.receiptCheck)
        expect(result.receiptCheck).toEqual(expected.receiptCheck);
    },
  );
});

describe("breakdown", () => {
  it("spells out one person's share line by line", () => {
    const fixture = fixtures.find((f) => f.name.startsWith("Member 20% off"))!;
    const result = calculateBill(billSchema.parse(fixture.bill));
    const ali = result.shares.find((share) => share.personId === "ali")!;

    expect(ali.breakdown.map((line) => line.key)).toEqual([
      "food",
      "discount",
      "serviceCharge",
      "serviceTax",
    ]);
    expect(
      ali.breakdown.every((line) => BREAKDOWN_KEYS.includes(line.key)),
    ).toBe(true);
    expect(
      ali.breakdown.reduce((total, line) => total + line.amountSen, 0),
    ).toBe(ali.amountSen);
  });
});
