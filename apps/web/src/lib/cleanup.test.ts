import { describe, expect, it, vi } from "vitest";
import { deleteExpired } from "./cleanup";

const billDelete = vi.fn().mockResolvedValue({ count: 3 });
const limitDelete = vi.fn().mockResolvedValue({ count: 7 });
vi.mock("./db", () => ({
  getDb: () => ({
    bill: { deleteMany: billDelete },
    rateLimit: { deleteMany: limitDelete },
  }),
}));

describe("deleteExpired", () => {
  it("deletes only what has expired", async () => {
    const now = new Date("2026-12-01T00:00:00Z");
    expect(await deleteExpired(now)).toEqual({ bills: 3, rateLimits: 7 });
    expect(billDelete).toHaveBeenCalledWith({
      where: { expiresAt: { lt: now } },
    });
    expect(limitDelete).toHaveBeenCalledWith({
      where: { expiresAt: { lt: now } },
    });
  });
});
