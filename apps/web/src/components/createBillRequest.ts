import type { Bill } from "@splitlah/core";
import type { PaymentDraft } from "@/lib/draft";
import { STORAGE_KEYS, writeStored } from "@/lib/storage";

export type CreateError = "generic" | "rateLimited" | "invalidQr";

/** Saves the bill and keeps its edit token on this device. */
export async function requestCreateBill(body: {
  locale: string;
  restaurantName: string;
  bill: Bill;
  payment: PaymentDraft;
}): Promise<{ id: string } | { error: CreateError }> {
  const { qrDataUrl, ...payment } = body.payment;
  try {
    const response = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        payment: { ...payment, ...(qrDataUrl ? { qrDataUrl } : {}) },
      }),
    });
    if (response.status === 429) return { error: "rateLimited" };
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      return { error: data?.error === "invalidQr" ? "invalidQr" : "generic" };
    }
    const { id, editToken } = (await response.json()) as {
      id: string;
      editToken: string;
    };
    writeStored(STORAGE_KEYS.editToken(id), editToken);
    return { id };
  } catch {
    return { error: "generic" };
  }
}
