import type { Bill } from "@kiralah/core";

export const claimKey = (itemId: string, personId: string) =>
  `${itemId} ${personId}`;

/** Shows a tap at once, before the server confirms it. */
export function withClaimOverrides(
  bill: Bill,
  overrides: Readonly<Record<string, boolean>>,
): Bill {
  if (bill.mode !== "itemised" || Object.keys(overrides).length === 0)
    return bill;
  const order = bill.people.map((person) => person.id);
  return {
    ...bill,
    items: bill.items.map((item) => {
      const portions = item.portions.filter(
        ({ personId }) => overrides[claimKey(item.id, personId)] !== false,
      );
      for (const personId of order) {
        const added = overrides[claimKey(item.id, personId)] === true;
        if (
          added &&
          !portions.some((portion) => portion.personId === personId)
        ) {
          portions.push({ personId, portions: 1 });
        }
      }
      portions.sort(
        (a, b) => order.indexOf(a.personId) - order.indexOf(b.personId),
      );
      return { ...item, portions };
    }),
  };
}

export function hasClaims(bill: Bill, personId: string): boolean {
  return (
    bill.mode === "itemised" &&
    bill.items.some((item) =>
      item.portions.some((portion) => portion.personId === personId),
    )
  );
}
