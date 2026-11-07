import { describe, expect, it } from "vitest";
import {
  hashEditToken,
  isBillId,
  isEditTokenValid,
  newBillId,
  newEditToken,
} from "./tokens";

describe("bill ids", () => {
  it("are 16 URL-safe characters and do not repeat", () => {
    const ids = Array.from({ length: 2000 }, newBillId);
    expect(ids.every(isBillId)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rejects anything that could not be a bill id", () => {
    expect(isBillId("short")).toBe(false);
    expect(isBillId("../../etc/passwd")).toBe(false);
    expect(isBillId("0123456789abcdef!")).toBe(false);
  });
});

describe("edit tokens", () => {
  it("are never stored in the clear and only match themselves", () => {
    const token = newEditToken();
    const hash = hashEditToken(token);
    expect(hash).not.toContain(token);
    expect(isEditTokenValid(token, hash)).toBe(true);
    expect(isEditTokenValid(newEditToken(), hash)).toBe(false);
    expect(isEditTokenValid("", hash)).toBe(false);
  });
});
