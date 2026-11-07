import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { KopitiamWall, TableDemo } from "@/components/KopitiamScene";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: "en" | "ms" | "zh-CN" }>;
};

export default function HomePage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations();

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden">
      <KopitiamWall>
        <div className="pointer-events-none relative z-20 flex justify-end px-3 pt-2 *:pointer-events-auto">
          <LanguageSwitcher />
        </div>

        <div className="pointer-events-none relative z-10 flex flex-1 flex-col items-center justify-center px-10 py-1 text-center">
          <h1 className="origin-top animate-settle rounded-2xl border-4 border-kaya bg-jade-deep px-5 pt-1 pb-2 font-brush text-[3.75rem] leading-none tracking-wide text-cream shadow-float outline-2 -outline-offset-8 outline-kaya/35 sm:text-8xl">
            {t("brand")}
          </h1>
          <p className="mt-2 max-w-md text-lg leading-snug font-extrabold text-balance text-cream sm:text-2xl">
            {t("home.tagline")}
          </p>
        </div>

        <TableDemo />
      </KopitiamWall>

      <div aria-hidden className="tile-floor h-8 shrink-0" />

      <section className="px-4 pt-4 pb-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <Link
            href="/new"
            className="flex min-h-14 w-full items-center justify-center rounded-full bg-chilli px-7 text-xl font-extrabold text-white shadow-float transition hover:brightness-110 active:translate-y-1 active:shadow-none"
          >
            {t("home.splitBill")}
          </Link>
          <Link
            href="/new/equal"
            className="flex min-h-14 w-full items-center justify-center rounded-full bg-marble px-7 text-xl font-extrabold text-ink shadow-float ring-2 ring-jade transition hover:brightness-95 active:translate-y-1 active:shadow-none"
          >
            {t("home.splitEqually")}
          </Link>
          <p className="text-center text-sm font-bold text-ink-soft">
            {t("home.promise")}
          </p>
        </div>
      </section>
    </main>
  );
}
