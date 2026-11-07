import { getBillQr } from "@/lib/bills";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const qr = await getBillQr(id);
  if (!qr) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(qr.bytes), {
    headers: {
      "Content-Type": qr.type,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
