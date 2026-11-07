const MAX_SEN = 100_000_000;

/** Reads what people type as a price: "12", "12.4", "12.40", "RM12.40", "1,234.50". */
export function parseRinggit(text: string): number | null {
  const match = /^(?:rm)?\s*(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d{1,2}))?$/i.exec(
    text.trim(),
  );
  if (!match) return null;
  const [, whole = "", cents] = match;
  if (whole === "" && cents === undefined) return null;
  const sen =
    Number(whole.replaceAll(",", "") || "0") * 100 +
    Number((cents ?? "").padEnd(2, "0") || "0");
  return sen <= MAX_SEN ? sen : null;
}

/** Reads a percentage as basis points: "10" → 1000, "8.5%" → 850. */
export function parsePercent(text: string): number | null {
  const match = /^(\d{0,3})(?:\.(\d{1,2}))?\s*%?$/.exec(text.trim());
  if (!match) return null;
  const [, whole = "", decimals] = match;
  if (whole === "" && decimals === undefined) return null;
  const basisPoints =
    Number(whole || "0") * 100 + Number((decimals ?? "").padEnd(2, "0") || "0");
  return basisPoints <= 10_000 ? basisPoints : null;
}
