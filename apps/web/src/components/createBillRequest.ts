import type { Bill } from "@splitlah/core";
import type { PaymentDraft } from "@/lib/draft";
import { STORAGE_KEYS, writeStored } from "@/lib/storage";

export type CreateError = "generic" | "rateLimited" | "invalidQr";

type Body = {
  locale: string;
  restaurantName: string;
  bill: Bill;
  payment: PaymentDraft;
};

function paymentFields({
  qrDataUrl,
  savedQrUrl: _saved,
  ...payment
}: PaymentDraft) {
  return { ...payment, ...(qrDataUrl ? { qrDataUrl } : {}) };
}

async function errorOf(response: Response): Promise<CreateError> {
  if (response.status === 429) return "rateLimited";
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return data?.error === "invalidQr" ? "invalidQr" : "generic";
}

/** Saves the bill and keeps its edit token on this device. */
export async function requestCreateBill(
  body: Body,
): Promise<{ id: string } | { error: CreateError }> {
  try {
    const response = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, payment: paymentFields(body.payment) }),
    });
    if (!response.ok) return { error: await errorOf(response) };
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

export type EditTarget<Draft> = {
  billId: string;
  token: string;
  initial: Draft;
};

/** Saves the payer's changes. Friends keep their picks for dishes that remain. */
export async function requestUpdateBill(
  target: { billId: string; token: string },
  body: Body,
): Promise<{ id: string } | { error: CreateError }> {
  try {
    const response = await fetch(`/api/bills/${target.billId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${target.token}`,
      },
      body: JSON.stringify({
        ...body,
        payment: paymentFields(body.payment),
        keepQr: Boolean(body.payment.savedQrUrl) && !body.payment.qrDataUrl,
      }),
    });
    if (!response.ok) return { error: await errorOf(response) };
    return { id: target.billId };
  } catch {
    return { error: "generic" };
  }
}
