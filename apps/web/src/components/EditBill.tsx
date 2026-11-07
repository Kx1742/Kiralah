"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { billToEqualDraft, billToItemisedDraft } from "@/lib/draft";
import type { SavedBill } from "@/lib/savedBill";
import { STORAGE_KEYS, useStored } from "@/lib/storage";
import { useIsClient } from "@/lib/useClient";
import { BillWizard } from "./BillWizard";
import { EqualWizard } from "./EqualWizard";
import { Card, Screen } from "./ui";

export function EditBill({ saved }: { saved: SavedBill }) {
  const t = useTranslations("live");
  const isClient = useIsClient();
  const token = useStored<string>(STORAGE_KEYS.editToken(saved.id));

  if (isClient && token) {
    return saved.bill.mode === "itemised" ? (
      <BillWizard
        edit={{ billId: saved.id, token, initial: billToItemisedDraft(saved) }}
      />
    ) : (
      <EqualWizard
        edit={{ billId: saved.id, token, initial: billToEqualDraft(saved) }}
      />
    );
  }

  return (
    <Screen>
      {isClient && (
        <Card>
          <p className="text-lg font-bold">
            {t("onlyPayerEdits", { payer: saved.payerName })}
          </p>
          <Link
            href={`/b/${saved.id}`}
            className="font-extrabold text-jade underline"
          >
            {t("backToBill")}
          </Link>
        </Card>
      )}
    </Screen>
  );
}
