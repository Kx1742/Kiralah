import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatRinggit } from "./format";
import { parsePercent, parseRinggit } from "./parse";

describe("parseRinggit", () => {
  it.each([
    ["12", 1200],
    ["12.4", 1240],
    ["12.40", 1240],
    [" RM12.40 ", 1240],
    ["rm 5", 500],
    [".5", 50],
    ["0", 0],
    ["1,234.50", 123450],
    ["41.14", 4114],
    ["1.1", 110],
    ["19.99", 1999],
  ])("reads %s as %i sen", (text, sen) => {
    expect(parseRinggit(text)).toBe(sen);
  });

  it.each([
    "",
    "abc",
    "12.345",
    "-5",
    "1,23",
    "12,34.50",
    "1e3",
    "RM",
    ".",
    "99999999",
  ])("rejects %s", (text) => {
    expect(parseRinggit(text)).toBeNull();
  });

  it("reads back everything formatRinggit writes", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100_000_000 }), (sen) => {
        expect(parseRinggit(formatRinggit(sen))).toBe(sen);
      }),
    );
  });
});

describe("parsePercent", () => {
  it.each([
    ["10", 1000],
    ["6", 600],
    ["8.5", 850],
    ["8.25%", 825],
    ["0", 0],
    ["100", 10_000],
  ])("reads %s as %i basis points", (text, basisPoints) => {
    expect(parsePercent(text)).toBe(basisPoints);
  });

  it.each(["", "abc", "101", "-5", "1.234", "%"])("rejects %s", (text) => {
    expect(parsePercent(text)).toBeNull();
  });
});
