import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { EqualWizard } from "@/components/EqualWizard";
import type { Locale } from "@/i18n/routing";

export default function NewEqualBillPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  setRequestLocale(use(params).locale);
  return <EqualWizard />;
}
