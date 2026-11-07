import { createHash } from "node:crypto";
import { getDb } from "./db";

const HOUR_MS = 60 * 60 * 1000;

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

/** True if this client is still within its hourly limit. Stores only a salted hash. */
export async function withinHourlyLimit(
  request: Request,
  action: string,
  limit: number,
): Promise<boolean> {
  const hour = Math.floor(Date.now() / HOUR_MS);
  const key = createHash("sha256")
    .update(
      `${process.env.RATE_LIMIT_SALT ?? ""}:${action}:${hour}:${clientIp(request)}`,
    )
    .digest("hex");

  const { count } = await getDb().rateLimit.upsert({
    where: { key },
    create: { key, count: 1, expiresAt: new Date((hour + 2) * HOUR_MS) },
    update: { count: { increment: 1 } },
  });
  return count <= limit;
}
