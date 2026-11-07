import { ActionError } from "@/lib/actionError";
import { handle, readBody } from "@/lib/apiRoute";
import { joinBill } from "@/lib/billActions";
import { joinInputSchema } from "@/lib/billInput";
import { withinHourlyLimit } from "@/lib/rateLimit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { id } = await params;
    const input = await readBody(request, joinInputSchema);
    if (!(await withinHourlyLimit(request, "join", 60)))
      throw new ActionError("rateLimited");
    return Response.json(await joinBill(id, input), { status: 201 });
  });
}
