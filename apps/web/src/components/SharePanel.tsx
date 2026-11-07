"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { copyText } from "@/lib/copy";
import { shareToWhatsApp } from "@/lib/share";
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
  const [copied, setCopied] = useState(false);
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
          void copyText(url).then(setCopied);
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
