import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  type ReceiptError,
  type ScannedReceipt,
  scannedReceiptSchema,
} from "./schema";

/** The model the project plan chose: fast and cheap enough for one photo per bill. */
export const RECEIPT_MODEL = "claude-haiku-5-5";

const INSTRUCTIONS = `You read photos of restaurant receipts from Malaysia. They may be in English, Malay or Chinese, or a mix.

Copy what is printed. Never guess or calculate an amount that is not printed.

- items: every ordered line with a price. Keep the name as printed, in its own language. Leave out voided or cancelled lines, and lines with no amount.
- quantity: the printed quantity, or 1 if none is printed.
- lineTotal: the amount printed on that line, which is quantity times unit price.
- serviceCharge: the service charge line, for example "Service Charge 10%", "Caj Perkhidmatan" or "服务费".
- serviceTax: the tax line, for example "SST", "Service Tax", "Cukai Perkhidmatan", "服务税" or "GST".
- pricesIncludeTax: true only if the receipt says prices include tax or service, for example "inclusive" or "termasuk".
- discounts: each discount, voucher or promotion line, with the amount as a positive number.
- rounding: the rounding adjustment line, for example "Rounding Adj" or "Pelarasan Bundar", with its sign.
- total: the final amount payable, for example "Total", "Jumlah", "Grand Total" or "总计". Not cash tendered or change.
- Amounts: digits and one decimal point only, for example "12.40". No currency, no commas.

If the photo is not a receipt or cannot be read, set isReceipt to false and leave the lists empty.`;

export type ReadOutcome =
  { ok: true; receipt: ScannedReceipt } | { ok: false; error: ReceiptError };

type ReceiptClient = Pick<Anthropic, "messages">;

let defaultClient: Anthropic | undefined;
const getClient = () =>
  (defaultClient ??= new Anthropic({ timeout: 45_000, maxRetries: 1 }));

/** Reads one receipt photo. The image is used for this request only and never stored. */
export async function readReceipt(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  client: ReceiptClient = getClient(),
): Promise<ReadOutcome> {
  try {
    const response = await client.messages.parse({
      model: RECEIPT_MODEL,
      max_tokens: 8000,
      system: INSTRUCTIONS,
      // Copying text from a photo needs little reasoning; low effort keeps the payer waiting less.
      output_config: {
        effort: "low",
        format: zodOutputFormat(scannedReceiptSchema),
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            { type: "text", text: "Read this receipt." },
          ],
        },
      ],
    });

    if (
      response.stop_reason === "refusal" ||
      response.stop_reason === "max_tokens"
    ) {
      return { ok: false, error: "unreadable" };
    }
    const parsed = scannedReceiptSchema.safeParse(response.parsed_output);
    if (!parsed.success) return { ok: false, error: "unreadable" };
    if (!parsed.data.isReceipt || parsed.data.items.length === 0) {
      return { ok: false, error: "notReceipt" };
    }
    return { ok: true, receipt: parsed.data };
  } catch (error) {
    if (
      error instanceof Anthropic.AuthenticationError ||
      error instanceof Anthropic.PermissionDeniedError
    ) {
      return { ok: false, error: "unavailable" };
    }
    if (error instanceof Anthropic.BadRequestError)
      return { ok: false, error: "unreadable" };
    // Rate limits, overload, timeouts and network errors: worth trying again later.
    return { ok: false, error: "busy" };
  }
}
