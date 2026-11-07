import { describe, expect, it } from "vitest";
import { formatRinggit } from "./format";

describe("formatRinggit", () => {
  it.each([
    [0, "RM0.00"],
    [5, "RM0.05"],
    [1240, "RM12.40"],
    [4114, "RM41.14"],
    [123456, "RM1,234.56"],
    [-10, "-RM0.10"],
  ])("formats %i sen as %s", (sen, expected) => {
    expect(formatRinggit(sen)).toBe(expected);
  });

  it("rejects anything that is not whole sen", () => {
    expect(() => formatRinggit(12.4)).toThrow(RangeError);
    expect(() => formatRinggit(Number.NaN)).toThrow(RangeError);
  });
});
