import { describe, expect, it } from "vitest";
import { ratio } from "./rational";
import { largestRemainder, percentOf, roundToFiveSen } from "./rounding";

describe("percentOf", () => {
  it("rounds half a sen up", () => {
    expect(percentOf(8320n, 1000)).toBe(832n);
    expect(percentOf(5380n, 600)).toBe(323n); // 322.8
    expect(percentOf(25n, 1000)).toBe(3n); // 2.5
    expect(percentOf(24n, 1000)).toBe(2n); // 2.4
  });
});

describe("roundToFiveSen", () => {
  it.each([
    [100n, 100n],
    [101n, 100n],
    [102n, 100n],
    [103n, 105n],
    [104n, 105n],
    [106n, 105n],
    [107n, 105n],
    [108n, 110n],
    [109n, 110n],
  ])("rounds %i sen to %i sen", (sen, expected) => {
    expect(roundToFiveSen(sen)).toBe(expected);
  });
});

describe("largestRemainder", () => {
  it("gives the leftover sen to the biggest fractions", () => {
    const shares = largestRemainder(
      [ratio(1001n, 10n), ratio(2007n, 10n), ratio(3002n, 10n)],
      601n,
    );
    expect(shares.map((share) => share.amount)).toEqual([100n, 201n, 300n]);
    expect(shares.map((share) => share.extra)).toEqual([0n, 1n, 0n]);
  });

  it("breaks ties in list order", () => {
    const third = ratio(1000n, 3n);
    const shares = largestRemainder([third, third, third], 1000n);
    expect(shares.map((share) => share.amount)).toEqual([334n, 333n, 333n]);
  });

  it("never gives a leftover to someone who owes a whole amount", () => {
    const shares = largestRemainder(
      [ratio(0n), ratio(201n, 2n), ratio(201n, 2n)],
      201n,
    );
    expect(shares.map((share) => share.amount)).toEqual([0n, 101n, 100n]);
  });

  it("works in units of 5 sen", () => {
    const shares = largestRemainder([ratio(3n), ratio(4n), ratio(8n)], 15n, 5n);
    expect(shares.map((share) => share.amount)).toEqual([5n, 5n, 5n]);
    expect(shares.map((share) => share.extra)).toEqual([5n, 5n, 0n]);
  });
});
