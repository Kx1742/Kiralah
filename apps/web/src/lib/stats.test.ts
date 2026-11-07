import { describe, expect, it, vi } from "vitest";
import { malaysiaDay, recordBill } from "./stats";

vi.mock("./db", () => ({ getDb: () => ({}) }));

describe("malaysiaDay", () => {
  it("counts by the Malaysian date, not UTC", () => {
    // 11pm UTC on 1 Dec is already 7am on 2 Dec in Kuala Lumpur.
    expect(malaysiaDay(new Date("2026-12-01T23:00:00Z")).toISOString()).toBe(
      "2026-12-02T00:00:00.000Z",
    );
    expect(malaysiaDay(new Date("2026-12-01T15:59:00Z")).toISOString()).toBe(
      "2026-12-01T00:00:00.000Z",
    );
  });
});

describe("recordBill", () => {
  it("stores counts and a total, nothing personal", async () => {
    const upsert = vi.fn();
    await recordBill({ dailyStat: { upsert } } as never, {
      people: 3,
      totalSen: 4114,
    });
    const call = upsert.mock.calls[0]![0];
    expect(call.create).toEqual({
      day: expect.any(Date),
      billsCreated: 1,
      people: 3,
      senSplit: 4114n,
    });
    expect(Object.keys(call.update)).toEqual([
      "billsCreated",
      "people",
      "senSplit",
    ]);
  });
});
