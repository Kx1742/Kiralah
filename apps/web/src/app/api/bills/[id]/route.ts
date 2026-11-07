import { ActionError } from "@/lib/actionError";
import { bearerToken, handle, readBody } from "@/lib/apiRoute";
import { requirePayer } from "@/lib/billActions";
import { editBillInputSchema } from "@/lib/billInput";
import { getBill, updateBill } from "@/lib/bills";

type Context = { params: Promise<{ id: string }> };

/** Polled every few seconds: answers 304 with no body when nothing changed. */
export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const saved = await getBill(id);
  if (!saved) return Response.json({ error: "notFound" }, { status: 404 });

  const etag = `W/"${saved.version}"`;
  const headers = { ETag: etag, "Cache-Control": "private, no-cache" };
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return Response.json(saved, { headers });
}

export async function PUT(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    await requirePayer(id, bearerToken(request));
    const input = await readBody(request, editBillInputSchema);
    if (!(await getBill(id))) throw new ActionError("notFound");
    await updateBill(id, input);
    return new Response(null, { status: 204 });
  });
}
