"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { PaymentDraft } from "@/lib/draft";
import { compressQrImage } from "@/lib/image";
import { Card, Choice, Field, TextButton } from "./ui";

const COMMON_BANKS = [
  "Maybank",
  "CIMB",
  "Public Bank",
  "RHB",
  "Hong Leong Bank",
  "AmBank",
  "Bank Islam",
  "BSN",
  "GXBank",
];

type Method = "qr" | "bank" | "phone";

export function PaymentForm({
  payment,
  onChange,
}: {
  payment: PaymentDraft;
  onChange: (payment: PaymentDraft) => void;
}) {
  const t = useTranslations("wizard.pay");
  const [method, setMethod] = useState<Method>(() => {
    if (payment.qrDataUrl || payment.savedQrUrl) return "qr";
    if (payment.accountNumber) return "bank";
    if (payment.phone) return "phone";
    return "qr";
  });
  const [qrError, setQrError] = useState(false);

  async function pickQr(file: File | undefined) {
    if (!file) return;
    try {
      setQrError(false);
      onChange({ ...payment, qrDataUrl: await compressQrImage(file) });
    } catch {
      setQrError(true);
    }
  }

  return (
    <Card>
      <Choice
        label={t("method")}
        value={method}
        onChange={setMethod}
        options={[
          { value: "qr", label: t("qr") },
          { value: "bank", label: t("bank") },
          { value: "phone", label: t("phone") },
        ]}
      />

      {method === "qr" && (
        <div className="flex flex-col items-center gap-2">
          {payment.qrDataUrl || payment.savedQrUrl ? (
            <>
              {/* A local preview of the phone's own photo: next/image cannot optimise a data URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payment.qrDataUrl || payment.savedQrUrl}
                alt={t("qrPreview")}
                className="size-48 rounded-xl bg-white object-contain"
              />
              <TextButton
                onClick={() =>
                  onChange({ ...payment, qrDataUrl: "", savedQrUrl: undefined })
                }
              >
                {t("removeQr")}
              </TextButton>
            </>
          ) : (
            <label className="flex min-h-14 w-full cursor-pointer items-center justify-center rounded-full bg-marble px-5 text-center text-base font-extrabold text-ink ring-2 ring-jade focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-jade">
              {t("uploadQr")}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void pickQr(event.target.files?.[0])}
              />
            </label>
          )}
          {qrError && (
            <p role="alert" className="text-sm font-bold text-chilli">
              {t("qrError")}
            </p>
          )}
        </div>
      )}

      {method === "bank" && (
        <>
          <Field
            label={t("bankName")}
            list="common-banks"
            value={payment.bankName}
            onChange={(event) =>
              onChange({ ...payment, bankName: event.target.value })
            }
          />
          <datalist id="common-banks">
            {COMMON_BANKS.map((bank) => (
              <option key={bank} value={bank} />
            ))}
          </datalist>
          <Field
            label={t("accountNumber")}
            inputMode="numeric"
            value={payment.accountNumber}
            onChange={(event) =>
              onChange({ ...payment, accountNumber: event.target.value })
            }
          />
        </>
      )}

      {method === "phone" && (
        <Field
          label={t("phoneNumber")}
          hint={t("phoneHint")}
          type="tel"
          placeholder="012-345 6789"
          value={payment.phone}
          onChange={(event) =>
            onChange({ ...payment, phone: event.target.value })
          }
        />
      )}
    </Card>
  );
}
