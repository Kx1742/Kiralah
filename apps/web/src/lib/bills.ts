import {
  billSchema,
  calculateBill,
  chargesSchema,
  discountSchema,
} from "@splitlah/core";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ActionError } from "./actionError";
import {
  type CreateBillInput,
  decodeQrImage,
  type EditBillInput,
} from "./billInput";
import { getDb } from "./db";
import type { SavedBill } from "./savedBill";
import { recordBill } from "./stats";
import { hashEditToken, isBillId, newBillId, newEditToken } from "./tokens";

export type { SavedBill } from "./savedBill";

const BILL_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

const adjustmentsSchema = z.array(
  z.object({ id: z.string(), label: z.string(), amountSen: z.number().int() }),
);

function decodeQr(qrDataUrl: string | undefined) {
  if (!qrDataUrl) return null;
  const qr = decodeQrImage(qrDataUrl);
  if (!qr) throw new ActionError("invalidQr");
  return qr;
}

function paymentColumns(payment: CreateBillInput["payment"]) {
  return {
    paymentBankName: payment.bankName ?? null,
    paymentAccount: payment.accountNumber ?? null,
    paymentPhone: payment.phone ?? null,
  };
}

function itemisedColumns(
  bill: Extract<CreateBillInput["bill"], { mode: "itemised" }>,
) {
  return {
    charges: bill.charges as Prisma.InputJsonValue,
    discounts: bill.discounts as Prisma.InputJsonValue,
    adjustments: bill.adjustments as Prisma.InputJsonValue,
    receiptTotalSen: bill.receiptTotalSen ?? null,
  };
}

export async function createBill(input: CreateBillInput) {
  const { bill, payment, locale, restaurantName } = input;
  const qr = decodeQr(payment.qrDataUrl);

  const id = newBillId();
  const editToken = newEditToken();

  // The bill and the day's totals are saved together, so the counts never drift.
  await getDb().$transaction(async (tx) => {
    await tx.bill.create({
      data: {
        id,
        editTokenHash: hashEditToken(editToken),
        locale,
        restaurantName: restaurantName ?? null,
        mode: bill.mode,
        payerId: bill.payerId,
        cashRounding: bill.cashRounding,
        ...paymentColumns(payment),
        paymentQr: qr?.bytes ?? null,
        paymentQrType: qr?.type ?? null,
        expiresAt: new Date(Date.now() + BILL_LIFETIME_MS),
        people: {
          create: bill.people.map((person, position) => ({
            ...person,
            position,
            placeholder: bill.mode === "equal" && person.id !== bill.payerId,
          })),
        },
        ...(bill.mode === "equal"
          ? { equalTotalSen: bill.totalSen }
          : {
              ...itemisedColumns(bill),
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
    await recordBill(tx, {
      people: bill.people.length,
      totalSen: calculateBill(bill).totalSen,
    });
  });

  return { id, editToken };
}

/** Replaces the payer's details of the bill. Friends keep their picks for dishes that remain. */
export async function updateBill(id: string, input: EditBillInput) {
  const { bill, payment, restaurantName, keepQr } = input;
  const qr = decodeQr(payment.qrDataUrl);

  await getDb().$transaction(async (tx) => {
    const existing = await tx.bill.findFirst({
      where: { id, expiresAt: { gt: new Date() } },
      select: { mode: true, payerId: true },
    });
    if (!existing) throw new ActionError("notFound");
    if (existing.mode !== bill.mode || existing.payerId !== bill.payerId) {
      throw new ActionError("invalid");
    }

    await tx.bill.update({
      where: { id },
      data: {
        version: { increment: 1 },
        restaurantName: restaurantName ?? null,
        cashRounding: bill.cashRounding,
        ...paymentColumns(payment),
        ...(qr
          ? { paymentQr: qr.bytes, paymentQrType: qr.type }
          : keepQr
            ? {}
            : { paymentQr: null, paymentQrType: null }),
        ...(bill.mode === "equal"
          ? { equalTotalSen: bill.totalSen }
          : itemisedColumns(bill)),
      },
    });

    const payer = bill.people.find((person) => person.id === bill.payerId)!;
    await tx.person.update({
      where: { billId_id: { billId: id, id: payer.id } },
      data: { name: payer.name },
    });
    if (bill.mode === "equal") return;

    const friends = bill.people.filter((person) => person.id !== bill.payerId);
    await tx.person.deleteMany({
      where: {
        billId: id,
        id: { notIn: [bill.payerId, ...friends.map((friend) => friend.id)] },
        placeholder: false,
        // Someone who added themselves stays, even if the payer's list doesn't have them.
        tokenHash: null,
      },
    });
    const positions = await tx.person.aggregate({
      where: { billId: id },
      _max: { position: true },
    });
    let next = (positions._max.position ?? 0) + 1;
    for (const friend of friends) {
      await tx.person.upsert({
        where: { billId_id: { billId: id, id: friend.id } },
        create: {
          billId: id,
          id: friend.id,
          name: friend.name,
          position: next++,
        },
        update: { name: friend.name },
      });
    }

    await tx.item.deleteMany({
      where: { billId: id, id: { notIn: bill.items.map((item) => item.id) } },
    });
    for (const [position, item] of bill.items.entries()) {
      const fields = {
        name: item.name,
        quantity: item.quantity,
        unitPriceSen: item.unitPriceSen,
        position,
      };
      await tx.item.upsert({
        where: { billId_id: { billId: id, id: item.id } },
        create: { billId: id, id: item.id, ...fields },
        update: fields,
      });
    }
  });
}

/** Everything read back is validated again: stored data is not trusted either. */
export async function getBill(id: string): Promise<SavedBill | null> {
  if (!isBillId(id)) return null;

  const record = await getDb().bill.findFirst({
    where: { id, expiresAt: { gt: new Date() } },
    omit: { paymentQr: true, editTokenHash: true },
    include: {
      people: { orderBy: { position: "asc" } },
      items: { orderBy: { position: "asc" }, include: { claims: true } },
    },
  });
  if (!record) return null;

  const order = new Map(
    record.people.map((person, index) => [person.id, index]),
  );
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
            ({ id: itemId, name, quantity, unitPriceSen, claims }) => ({
              id: itemId,
              name,
              quantity,
              unitPriceSen,
              portions: [...claims]
                .sort((a, b) => order.get(a.personId)! - order.get(b.personId)!)
                .map(({ personId, portions }) => ({ personId, portions })),
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
    version: record.version,
    locale: record.locale,
    restaurantName: record.restaurantName,
    bill,
    payerName: bill.people.find((person) => person.id === bill.payerId)!.name,
    people: record.people.map((person) => ({
      id: person.id,
      name: person.name,
      joined: person.tokenHash !== null,
      paid: person.paidAt !== null,
      placeholder: person.placeholder,
    })),
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
