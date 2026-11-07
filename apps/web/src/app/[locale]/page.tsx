import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import {
  Awning,
  Chair,
  Lamp,
  Plant,
  Shutter,
  TableScene,
} from "@/components/illustrations";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Props = {
  params: Promise<{ locale: "en" | "ms" | "zh-CN" }>;
};

export default function HomePage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations();

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden">
      <section className="kopitiam-wall relative flex flex-1 flex-col">
        <Awning className="relative z-10 h-9 w-full drop-shadow-md" />
        <Lamp className="absolute top-6 left-8 w-10 sm:left-[24%] sm:w-14" />
        <Shutter className="absolute top-24 -left-1 w-9 sm:left-[8%] sm:w-28" />
        <Shutter className="absolute top-24 -right-1 w-9 -scale-x-100 sm:right-[8%] sm:w-28" />

        <div className="relative z-20 flex justify-end px-3 pt-2">
          <LanguageSwitcher />
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-10 py-2 text-center">
          <h1 className="rounded-2xl border-4 border-kaya bg-jade-deep px-5 pt-1 pb-2 font-brush text-[3.75rem] leading-none tracking-wide text-cream shadow-float sm:text-8xl">
            {t("brand")}
          </h1>
          <p className="mt-3 max-w-md text-lg leading-snug font-extrabold text-balance text-cream sm:text-2xl">
            {t("home.tagline")}
          </p>
        </div>

        <div className="relative z-10 -mb-5 flex items-end justify-center">
          <Chair className="absolute bottom-3 left-0 w-11 sm:left-[18%] sm:w-20" />
          <TableScene className="w-60 sm:w-96" />
          <Plant className="absolute right-0 bottom-3 w-12 sm:right-[18%] sm:w-24" />
        </div>
      </section>

      <div aria-hidden className="tile-floor h-9 shrink-0" />

      <section className="px-4 pt-5 pb-5">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <button
            type="button"
            disabled
            className="flex min-h-15 w-full items-center justify-between gap-3 rounded-full bg-chilli px-7 text-left text-xl font-extrabold text-white shadow-float"
          >
            {t("home.splitBill")}
            <span className="shrink-0 text-xs font-bold">
              {t("home.comingSoon")}
            </span>
          </button>
          <button
            type="button"
            disabled
            className="flex min-h-15 w-full items-center justify-between gap-3 rounded-full bg-marble px-7 text-left text-xl font-extrabold text-ink shadow-float ring-2 ring-jade"
          >
            {t("home.splitEqually")}
            <span className="shrink-0 text-xs font-bold text-ink-soft">
              {t("home.comingSoon")}
            </span>
          </button>
          <p className="pt-1 text-center text-sm font-bold text-ink-soft">
            {t("home.promise")}
          </p>
        </div>
      </section>
    </main>
  );
}
