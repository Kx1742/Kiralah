/** Adds amounts of integer sen. Rejects anything that is not whole sen. */
export function sumSen(amounts: readonly number[]): number {
  return amounts.reduce((total, sen) => {
    if (!Number.isSafeInteger(sen)) {
      throw new RangeError(
        `Money must be an integer number of sen, got ${sen}`,
      );
    }
    return total + sen;
  }, 0);
}
