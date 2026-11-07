import { billSchema } from "@kiralah/core";
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

const billInputObject = z.strictObject({
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
});

function checkBill(
  { bill }: z.infer<typeof billInputObject>,
  ctx: z.RefinementCtx,
) {
  if (bill.mode === "itemised") {
    if (bill.items.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "A bill needs at least one item",
      });
    }
    // Who had what is only ever changed through the claims API.
    if (bill.items.some((item) => item.portions.length > 0)) {
      ctx.addIssue({ code: "custom", message: "Claims are not set here" });
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
}

export const createBillInputSchema = billInputObject.superRefine(checkBill);

export const editBillInputSchema = billInputObject
  .extend({
    /** Keep the QR already saved when no new image is sent. */
    keepQr: z.boolean(),
  })
  .superRefine(checkBill);

export type CreateBillInput = z.infer<typeof createBillInputSchema>;
export type EditBillInput = z.infer<typeof editBillInputSchema>;

const id = z.string().min(1).max(64);

export const joinInputSchema = z
  .strictObject({
    personId: id.optional(),
    name: z.string().trim().min(1).max(40).optional(),
  })
  .refine(
    (input) => (input.personId === undefined) !== (input.name === undefined),
    {
      message: "Send a person or a name, not both",
    },
  );

export const claimInputSchema = z.strictObject({
  itemId: id,
  personId: id,
  had: z.boolean(),
});

export const paidInputSchema = z.strictObject({
  personId: id,
  paid: z.boolean(),
});

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
export function decodeImage(
  dataUrl: string,
  maxBytes: number,
): { bytes: Uint8Array<ArrayBuffer>; type: string } | null {
  const match =
    /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      dataUrl,
    );
  if (!match) return null;
  const bytes = new Uint8Array(Buffer.from(match[1]!, "base64"));
  if (bytes.length === 0 || bytes.length > maxBytes) return null;
  const signature = IMAGE_SIGNATURES.find(({ matches }) => matches(bytes));
  return signature ? { bytes, type: signature.type } : null;
}

export const decodeQrImage = (dataUrl: string) =>
  decodeImage(dataUrl, MAX_QR_BYTES);
