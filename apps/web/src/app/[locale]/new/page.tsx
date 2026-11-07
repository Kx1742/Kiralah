import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { BillWizard } from "@/components/BillWizard";
import type { Locale } from "@/i18n/routing";

export default function NewBillPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  setRequestLocale(use(params).locale);
  return <BillWizard />;
}
