import {
  type Bill,
  billSchema,
  calculateBill,
  chargesSchema,
  discountSchema,
} from "@splitlah/core";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { type CreateBillInput, decodeQrImage } from "./billInput";
import { getDb } from "./db";
import { hashEditToken, isBillId, newBillId, newEditToken } from "./tokens";

const BILL_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

const adjustmentsSchema = z.array(
  z.object({ id: z.string(), label: z.string(), amountSen: z.number().int() }),
);

export class InvalidQrImage extends Error {}

export async function createBill(input: CreateBillInput) {
  const { bill, payment, locale, restaurantName } = input;
  const qr = payment.qrDataUrl ? decodeQrImage(payment.qrDataUrl) : null;
  if (payment.qrDataUrl && !qr) throw new InvalidQrImage();

  const id = newBillId();
  const editToken = newEditToken();
  const now = Date.now();

  await getDb().bill.create({
    data: {
      id,
      editTokenHash: hashEditToken(editToken),
      locale,
      restaurantName: restaurantName ?? null,
      mode: bill.mode,
      payerId: bill.payerId,
      cashRounding: bill.cashRounding,
      paymentBankName: payment.bankName ?? null,
      paymentAccount: payment.accountNumber ?? null,
      paymentPhone: payment.phone ?? null,
      paymentQr: qr?.bytes ?? null,
      paymentQrType: qr?.type ?? null,
      expiresAt: new Date(now + BILL_LIFETIME_MS),
      people: {
        create: bill.people.map((person, position) => ({
          ...person,
          position,
        })),
      },
      ...(bill.mode === "equal"
        ? { equalTotalSen: bill.totalSen }
        : {
            charges: bill.charges as Prisma.InputJsonValue,
            discounts: bill.discounts as Prisma.InputJsonValue,
            adjustments: bill.adjustments as Prisma.InputJsonValue,
            receiptTotalSen: bill.receiptTotalSen ?? null,
            items: {
              create: bill.items.map(
                ({ id: itemId, name, quantity, unitPriceSen }, position) => ({
                  id: itemId,
                  name,
                  quantity,
                  unitPriceSen,
                  position,
                }),
              ),
            },
          }),
    },
  });

  return { id, editToken };
}

export type SavedBill = {
  id: string;
  locale: string;
  restaurantName: string | null;
  bill: Bill;
  payerName: string;
  payment: {
    bankName: string | null;
    accountNumber: string | null;
    phone: string | null;
    hasQr: boolean;
  };
};

/** Everything read back is validated again: stored data is not trusted either. */
export async function getBill(id: string): Promise<SavedBill | null> {
  if (!isBillId(id)) return null;

  const record = await getDb().bill.findFirst({
    where: { id, expiresAt: { gt: new Date() } },
    omit: { paymentQr: true },
    include: {
      people: { orderBy: { position: "asc" } },
      items: { orderBy: { position: "asc" } },
    },
  });
  if (!record) return null;

  const common = {
    payerId: record.payerId,
    cashRounding: record.cashRounding,
    people: record.people.map((person) => ({
      id: person.id,
      name: person.name,
    })),
  };
  const bill = billSchema.parse(
    record.mode === "equal"
      ? { ...common, mode: "equal", totalSen: record.equalTotalSen }
      : {
          ...common,
          mode: "itemised",
          items: record.items.map(
            ({ id: itemId, name, quantity, unitPriceSen }) => ({
              id: itemId,
              name,
              quantity,
              unitPriceSen,
              portions: [],
            }),
          ),
          discounts: z.array(discountSchema).parse(record.discounts),
          charges: chargesSchema.parse(record.charges),
          adjustments: adjustmentsSchema.parse(record.adjustments),
          ...(record.receiptTotalSen !== null
            ? { receiptTotalSen: record.receiptTotalSen }
            : {}),
        },
  );

  return {
    id: record.id,
    locale: record.locale,
    restaurantName: record.restaurantName,
    bill,
    payerName: bill.people.find((person) => person.id === bill.payerId)!.name,
    payment: {
      bankName: record.paymentBankName,
      accountNumber: record.paymentAccount,
      phone: record.paymentPhone,
      hasQr: record.paymentQrType !== null,
    },
  };
}

export async function getBillQr(id: string) {
  if (!isBillId(id)) return null;
  const record = await getDb().bill.findFirst({
    where: { id, expiresAt: { gt: new Date() } },
    select: { paymentQr: true, paymentQrType: true },
  });
  return record?.paymentQr && record.paymentQrType
    ? { bytes: record.paymentQr, type: record.paymentQrType }
    : null;
}

export const billTotalSen = (saved: SavedBill) =>
  calculateBill(saved.bill).totalSen;
