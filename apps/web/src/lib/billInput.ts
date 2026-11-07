import { billSchema } from "@splitlah/core";
import { z } from "zod";
import { routing } from "@/i18n/routing";

export const MAX_QR_BYTES = 300 * 1024;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined)
    .optional();

export const createBillInputSchema = z
  .strictObject({
    locale: z.enum(routing.locales),
    restaurantName: optionalText(80),
    bill: billSchema,
    payment: z.strictObject({
      bankName: optionalText(60),
      accountNumber: z
        .string()
        .trim()
        .regex(/^[\d -]*$/)
        .max(34)
        .transform((value) => value || undefined)
        .optional(),
      phone: z
        .string()
        .trim()
        .regex(/^[\d +()-]*$/)
        .max(20)
        .transform((value) => value || undefined)
        .optional(),
      qrDataUrl: z.string().max(500_000).optional(),
    }),
  })
  .superRefine(({ bill }, ctx) => {
    if (bill.mode === "itemised") {
      if (bill.items.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "A bill needs at least one item",
        });
      }
      // Dishes are only ever claimed by the friends themselves, on the bill page.
      if (bill.items.some((item) => item.portions.length > 0)) {
        ctx.addIssue({
          code: "custom",
          message: "A new bill has no claimed items",
        });
      }
    } else {
      if (bill.people.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Equal split needs at least two people",
        });
      }
      if (bill.totalSen === 0) {
        ctx.addIssue({ code: "custom", message: "Equal split needs a total" });
      }
    }
  });

export type CreateBillInput = z.infer<typeof createBillInputSchema>;

const IMAGE_SIGNATURES: {
  type: string;
  matches: (bytes: Uint8Array) => boolean;
}[] = [
  {
    type: "image/jpeg",
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    type: "image/png",
    matches: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    type: "image/webp",
    matches: (b) =>
      String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
];

/** Trusts the file's own bytes, never the type it claims. */
export function decodeQrImage(
  dataUrl: string,
): { bytes: Uint8Array<ArrayBuffer>; type: string } | null {
  const match =
    /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      dataUrl,
    );
  if (!match) return null;
  const bytes = new Uint8Array(Buffer.from(match[1]!, "base64"));
  if (bytes.length === 0 || bytes.length > MAX_QR_BYTES) return null;
  const signature = IMAGE_SIGNATURES.find(({ matches }) => matches(bytes));
  return signature ? { bytes, type: signature.type } : null;
}
