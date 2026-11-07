import { ActionError } from "@/lib/actionError";
import { handle, readBody } from "@/lib/apiRoute";
import { decodeImage } from "@/lib/billInput";
import { withinDailyCap, withinHourlyLimit } from "@/lib/rateLimit";
import { readReceipt } from "@/lib/receipt/read";
import { z } from "zod";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const inputSchema = z.strictObject({ image: z.string().max(5_000_000) });

/** Reads a receipt photo with Claude. The photo is never stored or logged. */
export async function POST(request: Request) {
  return handle(async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "unavailable" }, { status: 503 });
    }
    const { image } = await readBody(request, inputSchema);
    const decoded = decodeImage(image, MAX_IMAGE_BYTES);
    if (!decoded) throw new ActionError("invalid");

    const hourly = Number(process.env.RECEIPT_HOURLY_LIMIT ?? 10);
    if (!(await withinHourlyLimit(request, "scanReceipt", hourly))) {
      throw new ActionError("rateLimited");
    }
    // One cap for everyone: keeps a bad day from becoming a big bill.
    const daily = Number(process.env.RECEIPT_DAILY_CAP ?? 200);
    if (!(await withinDailyCap("scanReceipt", daily))) {
      return Response.json({ error: "limitReached" }, { status: 503 });
    }

    const outcome = await readReceipt(
      Buffer.from(decoded.bytes).toString("base64"),
      decoded.type as "image/jpeg" | "image/png" | "image/webp",
    );
    if (outcome.ok) return Response.json({ receipt: outcome.receipt });
    const status =
      outcome.error === "busy" || outcome.error === "unavailable" ? 503 : 422;
    return Response.json({ error: outcome.error }, { status });
  });
}
