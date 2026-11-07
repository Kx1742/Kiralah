import { beforeEach, describe, expect, it, vi } from "vitest";
import { withinHourlyLimit } from "./rateLimit";

const counts = new Map<string, number>();
const upsert = vi.fn(async ({ where: { key } }: { where: { key: string } }) => {
  const count = (counts.get(key) ?? 0) + 1;
  counts.set(key, count);
  return { key, count };
});

vi.mock("./db", () => ({ getDb: () => ({ rateLimit: { upsert } }) }));

const requestFrom = (ip: string) =>
  new Request("http://localhost/api/bills", {
    headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
  });

describe("withinHourlyLimit", () => {
  beforeEach(() => {
    counts.clear();
    upsert.mockClear();
  });

  it("allows up to the limit, then refuses", async () => {
    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push(
        await withinHourlyLimit(requestFrom("1.2.3.4"), "createBill", 2),
      );
    }
    expect(results).toEqual([true, true, false]);
  });

  it("counts each client and each action separately", async () => {
    expect(
      await withinHourlyLimit(requestFrom("1.2.3.4"), "createBill", 1),
    ).toBe(true);
    expect(
      await withinHourlyLimit(requestFrom("5.6.7.8"), "createBill", 1),
    ).toBe(true);
    expect(
      await withinHourlyLimit(requestFrom("1.2.3.4"), "scanReceipt", 1),
    ).toBe(true);
  });

  it("never stores the IP address", async () => {
    await withinHourlyLimit(requestFrom("1.2.3.4"), "createBill", 1);
    expect(JSON.stringify(upsert.mock.calls)).not.toContain("1.2.3.4");
  });
});
