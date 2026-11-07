import { timingSafeEqual } from "node:crypto";
import { deleteExpired } from "@/lib/cleanup";

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Called once a day by Vercel Cron, which sends the CRON_SECRET it was given. */
export async function GET(request: Request) {
  if (!authorised(request))
    return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await deleteExpired());
}
