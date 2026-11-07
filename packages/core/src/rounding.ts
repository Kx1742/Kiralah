import {
  compare,
  div,
  floor,
  fraction,
  ratio,
  type Rational,
  sum,
} from "./rational";

/** Rounds a percentage of an amount the way receipts do: half a sen rounds up. */
export function percentOf(amountSen: bigint, basisPoints: number): bigint {
  return (amountSen * BigInt(basisPoints) + 5_000n) / 10_000n;
}

/** Nearest 5 sen: 1 and 2 round down, 3 and 4 round up. */
export function roundToFiveSen(sen: bigint): bigint {
  return ((sen + 2n) / 5n) * 5n;
}

export type RoundedShare = { amount: bigint; extra: bigint };

/**
 * Largest-remainder method: everyone starts rounded down to a whole unit, then the
 * leftover units go to the biggest fractions. Ties follow list order, so put whoever
 * should absorb a tie first. Exact whole amounts never receive a leftover.
 */
export function largestRemainder(
  exact: readonly Rational[],
  total: bigint,
  unit = 1n,
): RoundedShare[] {
  const unitRatio = ratio(unit);
  const inUnits = exact.map((value) => div(value, unitRatio));
  const shares = inUnits.map((value) => ({
    amount: floor(value) * unit,
    extra: 0n,
  }));
  const allotted = shares.reduce(
    (running, share) => running + share.amount,
    0n,
  );
  const leftover = Number((total - allotted) / unit);

  const biggestFractionFirst = inUnits
    .map((value, index) => ({ index, part: fraction(value) }))
    .sort((a, b) => compare(b.part, a.part) || a.index - b.index);

  for (const { index } of biggestFractionFirst.slice(0, leftover)) {
    const share = shares[index]!;
    share.amount += unit;
    share.extra = unit;
  }
  return shares;
}

/** Rounds one person's breakdown lines to whole sen that add up to their share. */
export function roundLines(
  lines: readonly Rational[],
  target: bigint,
): bigint[] {
  return largestRemainder(lines, target).map((line) => line.amount);
}

/** Half a sen rounds up. */
export function roundExact(value: Rational): bigint {
  return floor(sum([value, ratio(1n, 2n)]));
}
