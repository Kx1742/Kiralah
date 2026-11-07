import { ActionError } from "@/lib/actionError";
import { handle, readBody } from "@/lib/apiRoute";
import { createBillInputSchema } from "@/lib/billInput";
import { createBill } from "@/lib/bills";
import { withinHourlyLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  return handle(async () => {
    const input = await readBody(request, createBillInputSchema);
    const limit = Number(process.env.BILL_CREATE_HOURLY_LIMIT ?? 30);
    if (!(await withinHourlyLimit(request, "createBill", limit))) {
      throw new ActionError("rateLimited");
    }
    return Response.json(await createBill(input), { status: 201 });
  });
}
