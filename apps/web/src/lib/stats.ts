import { getDb } from "./db";

const MALAYSIA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date in Malaysia, as a date with no time. */
export function malaysiaDay(now = new Date()): Date {
  const local = new Date(now.getTime() + MALAYSIA_OFFSET_MS);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()),
  );
}

type Db = Pick<ReturnType<typeof getDb>, "dailyStat">;

/** Adds one bill to today's totals. */
export async function recordBill(
  db: Db,
  bill: { people: number; totalSen: number },
) {
  const day = malaysiaDay();
  await db.dailyStat.upsert({
    where: { day },
    create: {
      day,
      billsCreated: 1,
      people: bill.people,
      senSplit: BigInt(bill.totalSen),
    },
    update: {
      billsCreated: { increment: 1 },
      people: { increment: bill.people },
      senSplit: { increment: BigInt(bill.totalSen) },
    },
  });
}

export type UsageTotals = { bills: number; people: number; senSplit: number };

async function totalsSince(since: Date | null): Promise<UsageTotals> {
  const { _sum } = await getDb().dailyStat.aggregate({
    where: since ? { day: { gte: since } } : {},
    _sum: { billsCreated: true, people: true, senSplit: true },
  });
  return {
    bills: _sum.billsCreated ?? 0,
    people: _sum.people ?? 0,
    senSplit: Number(_sum.senSplit ?? 0),
  };
}

export async function getUsage() {
  const [allTime, last30Days] = await Promise.all([
    totalsSince(null),
    totalsSince(new Date(malaysiaDay().getTime() - 29 * DAY_MS)),
  ]);
  return { allTime, last30Days };
}
