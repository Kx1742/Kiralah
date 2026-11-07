import { describe, expect, it } from "vitest";
import { sumSen } from "./sum";

describe("sumSen", () => {
  it("adds whole sen", () => {
    expect(sumSen([])).toBe(0);
    expect(sumSen([250, 300, 380])).toBe(930);
  });

  it("rejects anything that is not whole sen", () => {
    expect(() => sumSen([2.5])).toThrow(RangeError);
  });
});
