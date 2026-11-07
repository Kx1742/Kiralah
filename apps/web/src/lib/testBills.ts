import { type Bill, DEFAULT_CHARGES } from "@kiralah/core";

export const itemisedBill = {
  mode: "itemised",
  payerId: "payer",
  people: [{ id: "payer", name: "Ali" }],
  cashRounding: false,
  items: [
    {
      id: "a",
      name: "Nasi lemak",
      quantity: 1,
      unitPriceSen: 1000,
      portions: [],
    },
  ],
  discounts: [],
  charges: DEFAULT_CHARGES,
  adjustments: [],
} satisfies Bill;

export const emptyEqualDraftBill = {
  mode: "equal",
  payerId: "payer",
  people: [
    { id: "payer", name: "Ali" },
    { id: "friend-2", name: "Friend 2" },
  ],
  cashRounding: false,
  totalSen: 5000,
} satisfies Bill;
