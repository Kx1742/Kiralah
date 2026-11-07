import { createBillInputSchema } from "@/lib/billInput";
import { createBill, InvalidQrImage } from "@/lib/bills";
import { withinHourlyLimit } from "@/lib/rateLimit";

const MAX_BODY_BYTES = 1_000_000;

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return Response.json({ error: "tooLarge" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const input = createBillInputSchema.safeParse(body);
  if (!input.success) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const limit = Number(process.env.BILL_CREATE_HOURLY_LIMIT ?? 30);
  if (!(await withinHourlyLimit(request, "createBill", limit))) {
    return Response.json({ error: "rateLimited" }, { status: 429 });
  }

  try {
    return Response.json(await createBill(input.data), { status: 201 });
  } catch (error) {
    if (error instanceof InvalidQrImage) {
      return Response.json({ error: "invalidQr" }, { status: 400 });
    }
    throw error;
  }
}
