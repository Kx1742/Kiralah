import { formatRinggit } from "@splitlah/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, Screen } from "@/components/ui";
import type { Locale } from "@/i18n/routing";
import { getUsage, type UsageTotals } from "@/lib/stats";

// Read fresh on every visit, and never needed at build time.
export const dynamic = "force-dynamic";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("stats");
  const { allTime, last30Days } = await getUsage();

  const rows = (totals: UsageTotals) => [
    { label: t("bills"), value: totals.bills.toLocaleString(locale) },
    { label: t("people"), value: totals.people.toLocaleString(locale) },
    {
      label: t("averagePeople"),
      value:
        totals.bills === 0
          ? "–"
          : (totals.people / totals.bills).toLocaleString(locale, {
              maximumFractionDigits: 1,
            }),
    },
    { label: t("ringgitSplit"), value: formatRinggit(totals.senSplit) },
  ];

  return (
    <Screen>
      <h1 className="text-3xl leading-tight font-extrabold text-jade">
        {t("title")}
      </h1>
      {[
        { title: t("last30Days"), totals: last30Days },
        { title: t("allTime"), totals: allTime },
      ].map((section) => (
        <Card key={section.title}>
          <h2 className="text-lg font-extrabold text-ink">{section.title}</h2>
          <dl className="grid grid-cols-2 gap-3">
            {rows(section.totals).map((row) => (
              <div key={row.label} className="rounded-xl bg-cream p-3">
                <dt className="text-sm font-bold text-ink-soft">{row.label}</dt>
                <dd className="font-brush text-3xl text-jade">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
      <p className="text-sm text-ink-soft">{t("privacy")}</p>
    </Screen>
  );
}
