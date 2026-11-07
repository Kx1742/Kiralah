import { billSchema, calculateBill } from "@splitlah/core";
import { describe, expect, it } from "vitest";
import {
  basisPointsToText,
  billToItemisedDraft,
  commitPending,
  emptyEqualDraft,
  emptyItemisedDraft,
  equalDraftToBill,
  hasUnfinishedDish,
  isItemValid,
  type ItemisedDraft,
  itemisedDraftToBill,
  senToText,
  type VoucherDraft,
} from "./draft";

const labels = {
  payer: "Me",
  adjustment: "Adjustment",
  voucher: () => "Voucher",
};

const draftWith = (change: Partial<ItemisedDraft>): ItemisedDraft => ({
  ...emptyItemisedDraft(),
  payerName: "Ali",
  items: [
    { id: "a", name: "Nasi lemak", quantity: 2, priceText: "10" },
    { id: "b", name: "Half typed", quantity: 1, priceText: "abc" },
  ],
  ...change,
});

const voucher = (change: Partial<VoucherDraft>): VoucherDraft => ({
  id: "v",
  kind: "amountOff",
  valueText: "5",
  minSpendText: "",
  keptBy: "",
  itemId: "",
  promoType: "oneForOne",
  ...change,
});

const total = (draft: ItemisedDraft) =>
  calculateBill(itemisedDraftToBill(draft, labels)).totalSen;

describe("itemised draft", () => {
  it("defaults to 10% service and 6% SST", () => {
    expect(total(draftWith({}))).toBe(2332);
  });

  it("makes a bill the schema accepts", () => {
    const bill = itemisedDraftToBill(
      draftWith({
        friends: [{ id: "f", name: "Bee" }],
        vouchers: [voucher({ keptBy: "f", minSpendText: "1" })],
        adjustments: [{ id: "adj", amountSen: -2 }],
        receiptTotalText: "41.14",
      }),
      labels,
    );
    expect(billSchema.safeParse(bill).success).toBe(true);
  });

  it("leaves out half-typed items and unfinished rows, without losing them", () => {
    const draft = draftWith({ friends: [{ id: "f", name: "  " }] });
    const bill = itemisedDraftToBill(draft, labels);
    expect(bill.people).toHaveLength(1);
    expect(
      bill.mode === "itemised" && bill.items.map((item) => item.id),
    ).toEqual(["a"]);
    expect(draft.items).toHaveLength(2);
    expect(isItemValid(draft.items[1]!)).toBe(false);
  });

  it("nett prices skip both charges", () => {
    expect(total(draftWith({ pricesIncludeCharges: true }))).toBe(2000);
  });

  it("turning off service charge leaves SST", () => {
    expect(total(draftWith({ serviceOn: false }))).toBe(2120);
  });

  it("uses custom rates", () => {
    expect(total(draftWith({ taxRateText: "8" }))).toBe(2376);
  });

  it.each([
    ["RM off", voucher({ valueText: "5" }), 1749],
    ["% off", voucher({ kind: "percentOff", valueText: "50" }), 1166],
    ["1-for-1", voucher({ kind: "itemPromo", itemId: "a" }), 1166],
    [
      "one free",
      voucher({ kind: "itemPromo", itemId: "a", promoType: "freeUnits" }),
      1166,
    ],
  ])("applies a %s voucher", (_name, entry, expected) => {
    expect(total(draftWith({ vouchers: [entry] }))).toBe(expected);
  });

  it.each([
    ["no value", voucher({ valueText: "" })],
    ["a value that is not money", voucher({ valueText: "abc" })],
    ["no dish", voucher({ kind: "itemPromo" })],
    ["a deleted dish", voucher({ kind: "itemPromo", itemId: "gone" })],
  ])("ignores a voucher with %s", (_name, entry) => {
    expect(total(draftWith({ vouchers: [entry] }))).toBe(2332);
  });
});

describe("typed but not added", () => {
  let next = 0;
  const newId = () => `new-${next++}`;

  it("adds a complete dish and clears the boxes", () => {
    const draft = commitPending(
      draftWith({
        items: [],
        pendingDishName: " Kopi ",
        pendingDishPrice: "3",
      }),
      newId,
    );
    expect(draft.items.map((item) => [item.name, item.priceText])).toEqual([
      ["Kopi", "3"],
    ]);
    expect(draft.pendingDishName).toBe("");
    expect(hasUnfinishedDish(draft)).toBe(false);
  });

  it.each([
    ["a name with no price", "Kopi", ""],
    ["a price with no name", "", "3"],
    ["a wrong price", "Kopi", "abc"],
  ])(
    "keeps %s and reports it as unfinished",
    (_name, pendingDishName, pendingDishPrice) => {
      const draft = commitPending(
        draftWith({ items: [], pendingDishName, pendingDishPrice }),
        newId,
      );
      expect(draft.items).toEqual([]);
      expect(draft.pendingDishName).toBe(pendingDishName);
      expect(hasUnfinishedDish(draft)).toBe(true);
    },
  );

  it("adds a friend, and ignores blank boxes", () => {
    expect(
      commitPending(draftWith({ pendingFriendName: "Bee" }), newId).friends.map(
        (f) => f.name,
      ),
    ).toEqual(["Bee"]);
    expect(
      commitPending(draftWith({ pendingFriendName: "  " }), newId).friends,
    ).toEqual([]);
  });
});

describe("equal draft", () => {
  it("names the payer and numbers the rest", () => {
    const bill = equalDraftToBill(
      {
        ...emptyEqualDraft(),
        payerName: "Ali",
        totalText: "100",
        peopleCount: 3,
      },
      { payer: "Me", friend: (number) => `Friend ${number}` },
    );
    expect(billSchema.safeParse(bill).success).toBe(true);
    expect(bill.people.map((person) => person.name)).toEqual([
      "Ali",
      "Friend 2",
      "Friend 3",
    ]);
    expect(calculateBill(bill).shares.map((share) => share.amountSen)).toEqual([
      3334, 3333, 3333,
    ]);
  });
});

describe("editing a saved bill", () => {
  it.each([
    [0, "0.00"],
    [5, "0.05"],
    [1240, "12.40"],
    [123456, "1234.56"],
  ])("writes %i sen as %s", (sen, text) => {
    expect(senToText(sen)).toBe(text);
  });

  it.each([
    [1000, "10"],
    [850, "8.5"],
    [825, "8.25"],
    [5, "0.05"],
  ])("writes %i basis points as %s", (basisPoints, text) => {
    expect(basisPointsToText(basisPoints)).toBe(text);
  });

  it("opens a saved bill and saves it back unchanged", () => {
    const original = itemisedDraftToBill(
      draftWith({
        restaurantName: "Restoran ABC",
        items: [
          { id: "a", name: "Nasi lemak", quantity: 2, priceText: "10.50" },
          { id: "b", name: "Teh tarik", quantity: 1, priceText: "2.5" },
        ],
        taxRateText: "8",
        friends: [{ id: "f", name: "Bee" }],
        vouchers: [
          voucher({
            kind: "percentOff",
            valueText: "12.5",
            minSpendText: "20",
            keptBy: "f",
          }),
          voucher({
            id: "w",
            kind: "itemPromo",
            itemId: "a",
            promoType: "oneForOne",
          }),
        ],
        adjustments: [{ id: "adj", amountSen: 3 }],
        receiptTotalText: "30",
        cashRounding: true,
      }),
      labels,
    );
    const draft = billToItemisedDraft({
      id: "0123456789abcdef",
      version: 0,
      locale: "en",
      restaurantName: "Restoran ABC",
      bill: original,
      payerName: "Ali",
      people: [],
      payment: {
        bankName: null,
        accountNumber: null,
        phone: null,
        hasQr: true,
      },
    });
    expect(itemisedDraftToBill(draft, labels)).toEqual(original);
    expect(draft.payment.savedQrUrl).toBe("/api/bills/0123456789abcdef/qr");
  });
});
