import type { SavedBill } from "./savedBill";
import {
  type Bill,
  type Charges,
  DEFAULT_CHARGES,
  type Discount,
  parsePercent,
  parseRinggit,
} from "@splitlah/core";

export const PAYER_ID = "payer";

export type ItemDraft = {
  id: string;
  name: string;
  quantity: number;
  priceText: string;
};
export type FriendDraft = { id: string; name: string };
export type AdjustmentDraft = { id: string; amountSen: number };

export type VoucherKind = "percentOff" | "amountOff" | "itemPromo";
export type PromoType = "oneForOne" | "freeUnits" | "percentOff" | "amountOff";

export type VoucherDraft = {
  id: string;
  kind: VoucherKind;
  valueText: string;
  minSpendText: string;
  /** "" means everyone shares the savings. */
  keptBy: string;
  itemId: string;
  promoType: PromoType;
};

export type PaymentDraft = {
  bankName: string;
  accountNumber: string;
  phone: string;
  qrDataUrl: string;
  /** When editing: the QR already saved with the bill, kept unless removed. */
  savedQrUrl?: string;
};

export type ItemisedDraft = {
  restaurantName: string;
  items: ItemDraft[];
  serviceOn: boolean;
  serviceRateText: string;
  taxOn: boolean;
  taxRateText: string;
  pricesIncludeCharges: boolean;
  taxOnServiceCharge: boolean;
  discountTiming: Charges["discountTiming"];
  cashRounding: boolean;
  receiptTotalText: string;
  adjustments: AdjustmentDraft[];
  payerName: string;
  friends: FriendDraft[];
  vouchers: VoucherDraft[];
  payment: PaymentDraft;
  /** Typed but not added yet: kept so nothing is lost, and added on Next. */
  pendingDishName: string;
  pendingDishPrice: string;
  pendingFriendName: string;
};

export type EqualDraft = {
  restaurantName: string;
  totalText: string;
  peopleCount: number;
  payerName: string;
  cashRounding: boolean;
  payment: PaymentDraft;
};

export const EMPTY_PAYMENT: PaymentDraft = {
  bankName: "",
  accountNumber: "",
  phone: "",
  qrDataUrl: "",
};

export function emptyItemisedDraft(): ItemisedDraft {
  return {
    restaurantName: "",
    items: [],
    serviceOn: true,
    serviceRateText: String(DEFAULT_CHARGES.serviceChargeBasisPoints / 100),
    taxOn: true,
    taxRateText: String(DEFAULT_CHARGES.serviceTaxBasisPoints / 100),
    pricesIncludeCharges: DEFAULT_CHARGES.pricesIncludeCharges,
    taxOnServiceCharge: DEFAULT_CHARGES.taxOnServiceCharge,
    discountTiming: DEFAULT_CHARGES.discountTiming,
    cashRounding: false,
    receiptTotalText: "",
    adjustments: [],
    payerName: "",
    friends: [],
    vouchers: [],
    payment: EMPTY_PAYMENT,
    pendingDishName: "",
    pendingDishPrice: "",
    pendingFriendName: "",
  };
}

export function emptyEqualDraft(): EqualDraft {
  return {
    restaurantName: "",
    totalText: "",
    peopleCount: 2,
    payerName: "",
    cashRounding: false,
    payment: EMPTY_PAYMENT,
  };
}

export function isItemValid(item: ItemDraft): boolean {
  return item.name.trim() !== "" && parseRinggit(item.priceText) !== null;
}

/** Adds a dish or friend that was typed but never added, once it is complete. */
export function commitPending(
  draft: ItemisedDraft,
  newId: () => string,
): ItemisedDraft {
  const dishName = draft.pendingDishName.trim();
  const friendName = draft.pendingFriendName.trim();
  const dishIsComplete =
    dishName !== "" && parseRinggit(draft.pendingDishPrice) !== null;
  return {
    ...draft,
    items: dishIsComplete
      ? [
          ...draft.items,
          {
            id: newId(),
            name: dishName,
            quantity: 1,
            priceText: draft.pendingDishPrice,
          },
        ]
      : draft.items,
    pendingDishName: dishIsComplete ? "" : draft.pendingDishName,
    pendingDishPrice: dishIsComplete ? "" : draft.pendingDishPrice,
    friends: friendName
      ? [...draft.friends, { id: newId(), name: friendName }]
      : draft.friends,
    pendingFriendName: "",
  };
}

export function hasUnfinishedDish(draft: ItemisedDraft): boolean {
  const name = draft.pendingDishName.trim();
  const price = draft.pendingDishPrice.trim();
  if (name === "" && price === "") return false;
  return name === "" || parseRinggit(price) === null;
}

function chargesFrom(draft: ItemisedDraft): Charges {
  return {
    pricesIncludeCharges: draft.pricesIncludeCharges,
    serviceChargeBasisPoints: draft.serviceOn
      ? (parsePercent(draft.serviceRateText) ?? 0)
      : 0,
    serviceTaxBasisPoints: draft.taxOn
      ? (parsePercent(draft.taxRateText) ?? 0)
      : 0,
    taxOnServiceCharge: draft.taxOnServiceCharge,
    discountTiming: draft.discountTiming,
  };
}

/** Half-finished vouchers are simply left out until they make sense. */
function discountFrom(
  voucher: VoucherDraft,
  itemIds: ReadonlySet<string>,
  personIds: ReadonlySet<string>,
  label: string,
): Discount | null {
  const { id, kind, valueText } = voucher;
  if (kind === "itemPromo") {
    if (!itemIds.has(voucher.itemId)) return null;
    const base = { id, label, kind, itemId: voucher.itemId };
    switch (voucher.promoType) {
      case "oneForOne":
        return { ...base, promo: { type: "oneForOne" } };
      case "freeUnits":
        return { ...base, promo: { type: "freeUnits", units: 1 } };
      case "percentOff": {
        const basisPoints = parsePercent(valueText);
        return basisPoints === null
          ? null
          : { ...base, promo: { type: "percentOff", basisPoints } };
      }
      case "amountOff": {
        const amountSen = parseRinggit(valueText);
        return amountSen === null
          ? null
          : { ...base, promo: { type: "amountOff", amountSen } };
      }
    }
  }

  const minSpendSen = parseRinggit(voucher.minSpendText);
  const extras = {
    ...(minSpendSen !== null && minSpendSen > 0 ? { minSpendSen } : {}),
    ...(personIds.has(voucher.keptBy)
      ? { keptByPersonId: voucher.keptBy }
      : {}),
  };
  if (kind === "percentOff") {
    const basisPoints = parsePercent(valueText);
    return basisPoints === null
      ? null
      : { id, label, kind, basisPoints, ...extras };
  }
  const amountSen = parseRinggit(valueText);
  return amountSen === null ? null : { id, label, kind, amountSen, ...extras };
}

export type DraftLabels = {
  payer: string;
  adjustment: string;
  voucher: (voucher: VoucherDraft) => string;
};

export function itemisedDraftToBill(
  draft: ItemisedDraft,
  labels: DraftLabels,
): Bill {
  const friends = draft.friends.filter((friend) => friend.name.trim() !== "");
  const people = [
    { id: PAYER_ID, name: draft.payerName.trim() || labels.payer },
    ...friends.map((friend) => ({ id: friend.id, name: friend.name.trim() })),
  ];
  const items = draft.items.filter(isItemValid).map((item) => ({
    id: item.id,
    name: item.name.trim(),
    quantity: item.quantity,
    unitPriceSen: parseRinggit(item.priceText)!,
    portions: [],
  }));
  const itemIds = new Set(items.map((item) => item.id));
  const personIds = new Set(people.map((person) => person.id));
  const receiptTotalSen = parseRinggit(draft.receiptTotalText);

  return {
    mode: "itemised",
    payerId: PAYER_ID,
    people,
    cashRounding: draft.cashRounding,
    items,
    discounts: draft.vouchers.flatMap((voucher) => {
      const discount = discountFrom(
        voucher,
        itemIds,
        personIds,
        labels.voucher(voucher),
      );
      return discount ? [discount] : [];
    }),
    charges: chargesFrom(draft),
    adjustments: draft.adjustments.map(({ id, amountSen }) => ({
      id,
      label: labels.adjustment,
      amountSen,
    })),
    ...(receiptTotalSen !== null ? { receiptTotalSen } : {}),
  };
}

export function equalDraftToBill(
  draft: EqualDraft,
  labels: { payer: string; friend: (number: number) => string },
): Bill {
  return {
    mode: "equal",
    payerId: PAYER_ID,
    cashRounding: draft.cashRounding,
    totalSen: parseRinggit(draft.totalText) ?? 0,
    people: [
      { id: PAYER_ID, name: draft.payerName.trim() || labels.payer },
      ...Array.from({ length: draft.peopleCount - 1 }, (_, index) => ({
        id: `friend-${index + 2}`,
        name: labels.friend(index + 2),
      })),
    ],
  };
}

/** 1240 → "12.40": for putting saved amounts back into text boxes. */
export function senToText(sen: number): string {
  return `${Math.floor(sen / 100)}.${String(sen % 100).padStart(2, "0")}`;
}

/** 850 → "8.5", 1000 → "10". */
export function basisPointsToText(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100);
  const rest = basisPoints % 100;
  return rest === 0
    ? `${whole}`
    : `${whole}.${String(rest).padStart(2, "0").replace(/0$/, "")}`;
}

function paymentFrom(saved: SavedBill): PaymentDraft {
  return {
    bankName: saved.payment.bankName ?? "",
    accountNumber: saved.payment.accountNumber ?? "",
    phone: saved.payment.phone ?? "",
    qrDataUrl: "",
    ...(saved.payment.hasQr ? { savedQrUrl: `/api/bills/${saved.id}/qr` } : {}),
  };
}

function voucherFrom(discount: Discount): VoucherDraft {
  const base: VoucherDraft = {
    id: discount.id,
    kind: discount.kind,
    valueText: "",
    minSpendText: "",
    keptBy: "",
    itemId: "",
    promoType: "oneForOne",
  };
  if (discount.kind === "itemPromo") {
    const { promo } = discount;
    return {
      ...base,
      itemId: discount.itemId,
      promoType: promo.type,
      valueText:
        promo.type === "percentOff"
          ? basisPointsToText(promo.basisPoints)
          : promo.type === "amountOff"
            ? senToText(promo.amountSen)
            : "",
    };
  }
  return {
    ...base,
    valueText:
      discount.kind === "percentOff"
        ? basisPointsToText(discount.basisPoints)
        : senToText(discount.amountSen),
    minSpendText: discount.minSpendSen ? senToText(discount.minSpendSen) : "",
    keptBy: discount.keptByPersonId ?? "",
  };
}

/** Opens a saved bill in the payer's wizard, so editing feels like making it. */
export function billToItemisedDraft(saved: SavedBill): ItemisedDraft {
  const { bill } = saved;
  if (bill.mode !== "itemised") throw new Error("Not an itemised bill");
  const { charges } = bill;
  const empty = emptyItemisedDraft();
  return {
    ...empty,
    restaurantName: saved.restaurantName ?? "",
    items: bill.items.map(({ id, name, quantity, unitPriceSen }) => ({
      id,
      name,
      quantity,
      priceText: senToText(unitPriceSen),
    })),
    serviceOn: charges.serviceChargeBasisPoints > 0,
    serviceRateText:
      charges.serviceChargeBasisPoints > 0
        ? basisPointsToText(charges.serviceChargeBasisPoints)
        : empty.serviceRateText,
    taxOn: charges.serviceTaxBasisPoints > 0,
    taxRateText:
      charges.serviceTaxBasisPoints > 0
        ? basisPointsToText(charges.serviceTaxBasisPoints)
        : empty.taxRateText,
    pricesIncludeCharges: charges.pricesIncludeCharges,
    taxOnServiceCharge: charges.taxOnServiceCharge,
    discountTiming: charges.discountTiming,
    cashRounding: bill.cashRounding,
    receiptTotalText:
      bill.receiptTotalSen === undefined ? "" : senToText(bill.receiptTotalSen),
    adjustments: bill.adjustments.map(({ id, amountSen }) => ({
      id,
      amountSen,
    })),
    payerName: saved.payerName,
    friends: bill.people
      .filter((person) => person.id !== bill.payerId)
      .map(({ id, name }) => ({ id, name })),
    vouchers: bill.discounts.map(voucherFrom),
    payment: paymentFrom(saved),
  };
}

export function billToEqualDraft(saved: SavedBill): EqualDraft {
  const { bill } = saved;
  if (bill.mode !== "equal") throw new Error("Not an equal bill");
  return {
    restaurantName: saved.restaurantName ?? "",
    totalText: senToText(bill.totalSen),
    peopleCount: bill.people.length,
    payerName: saved.payerName,
    cashRounding: bill.cashRounding,
    payment: paymentFrom(saved),
  };
}
