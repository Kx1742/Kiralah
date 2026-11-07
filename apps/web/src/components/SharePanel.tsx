"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { shareToWhatsApp } from "@/lib/share";
import { readStored, STORAGE_KEYS } from "@/lib/storage";
import { useIsClient } from "@/lib/useClient";
import { Card, PrimaryButton, SecondaryButton } from "./ui";

export function SharePanel({
  billId,
  message,
}: {
  billId: string;
  /** Contains {url}: the address is only known in the browser. */
  message: string;
}) {
  const t = useTranslations("bill");
  const isClient = useIsClient();
  const [copied, setCopied] = useState(false);

  if (!isClient) return null;
  const isPayer = readStored<string>(STORAGE_KEYS.editToken(billId)) !== null;
  if (!isPayer) {
    return (
      <Card>
        <p className="text-base font-bold text-ink-soft">
          {t("friendComingSoon")}
        </p>
      </Card>
    );
  }

  const url = `${window.location.origin}/b/${billId}`;

  return (
    <Card>
      <h2 className="text-xl font-extrabold text-jade">{t("ready")}</h2>
      <PrimaryButton
        onClick={() => void shareToWhatsApp(message.replace("{url}", url))}
      >
        {t("share")}
      </PrimaryButton>
      <SecondaryButton
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => setCopied(true));
        }}
      >
        {copied ? t("copied") : t("copyLink")}
      </SecondaryButton>
      <p
        className="text-center text-sm break-all text-ink-soft"
        data-testid="bill-link"
      >
        {url}
      </p>
    </Card>
  );
}
