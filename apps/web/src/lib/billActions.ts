import { randomBytes } from "node:crypto";
import { ActionError } from "./actionError";
import { getDb } from "./db";
import { hashEditToken, isBillId, newEditToken } from "./tokens";

export type Actor = { personId: string; isPayer: boolean };

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["$transaction"]>[0]
>[0];

async function liveBill(tx: Transaction, billId: string) {
  if (!isBillId(billId)) throw new ActionError("notFound");
  const bill = await tx.bill.findFirst({
    where: { id: billId, expiresAt: { gt: new Date() } },
    select: {
      mode: true,
      payerId: true,
      editTokenHash: true,
      people: {
        select: {
          id: true,
          tokenHash: true,
          placeholder: true,
          position: true,
        },
      },
    },
  });
  if (!bill) throw new ActionError("notFound");
  return bill;
}

/**
 * The payer's edit token acts as the payer; a friend's token acts as that one person.
 * Tokens are compared by their SHA-256 hashes, so the database never holds them.
 */
function actorFrom(
  bill: Awaited<ReturnType<typeof liveBill>>,
  token: string | null,
): Actor {
  if (!token) throw new ActionError("unauthorized");
  const hash = hashEditToken(token);
  if (hash === bill.editTokenHash)
    return { personId: bill.payerId, isPayer: true };
  const person = bill.people.find((candidate) => candidate.tokenHash === hash);
  if (!person) throw new ActionError("unauthorized");
  return { personId: person.id, isPayer: false };
}

const bumpVersion = (tx: Transaction, billId: string) =>
  tx.bill.update({
    where: { id: billId },
    data: { version: { increment: 1 } },
  });

export async function requirePayer(
  billId: string,
  token: string | null,
): Promise<void> {
  const bill = await liveBill(getDb(), billId);
  if (!actorFrom(bill, token).isPayer) throw new ActionError("forbidden");
}

/** "Who are you?": tap a name nobody has picked yet, or add your own. */
export async function joinBill(
  billId: string,
  input: { personId?: string; name?: string },
): Promise<{ personId: string; token: string }> {
  const token = newEditToken();
  const tokenHash = hashEditToken(token);

  return getDb().$transaction(async (tx) => {
    const bill = await liveBill(tx, billId);
    let personId: string;

    if (input.personId !== undefined) {
      personId = input.personId;
      if (personId === bill.payerId) throw new ActionError("forbidden");
      if (!bill.people.some((person) => person.id === personId)) {
        throw new ActionError("notFound");
      }
    } else if (bill.mode === "equal") {
      // An equal split has a fixed number of people: take the next empty "Friend 2" slot.
      const slot = bill.people
        .filter((person) => person.placeholder && person.tokenHash === null)
        .sort((a, b) => a.position - b.position)[0];
      if (!slot) throw new ActionError("full");
      personId = slot.id;
    } else {
      personId = `p${randomBytes(6).toString("base64url")}`;
      const last = Math.max(...bill.people.map((person) => person.position));
      await tx.person.create({
        data: { billId, id: personId, name: input.name!, position: last + 1 },
      });
    }

    // Only succeeds if nobody else picked this name first, even at the same instant.
    const { count } = await tx.person.updateMany({
      where: { billId, id: personId, tokenHash: null },
      data: {
        tokenHash,
        ...(input.name !== undefined
          ? { name: input.name, placeholder: false }
          : {}),
      },
    });
    if (count === 0) throw new ActionError("taken");

    await bumpVersion(tx, billId);
    return { personId, token };
  });
}

/** Anyone at the table may say who had a dish, including who shared it. */
export async function setClaim(
  billId: string,
  token: string | null,
  input: { itemId: string; personId: string; had: boolean },
): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const bill = await liveBill(tx, billId);
    actorFrom(bill, token);
    if (bill.mode !== "itemised") throw new ActionError("invalid");
    if (!bill.people.some((person) => person.id === input.personId)) {
      throw new ActionError("notFound");
    }
    const item = await tx.item.findUnique({
      where: { billId_id: { billId, id: input.itemId } },
      select: { id: true },
    });
    if (!item) throw new ActionError("notFound");

    const key = { billId, itemId: input.itemId, personId: input.personId };
    if (input.had) {
      await tx.claim.upsert({
        where: { billId_itemId_personId: key },
        create: key,
        update: {},
      });
    } else {
      await tx.claim.deleteMany({ where: key });
    }
    await bumpVersion(tx, billId);
  });
}

/** Friends can only mark themselves; the payer can mark anyone. */
export async function setPaid(
  billId: string,
  token: string | null,
  input: { personId: string; paid: boolean },
): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const bill = await liveBill(tx, billId);
    const actor = actorFrom(bill, token);
    if (input.personId === bill.payerId) throw new ActionError("invalid");
    if (!actor.isPayer && actor.personId !== input.personId) {
      throw new ActionError("forbidden");
    }
    if (!bill.people.some((person) => person.id === input.personId)) {
      throw new ActionError("notFound");
    }
    await tx.person.update({
      where: { billId_id: { billId, id: input.personId } },
      data: { paidAt: input.paid ? new Date() : null },
    });
    await bumpVersion(tx, billId);
  });
}

/** For a friend who changed phones: lets their name be picked again. Payer only. */
export async function resetPerson(
  billId: string,
  token: string | null,
  personId: string,
): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const bill = await liveBill(tx, billId);
    if (!actorFrom(bill, token).isPayer) throw new ActionError("forbidden");
    if (personId === bill.payerId) throw new ActionError("invalid");
    const { count } = await tx.person.updateMany({
      where: { billId, id: personId },
      data: { tokenHash: null },
    });
    if (count === 0) throw new ActionError("notFound");
    await bumpVersion(tx, billId);
  });
}
