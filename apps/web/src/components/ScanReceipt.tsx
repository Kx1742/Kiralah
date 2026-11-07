"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { compressReceiptImage } from "@/lib/image";
import type { ReceiptError, ScannedReceipt } from "@/lib/receipt/schema";
import { type ScanResult, receiptToDraft } from "@/lib/receipt/toDraft";
import { newLocalId } from "@/lib/storage";
import { Card } from "./ui";

type Status =
  | { state: "idle" }
  | { state: "reading" }
  | { state: "failed"; error: ReceiptError | "generic" };

const pickerClass =
  "flex min-h-14 w-full cursor-pointer items-center justify-center rounded-full px-6 text-center text-lg font-extrabold transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-jade active:translate-y-0.5";

/** Snap the receipt and Claude fills in the dishes. Typing them is always there below. */
export function ScanReceipt({
  onScanned,
}: {
  onScanned: (result: ScanResult) => void;
}) {
  const t = useTranslations("wizard.scan");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function scan(file: File | undefined) {
    if (!file) return;
    setStatus({ state: "reading" });
    try {
      const image = await compressReceiptImage(file);
      const response = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = (await response.json().catch(() => null)) as {
        receipt?: ScannedReceipt;
        error?: ReceiptError;
      } | null;
      if (!response.ok || !data?.receipt) {
        setStatus({ state: "failed", error: data?.error ?? "generic" });
        return;
      }
      setStatus({ state: "idle" });
      onScanned(receiptToDraft(data.receipt, newLocalId));
    } catch {
      setStatus({ state: "failed", error: "generic" });
    }
  }

  const reading = status.state === "reading";

  return (
    <Card>
      <h2 className="text-xl font-extrabold text-jade">{t("title")}</h2>
      <label
        className={`${pickerClass} bg-chilli text-white shadow-float ${reading ? "pointer-events-none opacity-70" : ""}`}
      >
        {t("snap")}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={reading}
          onChange={(event) => {
            void scan(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      <label
        className={`${pickerClass} bg-marble text-ink ring-2 ring-jade ${reading ? "pointer-events-none opacity-70" : ""}`}
      >
        {t("choose")}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={reading}
          data-testid="receipt-file"
          onChange={(event) => {
            void scan(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      <p
        role="status"
        aria-live="polite"
        className="text-center text-base font-bold text-ink-soft"
      >
        {reading ? t("reading") : status.state === "failed" ? "" : t("hint")}
      </p>
      {status.state === "failed" && (
        <p role="alert" className="text-center text-base font-bold text-chilli">
          {t(`errors.${status.error}`)}
        </p>
      )}
    </Card>
  );
}
