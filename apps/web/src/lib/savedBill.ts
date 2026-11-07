import type { Bill } from "@splitlah/core";

/** Everything anyone with the link may see. Never contains token hashes. */
export type SavedBill = {
  id: string;
  version: number;
  locale: string;
  restaurantName: string | null;
  /** Dishes carry who had them, as portions. */
  bill: Bill;
  payerName: string;
  people: {
    id: string;
    name: string;
    /** Someone has picked this name on their phone. */
    joined: boolean;
    paid: boolean;
    placeholder: boolean;
  }[];
  payment: {
    bankName: string | null;
    accountNumber: string | null;
    phone: string | null;
    hasQr: boolean;
  };
};
