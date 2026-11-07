import { calculateBill, formatRinggit } from "@kiralah/core";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { BillLive } from "@/components/BillLive";
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
      siteName: "KiraLah",
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
  return <BillLive initial={saved} />;
}
