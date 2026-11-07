import { getDb } from "./db";

/** Deletes bills older than 30 days (dishes, people and picks go with them) and old rate-limit counts. */
export async function deleteExpired(now = new Date()) {
  const db = getDb();
  const bills = await db.bill.deleteMany({ where: { expiresAt: { lt: now } } });
  const limits = await db.rateLimit.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  return { bills: bills.count, rateLimits: limits.count };
}
