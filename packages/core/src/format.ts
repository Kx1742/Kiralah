/** Formats integer sen as ringgit, e.g. 1240 → "RM12.40". */
export function formatRinggit(sen: number): string {
  if (!Number.isSafeInteger(sen)) {
    throw new RangeError(`Money must be an integer number of sen, got ${sen}`);
  }
  const abs = Math.abs(sen);
  const ringgit = Math.floor(abs / 100).toLocaleString("en-MY");
  const cents = String(abs % 100).padStart(2, "0");
  return `${sen < 0 ? "-" : ""}RM${ringgit}.${cents}`;
}
