import { bearerToken, handle, readBody } from "@/lib/apiRoute";
import { setClaim } from "@/lib/billActions";
import { claimInputSchema } from "@/lib/billInput";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { id } = await params;
    const input = await readBody(request, claimInputSchema);
    await setClaim(id, bearerToken(request), input);
    return new Response(null, { status: 204 });
  });
}
