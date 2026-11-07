import { parseRinggit } from "@kiralah/core";
import type { ScannedReceipt } from "./schema";

/** A hand-checked answer for one receipt in evals/. Amounts as printed. */
export type ExpectedReceipt = {
  source: "real" | "synthetic";
  language: "en" | "ms" | "zh" | "mixed";
  restaurantName: string | null;
  items: { name: string; quantity: number; lineTotal: string }[];
  serviceCharge: string | null;
  serviceTax: string | null;
  total: string;
};

export type ReceiptScore = {
  itemsExpected: number;
  itemsFound: number;
  pricesCorrect: number;
  extraItems: number;
  chargesCorrect: boolean;
  totalCorrect: boolean;
};

const normalise = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]/gu, "");

function bigrams(text: string): string[] {
  const chars = [...text];
  return chars.length < 2
    ? chars
    : chars.slice(1).map((char, i) => chars[i]! + char);
}

/** Dice similarity on letter pairs: works for spaced and unspaced (Chinese) text alike. */
export function nameSimilarity(a: string, b: string): number {
  const [left, right] = [normalise(a), normalise(b)];
  if (left === "" || right === "") return 0;
  if (left.includes(right) || right.includes(left)) return 1;
  const pairs = bigrams(left);
  const others = bigrams(right);
  let shared = 0;
  const pool = [...others];
  for (const pair of pairs) {
    const at = pool.indexOf(pair);
    if (at >= 0) {
      shared++;
      pool.splice(at, 1);
    }
  }
  return (2 * shared) / (pairs.length + others.length);
}

const sameAmount = (
  a: string | null | undefined,
  b: string | null | undefined,
) =>
  (a == null ? null : parseRinggit(a)) === (b == null ? null : parseRinggit(b));

export function scoreReceipt(
  expected: ExpectedReceipt,
  scanned: ScannedReceipt,
): ReceiptScore {
  const unused = [...scanned.items];
  let itemsFound = 0;
  let pricesCorrect = 0;

  for (const item of expected.items) {
    // Best name match first; an exact price breaks ties.
    let best = -1;
    let bestScore = 0;
    unused.forEach((candidate, index) => {
      const score =
        nameSimilarity(item.name, candidate.name) +
        (sameAmount(item.lineTotal, candidate.lineTotal) ? 0.01 : 0);
      if (score > bestScore) {
        best = index;
        bestScore = score;
      }
    });
    if (best < 0 || bestScore < 0.5) continue;
    const [match] = unused.splice(best, 1);
    itemsFound++;
    if (
      sameAmount(item.lineTotal, match!.lineTotal) &&
      item.quantity === match!.quantity
    ) {
      pricesCorrect++;
    }
  }

  return {
    itemsExpected: expected.items.length,
    itemsFound,
    pricesCorrect,
    extraItems: unused.length,
    chargesCorrect:
      sameAmount(expected.serviceCharge, scanned.serviceCharge?.amount) &&
      sameAmount(expected.serviceTax, scanned.serviceTax?.amount),
    totalCorrect: sameAmount(expected.total, scanned.total),
  };
}
