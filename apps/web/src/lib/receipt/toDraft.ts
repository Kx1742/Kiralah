import { parsePercent, parseRinggit } from "@kiralah/core";
import {
  basisPointsToText,
  type ItemisedDraft,
  senToText,
  type VoucherDraft,
} from "../draft";
import type { ScannedReceipt } from "./schema";

/** Reads a printed amount that may carry a sign, e.g. "-0.02". */
function signedSen(text: string | null): number | null {
  if (text === null) return null;
  const trimmed = text.trim();
  const negative = /^[-−(]/.test(trimmed);
  const sen = parseRinggit(
    trimmed.replace(/^[-−(]|\)$/g, "").replace(/^[+]/, ""),
  );
  return sen === null ? null : negative ? -sen : sen;
}

/** Works out a rate from printed amounts, rounded to a whole percent, the way rates are set. */
function rateFrom(
  charge: ScannedReceipt["serviceCharge"],
  base: number,
): { sen: number; basisPoints: number } | null {
  if (!charge) return null;
  const sen = signedSen(charge.amount);
  if (sen === null || sen <= 0) return null;
  const printed =
    charge.ratePercent === null ? null : parsePercent(charge.ratePercent);
  if (printed !== null && printed > 0) return { sen, basisPoints: printed };
  if (base <= 0) return null;
  return { sen, basisPoints: Math.round((sen * 100) / base) * 100 };
}

export type ScanResult = {
  change: Partial<ItemisedDraft>;
  itemsRead: number;
  /** Lines whose amount couldn't be read: the payer adds these by hand. */
  linesSkipped: number;
};

/** Turns what Claude read into the payer's draft, for them to check. */
export function receiptToDraft(
  receipt: ScannedReceipt,
  newId: () => string,
): ScanResult {
  let linesSkipped = 0;
  const items: ItemisedDraft["items"] = [];
  for (const line of receipt.items) {
    const sen = signedSen(line.lineTotal);
    const name = line.name.trim();
    if (sen === null || sen < 0 || name === "") {
      linesSkipped++;
      continue;
    }
    const quantity = Math.max(1, Math.min(999, Math.round(line.quantity)));
    // A price that doesn't divide evenly (3 for RM10) stays one line, so no sen go missing.
    items.push(
      sen % quantity === 0
        ? { id: newId(), name, quantity, priceText: senToText(sen / quantity) }
        : {
            id: newId(),
            name: `${quantity} × ${name}`,
            quantity: 1,
            priceText: senToText(sen),
          },
    );
  }

  const itemsSen = items.reduce(
    (total, item) =>
      total + item.quantity * (parseRinggit(item.priceText) ?? 0),
    0,
  );
  const subtotal = signedSen(receipt.subtotal) ?? itemsSen;
  const vouchers: VoucherDraft[] = [];
  let discountSen = 0;
  for (const discount of receipt.discounts) {
    const sen = Math.abs(signedSen(discount.amount) ?? 0);
    if (sen === 0) continue;
    discountSen += sen;
    vouchers.push({
      id: newId(),
      kind: "amountOff",
      valueText: senToText(sen),
      minSpendText: "",
      keptBy: "",
      itemId: "",
      promoType: "oneForOne",
    });
  }

  const service = rateFrom(receipt.serviceCharge, subtotal - discountSen);
  const tax = rateFrom(
    receipt.serviceTax,
    subtotal - discountSen + (service?.sen ?? 0),
  );
  const rounding = signedSen(receipt.rounding);
  const total = signedSen(receipt.total);

  return {
    itemsRead: items.length,
    linesSkipped,
    change: {
      restaurantName: receipt.restaurantName?.trim().slice(0, 80) ?? "",
      items,
      vouchers,
      pricesIncludeCharges: receipt.pricesIncludeTax && !service && !tax,
      serviceOn: service !== null,
      ...(service
        ? { serviceRateText: basisPointsToText(service.basisPoints) }
        : {}),
      taxOn: tax !== null,
      ...(tax ? { taxRateText: basisPointsToText(tax.basisPoints) } : {}),
      // A printed rounding line means the restaurant rounded to 5 sen for cash.
      cashRounding: rounding !== null && rounding !== 0,
      receiptTotalText: total !== null && total > 0 ? senToText(total) : "",
    },
  };
}
