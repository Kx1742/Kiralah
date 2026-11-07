import { bearerToken, handle, readBody } from "@/lib/apiRoute";
import { setPaid } from "@/lib/billActions";
import { paidInputSchema } from "@/lib/billInput";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { id } = await params;
    const input = await readBody(request, paidInputSchema);
    await setPaid(id, bearerToken(request), input);
    return new Response(null, { status: 204 });
  });
}
