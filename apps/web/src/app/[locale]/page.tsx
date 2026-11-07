import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import {
  Boat,
  Bottle,
  Fish,
  Jellyfish,
  Seaweed,
  Starfish,
  Waves,
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
    <main className="watercolour-sea relative flex min-h-dvh flex-col overflow-hidden">
      <div className="relative z-20 flex justify-end p-4">
        <LanguageSwitcher />
      </div>

      <section className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <div className="watercolour-bubble absolute top-1/2 left-1/2 aspect-square w-[min(118vw,36rem)] -translate-x-1/2 -translate-y-[56%] rounded-full" />
        <Jellyfish className="absolute top-0 left-2 w-11 animate-drift sm:left-[12%] sm:w-24" />
        <Starfish className="absolute right-8 bottom-16 w-7 opacity-70 sm:right-[20%]" />
        <Fish className="absolute top-8 right-3 w-14 animate-drift [animation-delay:-3s] sm:right-[14%] sm:w-20" />
        <Fish className="absolute top-0 right-24 w-8 sm:top-20 sm:right-[22%] sm:w-9" />

        <div className="relative z-10 max-w-md text-center text-white">
          <h1 className="font-brush text-[5.25rem] leading-none tracking-wide sm:text-[7.5rem]">
            {t("brand")}
          </h1>
          <p className="mt-3 text-xl leading-snug font-extrabold text-balance sm:text-2xl">
            {t("home.tagline")}
          </p>
        </div>
      </section>

      <Seaweed className="absolute bottom-40 -left-3 z-0 w-20 sm:w-28" />
      <Bottle className="absolute right-1 bottom-48 z-0 w-12 rotate-12 sm:right-[8%] sm:w-16" />

      <div className="relative z-10 -mb-px">
        <Boat className="absolute -top-10 left-1/2 w-36 -translate-x-1/2 animate-bob sm:-top-11 sm:w-48" />
        <Waves className="relative block h-16 w-full sm:h-24" />
      </div>

      <section className="relative z-10 bg-foam px-4 pt-2 pb-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <button
            type="button"
            disabled
            className="flex min-h-16 w-full items-center justify-between gap-3 rounded-full bg-coral px-7 text-left text-xl font-extrabold text-white shadow-float"
          >
            {t("home.splitBill")}
            <span className="shrink-0 text-xs font-bold">
              {t("home.comingSoon")}
            </span>
          </button>
          <button
            type="button"
            disabled
            className="flex min-h-16 w-full items-center justify-between gap-3 rounded-full bg-white px-7 text-left text-xl font-extrabold text-ink shadow-float ring-2 ring-sky"
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
