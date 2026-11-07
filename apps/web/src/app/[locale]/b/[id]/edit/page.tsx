import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { EditBill } from "@/components/EditBill";
import type { Locale } from "@/i18n/routing";
import { getBill } from "@/lib/bills";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function EditBillPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const saved = await getBill(id);
  if (!saved) notFound();
  return <EditBill saved={saved} />;
}
