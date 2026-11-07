import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BILL_ID_LENGTH = 16;

/** About 95 random bits: short enough for WhatsApp, impossible to guess. */
export function newBillId(): string {
  let id = "";
  while (id.length < BILL_ID_LENGTH) {
    for (const byte of randomBytes(BILL_ID_LENGTH)) {
      // Rejecting the top of the range keeps every character equally likely.
      if (byte < 248 && id.length < BILL_ID_LENGTH) id += BASE62[byte % 62];
    }
  }
  return id;
}

export const isBillId = (id: string) => /^[0-9A-Za-z]{16}$/.test(id);

export function newEditToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashEditToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isEditTokenValid(token: string, hash: string): boolean {
  const actual = Buffer.from(hashEditToken(token), "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
