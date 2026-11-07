import { bearerToken, handle } from "@/lib/apiRoute";
import { resetPerson } from "@/lib/billActions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; personId: string }> },
) {
  return handle(async () => {
    const { id, personId } = await params;
    await resetPerson(id, bearerToken(request), personId);
    return new Response(null, { status: 204 });
  });
}
