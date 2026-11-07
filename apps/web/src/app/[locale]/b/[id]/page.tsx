import { calculateBill, formatRinggit } from "@splitlah/core";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { SharePanel } from "@/components/SharePanel";
import { Card, Screen } from "@/components/ui";
import { type Locale, routing } from "@/i18n/routing";
import { getBill } from "@/lib/bills";

type Props = { params: Promise<{ locale: Locale; id: string }> };

const loadBill = cache(getBill);

async function siteUrl(): Promise<URL> {
  const list = await headers();
  const host =
    list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const protocol =
    list.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return new URL(`${protocol}://${host}`);
}

/** Written in the payer's language: WhatsApp's preview bot has no language of its own. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const saved = await loadBill(id);
  if (!saved) return { robots: { index: false } };

  const locale =
    routing.locales.find((option) => option === saved.locale) ??
    routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "bill" });
  const place = saved.restaurantName;
  const total = formatRinggit(calculateBill(saved.bill).totalSen);
  const title = `${place ? t("makanAt", { place }) : t("makanBill")} — ${total}`;
  const description = t("linkPreviewBody", { payer: saved.payerName });

  return {
    metadataBase: await siteUrl(),
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "SplitLah",
      images: [{ url: `/api/og/${id}`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BillPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const saved = await loadBill(id);
  if (!saved) notFound();

  const t = await getTranslations("bill");
  const tBreakdown = await getTranslations("breakdown");
  const result = calculateBill(saved.bill);
  const total = formatRinggit(result.totalSen);
  const place = saved.restaurantName;
  const { bill, payment, payerName } = saved;

  const message = t("whatsAppMessage", {
    title: place ? t("makanAt", { place }) : t("makanBill"),
    total,
    payer: payerName,
    url: "{url}",
  });

  const lines = [
    { label: tBreakdown("discount"), sen: -result.discountSen },
    { label: tBreakdown("serviceCharge"), sen: result.serviceChargeSen },
    { label: tBreakdown("serviceTax"), sen: result.serviceTaxSen },
    { label: tBreakdown("adjustment"), sen: result.adjustmentSen },
    { label: tBreakdown("cashRounding"), sen: result.cashRoundingSen },
  ].filter((line) => line.sen !== 0);

  const signed = (sen: number) =>
    `${sen < 0 ? "−" : ""}${formatRinggit(Math.abs(sen))}`;
  const hasPayment = payment.hasQr || payment.accountNumber || payment.phone;

  return (
    <Screen>
      <div>
        <h1 className="text-3xl leading-tight font-extrabold text-jade">
          {place ? t("makanAt", { place }) : t("makanBill")}
        </h1>
        <p className="font-brush text-5xl text-chilli" data-testid="bill-total">
          {total}
        </p>
        <p className="text-base font-bold text-ink-soft">
          {t("paidBy", { payer: payerName })}
        </p>
      </div>

      <SharePanel billId={id} message={message} />

      <Card>
        {bill.mode === "itemised" ? (
          <>
            <h2 className="text-lg font-extrabold text-ink">{t("items")}</h2>
            <ul className="flex flex-col gap-1">
              {bill.items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-3 text-base"
                >
                  <span className="min-w-0 break-words">
                    {item.quantity > 1
                      ? `${item.quantity} × ${item.name}`
                      : item.name}
                  </span>
                  <span className="shrink-0 font-bold">
                    {formatRinggit(item.quantity * item.unitPriceSen)}
                  </span>
                </li>
              ))}
            </ul>
            {lines.length > 0 && (
              <ul className="flex flex-col gap-1 border-t-2 border-dashed border-ink-soft/30 pt-2">
                {lines.map((line) => (
                  <li
                    key={line.label}
                    className="flex justify-between gap-3 text-base text-ink-soft"
                  >
                    <span>{line.label}</span>
                    <span className="shrink-0 font-bold">
                      {signed(line.sen)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-lg font-bold">
            {t("equalSummary", {
              count: bill.people.length,
              amount: formatRinggit(
                result.shares[bill.people.length - 1]!.amountSen,
              ),
            })}
          </p>
        )}
      </Card>

      {hasPayment && (
        <Card>
          <h2 className="text-lg font-extrabold text-ink">
            {t("payTo", { payer: payerName })}
          </h2>
          {payment.hasQr && (
            /* Served from our own API route, already compressed on the payer's phone. */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`/api/bills/${id}/qr`}
              alt={t("qrAlt", { payer: payerName })}
              className="mx-auto size-56 rounded-xl bg-white object-contain"
            />
          )}
          {payment.accountNumber && (
            <p className="text-base">
              {payment.bankName ? `${payment.bankName}: ` : ""}
              <strong>{payment.accountNumber}</strong>
            </p>
          )}
          {payment.phone && (
            <p className="text-base">
              {t("phone")} <strong>{payment.phone}</strong>
            </p>
          )}
        </Card>
      )}
    </Screen>
  );
}
